import {
  clearHighlights,
  executeAction,
  getActiveTab,
  getInteractionSnapshot,
  openExtensionPageInTab,
  openUrlInTab,
  waitForTabSettled,
} from '@app/services/tab-bridge';
import type {
  ExecutableInteractionAction,
  InteractionActionPlan,
  InteractionCompletionVerification,
  InteractionExecutionResult,
  InteractiveElementSnapshotItem,
  InteractionRunStatus,
  InteractionSnapshotPayload,
  PageInteractionStepResult,
} from '@shared/types';
import { buildInteractionPrompt } from './prompt';
import { parseInteractionDecision, type ParsedInteractionDecision } from './parser';
import { captureStackedViewport } from './capture';
import { annotateInteractionCanvas } from './annotate-canvas';
import { enforceTypingFirst } from './guards';
import { estimateTokens, isInputTooLargeError, runTextImagePrompt } from './prompt-api';
import { verifyTaskCompletion } from './verifier';
import {
  formatExecutionLines,
  formatFinalLine,
  formatObserveLine,
  formatPlannerLine,
  formatPlannerRawLine,
  formatPlanLines,
  formatVerificationLine,
  formatVerificationRawLine,
} from './progress';
import {
  INTERACTION_CAPTURE_SETTLE_MS,
  INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS,
  INTERACTION_PROMPT_RETRY_SHRINK_FACTOR,
  INTERACTION_SNAPSHOT_MAX_ELEMENTS,
  INTERACTION_TAB_SETTLE_IDLE_MS,
  INTERACTION_TAB_SETTLE_MAX_WAIT_MS,
  INTERACTION_TAB_SETTLE_POLL_MS,
} from './constants';

const AGENT_MAX_STEPS = 12;
const AGENT_VIEWPORT_SEGMENTS = 1;
const AGENT_PLACEHOLDER_PAGE_PATH = 'src/placeholder.html';
const CONTENT_CONNECTION_ERROR_MESSAGES = [
  'Could not establish connection. Receiving end does not exist.',
  'The message port closed before a response was received.',
];

interface PromptDecisionResult {
  decision: ParsedInteractionDecision;
  rawResponse: string;
  prompt: string;
  promptElements: InteractiveElementSnapshotItem[];
  retryCount: number;
  measuredInputTokens: number | null;
  sessionInputUsageBefore: number | null;
  sessionInputUsageAfter: number | null;
  sessionInputQuota: number | null;
  sessionInputQuotaRemaining: number | null;
  screenshotDataUrl: string;
  imageWidth: number;
  imageHeight: number;
}

export interface InteractionProgressLineEvent {
  type: 'line';
  line: string;
}

export interface InteractionProgressScreenshotEvent {
  type: 'screenshot';
  stepNumber: number;
  imageDataUrl: string;
  width: number;
  height: number;
}

export type InteractionProgressEvent =
  | InteractionProgressLineEvent
  | InteractionProgressScreenshotEvent;

export interface InteractionRunOptions {
  onProgress?: (event: InteractionProgressEvent) => void;
}

type ExecutableInteractionPlan = InteractionActionPlan & {
  action: ExecutableInteractionAction;
  index: number;
};

function normalizeInstruction(instruction: string): string {
  const normalized = instruction.replace(/\s+/g, ' ').trim();
  if (!normalized) throw new Error('Enter an instruction first');
  return normalized;
}

function isExecutableAction(plan: InteractionActionPlan): plan is ExecutableInteractionPlan {
  return (plan.action === 'click' || plan.action === 'type') && plan.index !== null;
}

function fallbackExecution(plan: InteractionActionPlan, message: string): InteractionExecutionResult {
  return {
    requestedAction: plan.action,
    requestedIndex: plan.index,
    requestedText: plan.text,
    requestedUrl: plan.url,
    executed: false,
    message,
  };
}

function verifierExecution(reason: string): InteractionExecutionResult {
  return {
    requestedAction: 'unknown',
    requestedIndex: null,
    requestedText: null,
    requestedUrl: null,
    executed: false,
    message: `Verifier rejected completion: ${reason}`,
  };
}

function nextPromptElementLimit(current: number): number {
  return Math.floor(current * INTERACTION_PROMPT_RETRY_SHRINK_FACTOR);
}

function mustStopRetrying(current: number, next: number): boolean {
  return next < 6 || next >= current;
}

function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isContentConnectionUnavailableError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return CONTENT_CONNECTION_ERROR_MESSAGES.some((needle) => message.includes(needle));
}

function buildSyntheticSnapshot(params: {
  pageUrl: string;
  pageTitle: string;
  viewportWidth: number;
  viewportHeight: number;
}): InteractionSnapshotPayload {
  return {
    pageUrl: params.pageUrl,
    pageTitle: params.pageTitle,
    scrollY: 0,
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
    interactiveElements: [],
  };
}

function emitProgressLine(options: InteractionRunOptions | undefined, line: string): void {
  options?.onProgress?.({ type: 'line', line });
}

function emitProgressScreenshot(
  onProgress: InteractionRunOptions['onProgress'] | undefined,
  stepNumber: number,
  canvas: HTMLCanvasElement,
): string | null {
  if (!onProgress) return null;
  const imageDataUrl = canvas.toDataURL('image/png');
  onProgress({
    type: 'screenshot',
    stepNumber,
    imageDataUrl,
    width: canvas.width,
    height: canvas.height,
  });
  return imageDataUrl;
}

function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return value.trim();
  }
}

function isSameDestination(currentUrl: string, targetUrl: string): boolean {
  return normalizeComparableUrl(currentUrl) === normalizeComparableUrl(targetUrl);
}

function extractFirstHttpUrlCandidate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s"'<>`]+/i);
  if (!match) return null;
  try {
    return new URL(match[0]).toString();
  } catch {
    return null;
  }
}

function toRecoveryOpenUrlPlan(url: string, reason: string): InteractionActionPlan {
  return {
    action: 'openUrl',
    index: null,
    text: null,
    url,
    reason,
    confidence: 'high',
  };
}

function keepExecutableRecoveryActions(actions: InteractionActionPlan[]): InteractionActionPlan[] {
  return actions.filter((action) => action.action === 'openUrl' || action.action === 'click' || action.action === 'type');
}

function buildRejectedDoneRecoveryPlans(params: {
  currentUrl: string;
  decision: ParsedInteractionDecision;
}): InteractionActionPlan[] {
  const aiActions = keepExecutableRecoveryActions(params.decision.actions);
  if (aiActions.length > 0) return aiActions;

  const finalAnswerUrl = extractFirstHttpUrlCandidate(params.decision.finalAnswer);
  if (finalAnswerUrl && !isSameDestination(params.currentUrl, finalAnswerUrl)) {
    return [toRecoveryOpenUrlPlan(finalAnswerUrl, 'Verifier rejected done, navigating to planner finalAnswer URL')];
  }

  const reasonUrl = extractFirstHttpUrlCandidate(params.decision.reason);
  if (reasonUrl && !isSameDestination(params.currentUrl, reasonUrl)) {
    return [toRecoveryOpenUrlPlan(reasonUrl, 'Verifier rejected done, navigating to planner reason URL')];
  }

  return [];
}

function buildDoneStatusNavigationPlans(params: {
  currentUrl: string;
  decision: ParsedInteractionDecision;
}): InteractionActionPlan[] {
  const aiActions = keepExecutableRecoveryActions(params.decision.actions);
  if (aiActions.length > 0) return aiActions;

  const finalAnswerUrl = extractFirstHttpUrlCandidate(params.decision.finalAnswer);
  if (finalAnswerUrl && !isSameDestination(params.currentUrl, finalAnswerUrl)) {
    return [toRecoveryOpenUrlPlan(finalAnswerUrl, 'Planner marked done with off-page finalAnswer URL')];
  }

  const reasonUrl = extractFirstHttpUrlCandidate(params.decision.reason);
  if (reasonUrl && !isSameDestination(params.currentUrl, reasonUrl)) {
    return [toRecoveryOpenUrlPlan(reasonUrl, 'Planner marked done with off-page reason URL')];
  }

  return [];
}

function toExecutionFromAction(
  plan: ExecutableInteractionPlan,
  response: Awaited<ReturnType<typeof executeAction>>,
): InteractionExecutionResult {
  return {
    requestedAction: plan.action,
    requestedIndex: plan.index,
    requestedText: plan.text,
    requestedUrl: null,
    executed: response.ok,
    message: response.message,
  };
}

function toExecutionFromOpenUrl(plan: InteractionActionPlan, finalUrl: string): InteractionExecutionResult {
  return {
    requestedAction: plan.action,
    requestedIndex: null,
    requestedText: null,
    requestedUrl: finalUrl,
    executed: true,
    message: `Opened ${finalUrl}`,
  };
}

async function executeSinglePlan(tabId: number, plan: InteractionActionPlan): Promise<InteractionExecutionResult> {
  if (plan.action === 'openUrl') {
    if (!plan.url) return fallbackExecution(plan, 'openUrl action requires URL');
    try {
      const result = await openUrlInTab(tabId, plan.url);
      return toExecutionFromOpenUrl(plan, result.finalUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'openUrl failed';
      return fallbackExecution(plan, message);
    }
  }

  if (isExecutableAction(plan)) {
    const response = await executeAction(
      tabId,
      plan.action,
      plan.index,
      plan.action === 'type' ? plan.text ?? '' : null,
    );
    return toExecutionFromAction(plan, response);
  }

  if (plan.action === 'done') {
    return fallbackExecution(plan, 'Planner marked task as done');
  }

  return fallbackExecution(plan, 'Planner could not choose a safe action');
}

function shouldStopAfterExecution(execution: InteractionExecutionResult): boolean {
  if (!execution.executed) return true;
  return execution.requestedAction === 'openUrl';
}

async function executePlannedActions(
  tabId: number,
  plans: InteractionActionPlan[],
): Promise<InteractionExecutionResult[]> {
  const executions: InteractionExecutionResult[] = [];

  for (const plan of plans) {
    const execution = await executeSinglePlan(tabId, plan);
    executions.push(execution);
    if (shouldStopAfterExecution(execution)) break;
  }

  return executions;
}

async function requestPlannerDecision(params: {
  task: string;
  stepNumber: number;
  maxSteps: number;
  pageUrl: string;
  pageTitle: string;
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
  baseCanvas: HTMLCanvasElement;
  viewport: { width: number; height: number };
  onProgress?: InteractionRunOptions['onProgress'];
}): Promise<PromptDecisionResult> {
  let elementLimit = Math.max(1, params.elements.length);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS; attempt += 1) {
    const promptElements = params.elements.slice(0, Math.max(1, elementLimit));
    const prompt = buildInteractionPrompt({
      task: params.task,
      stepNumber: params.stepNumber,
      maxSteps: params.maxSteps,
      pageUrl: params.pageUrl,
      pageTitle: params.pageTitle,
      history: params.history,
      elements: promptElements,
    });
    const annotatedCanvas = annotateInteractionCanvas(params.baseCanvas, promptElements, params.viewport);
    const emittedScreenshot = emitProgressScreenshot(params.onProgress, params.stepNumber, annotatedCanvas);

    try {
      const runResult = await runTextImagePrompt(prompt, annotatedCanvas);
      return {
        decision: parseInteractionDecision(runResult.output),
        rawResponse: runResult.output,
        prompt,
        promptElements,
        retryCount: attempt,
        measuredInputTokens: runResult.measuredInputTokens,
        sessionInputUsageBefore: runResult.sessionInputUsageBefore,
        sessionInputUsageAfter: runResult.sessionInputUsageAfter,
        sessionInputQuota: runResult.sessionInputQuota,
        sessionInputQuotaRemaining: runResult.sessionInputQuotaRemaining,
        screenshotDataUrl: emittedScreenshot ?? annotatedCanvas.toDataURL('image/png'),
        imageWidth: annotatedCanvas.width,
        imageHeight: annotatedCanvas.height,
      };
    } catch (error) {
      lastError = error;
      if (!isInputTooLargeError(error)) throw error;
      const nextElementLimit = nextPromptElementLimit(elementLimit);
      if (mustStopRetrying(elementLimit, nextElementLimit)) throw error;
      elementLimit = nextElementLimit;
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Prompt API request failed'));
}

function resolveCompletion(
  status: InteractionRunStatus,
  decision: ParsedInteractionDecision,
  executions: InteractionExecutionResult[],
  fallbackFinalAnswer: string | null,
): { status: InteractionRunStatus; finalAnswer: string | null } {
  const lastExecution = executions[executions.length - 1];

  if (status === 'done') {
    return {
      status,
      finalAnswer: decision.finalAnswer ?? decision.reason ?? 'Task completed',
    };
  }

  if (status === 'fail') {
    return {
      status,
      finalAnswer: decision.finalAnswer ?? decision.reason ?? lastExecution?.message ?? 'Task failed',
    };
  }

  if (status === 'max-steps') {
    return {
      status,
      finalAnswer: decision.finalAnswer ?? decision.reason ?? lastExecution?.message ?? 'Maximum agent steps reached',
    };
  }

  return { status, finalAnswer: fallbackFinalAnswer };
}

export async function runPageInteractionStep(
  userInstruction: string,
  options?: InteractionRunOptions,
): Promise<PageInteractionStepResult> {
  const task = normalizeInstruction(userInstruction);
  const allPlans: InteractionActionPlan[] = [];
  const allExecutions: InteractionExecutionResult[] = [];
  const rawResponses: string[] = [];
  let finalStatus: InteractionRunStatus = 'continue';
  let finalAnswer: string | null = null;
  let lastVerification: InteractionCompletionVerification | null = null;
  let lastDecision: PromptDecisionResult | null = null;
  let lastPageUrl = '';
  let lastPageTitle = '';
  let lastTabId: number | null = null;
  let lastElementCount = 0;
  let lastPromptElementCount = 0;
  let totalRetries = 0;

  for (let stepNumber = 1; stepNumber <= AGENT_MAX_STEPS; stepNumber += 1) {
    let activeTab = await getActiveTab();
    lastTabId = activeTab.tabId;
    await waitForTabSettled(activeTab.tabId, {
      maxWaitMs: INTERACTION_TAB_SETTLE_MAX_WAIT_MS,
      pollIntervalMs: INTERACTION_TAB_SETTLE_POLL_MS,
      stableIdleMs: INTERACTION_TAB_SETTLE_IDLE_MS,
    });

    let snapshot: InteractionSnapshotPayload;
    let capture: Awaited<ReturnType<typeof captureStackedViewport>>;
    try {
      snapshot = await getInteractionSnapshot(activeTab.tabId, {
        maxElements: INTERACTION_SNAPSHOT_MAX_ELEMENTS,
        viewportOnly: true,
        viewportSegments: AGENT_VIEWPORT_SEGMENTS,
      });
      const baseViewportHeight = Math.max(1, Math.round(snapshot.viewportHeight / AGENT_VIEWPORT_SEGMENTS));
      capture = await captureStackedViewport({
        windowId: activeTab.windowId,
        tabId: activeTab.tabId,
        baseScrollY: snapshot.scrollY,
        viewportHeight: baseViewportHeight,
        viewportSegments: AGENT_VIEWPORT_SEGMENTS,
        settleMs: INTERACTION_CAPTURE_SETTLE_MS,
      });
    } catch (error) {
      if (!isContentConnectionUnavailableError(error)) throw error;

      const placeholderUrl = chrome.runtime.getURL(AGENT_PLACEHOLDER_PAGE_PATH);
      if (!isSameDestination(activeTab.url, placeholderUrl)) {
        const placeholderOpenResult = await openExtensionPageInTab(activeTab.tabId, AGENT_PLACEHOLDER_PAGE_PATH);
        emitProgressLine(
          options,
          `[${stepNumber}] recovery | content connection unavailable, opened placeholder ${placeholderOpenResult.finalUrl}`,
        );
      } else {
        emitProgressLine(
          options,
          `[${stepNumber}] recovery | content connection unavailable, keeping placeholder page`,
        );
      }

      await waitForTabSettled(activeTab.tabId, {
        maxWaitMs: INTERACTION_TAB_SETTLE_MAX_WAIT_MS,
        pollIntervalMs: INTERACTION_TAB_SETTLE_POLL_MS,
        stableIdleMs: INTERACTION_TAB_SETTLE_IDLE_MS,
      });
      activeTab = await getActiveTab();
      lastTabId = activeTab.tabId;
      capture = await captureStackedViewport({
        windowId: activeTab.windowId,
        tabId: activeTab.tabId,
        baseScrollY: 0,
        viewportHeight: 1,
        viewportSegments: 1,
        settleMs: INTERACTION_CAPTURE_SETTLE_MS,
      });
      snapshot = buildSyntheticSnapshot({
        pageUrl: activeTab.url || placeholderUrl,
        pageTitle: activeTab.title || 'NanoChat',
        viewportWidth: capture.canvas.width,
        viewportHeight: capture.canvas.height,
      });
    }

    emitProgressLine(options, formatObserveLine(stepNumber, snapshot.pageUrl, snapshot.interactiveElements.length));
    lastPageUrl = snapshot.pageUrl;
    lastPageTitle = snapshot.pageTitle;

    const decision = await requestPlannerDecision({
      task,
      stepNumber,
      maxSteps: AGENT_MAX_STEPS,
      pageUrl: snapshot.pageUrl,
      pageTitle: snapshot.pageTitle,
      history: allExecutions,
      elements: snapshot.interactiveElements,
      baseCanvas: capture.canvas,
      viewport: { width: snapshot.viewportWidth, height: snapshot.viewportHeight },
      onProgress: options?.onProgress,
    });

    rawResponses.push(decision.rawResponse);
    emitProgressLine(
      options,
      formatPlannerLine(stepNumber, decision.decision.status, decision.decision.actions.length),
    );
    emitProgressLine(options, formatPlannerRawLine(stepNumber, decision.rawResponse));
    lastDecision = decision;
    lastElementCount = snapshot.interactiveElements.length;
    lastPromptElementCount = decision.promptElements.length;
    totalRetries += decision.retryCount;

    if (decision.decision.status === 'done') {
      const doneStatusRecoveryPlans = enforceTypingFirst(
        buildDoneStatusNavigationPlans({
          currentUrl: snapshot.pageUrl,
          decision: decision.decision,
        }),
        task,
        decision.promptElements,
      );
      if (doneStatusRecoveryPlans.length > 0) {
        emitProgressLine(
          options,
          `[${stepNumber}] recovery | done status has off-page target, forcing actions=${doneStatusRecoveryPlans.length}`,
        );
        formatPlanLines(stepNumber, doneStatusRecoveryPlans).forEach((line) => emitProgressLine(options, line));
        allPlans.push(...doneStatusRecoveryPlans);

        const doneStatusRecoveries = await executePlannedActions(activeTab.tabId, doneStatusRecoveryPlans);
        formatExecutionLines(stepNumber, doneStatusRecoveries).forEach((line) => emitProgressLine(options, line));
        allExecutions.push(...doneStatusRecoveries);

        if (!doneStatusRecoveries.length) {
          finalStatus = 'fail';
          finalAnswer = 'Done-status recovery produced no executable actions';
          break;
        }

        const lastDoneStatusRecovery = doneStatusRecoveries[doneStatusRecoveries.length - 1];
        if (!lastDoneStatusRecovery.executed && stepNumber >= AGENT_MAX_STEPS) {
          finalStatus = 'max-steps';
          finalAnswer = 'Maximum agent steps reached';
          break;
        }
        continue;
      }

      const verificationResult = await verifyTaskCompletion({
        task,
        pageUrl: snapshot.pageUrl,
        pageTitle: snapshot.pageTitle,
        history: allExecutions,
        plannerFinalAnswer: decision.decision.finalAnswer,
      }).catch((error) => {
        const message = `Verifier error: ${extractErrorMessage(error)}`;
        return {
          verification: {
            complete: false,
            reason: message,
            confidence: 'low' as const,
          },
          rawOutput: message,
        };
      });
      const verification = verificationResult.verification;
      lastVerification = verification;
      emitProgressLine(options, formatVerificationLine(stepNumber, verification));
      if (verificationResult.rawOutput) {
        emitProgressLine(options, formatVerificationRawLine(stepNumber, verificationResult.rawOutput));
      }
      if (verification.complete) {
        finalStatus = 'done';
        finalAnswer = decision.decision.finalAnswer ?? verification.reason;
        break;
      }

      const recoveryPlans = enforceTypingFirst(
        buildRejectedDoneRecoveryPlans({
          currentUrl: snapshot.pageUrl,
          decision: decision.decision,
        }),
        task,
        decision.promptElements,
      );
      if (recoveryPlans.length > 0) {
        emitProgressLine(
          options,
          `[${stepNumber}] recovery | verifier rejected done, fallback actions=${recoveryPlans.length}`,
        );
        formatPlanLines(stepNumber, recoveryPlans).forEach((line) => emitProgressLine(options, line));
        allPlans.push(...recoveryPlans);

        const recoveryExecutions = await executePlannedActions(activeTab.tabId, recoveryPlans);
        formatExecutionLines(stepNumber, recoveryExecutions).forEach((line) => emitProgressLine(options, line));
        allExecutions.push(...recoveryExecutions);

        if (!recoveryExecutions.length) {
          finalStatus = 'fail';
          finalAnswer = 'Recovery produced no executable actions';
          break;
        }

        const lastRecoveryExecution = recoveryExecutions[recoveryExecutions.length - 1];
        if (!lastRecoveryExecution.executed && stepNumber >= AGENT_MAX_STEPS) {
          finalStatus = 'max-steps';
          finalAnswer = 'Maximum agent steps reached';
          break;
        }
        continue;
      }

      allExecutions.push(verifierExecution(verification.reason));
      if (stepNumber >= AGENT_MAX_STEPS) {
        finalStatus = 'max-steps';
        finalAnswer = verification.reason;
        break;
      }
      continue;
    }

    if (decision.decision.status === 'fail') {
      finalStatus = 'fail';
      finalAnswer = decision.decision.finalAnswer ?? decision.decision.reason;
      break;
    }

    const plans = enforceTypingFirst(decision.decision.actions, task, decision.promptElements);
    formatPlanLines(stepNumber, plans).forEach((line) => emitProgressLine(options, line));
    allPlans.push(...plans);

    const executions = await executePlannedActions(activeTab.tabId, plans);
    formatExecutionLines(stepNumber, executions).forEach((line) => emitProgressLine(options, line));
    allExecutions.push(...executions);

    if (!executions.length) {
      finalStatus = 'fail';
      finalAnswer = 'Planner returned executable actions but none were executed';
      break;
    }

    const lastExecution = executions[executions.length - 1];
    if (!lastExecution.executed && lastExecution.requestedAction !== 'unknown') {
      if (stepNumber >= AGENT_MAX_STEPS) {
        finalStatus = 'max-steps';
        finalAnswer = 'Maximum agent steps reached';
        break;
      }
    }
  }

  if (finalStatus === 'continue') {
    finalStatus = 'max-steps';
    finalAnswer = finalAnswer ?? 'Maximum agent steps reached before completion';
  }

  if (!lastDecision) {
    throw new Error('Agent did not produce any planning result');
  }

  const completion = resolveCompletion(finalStatus, lastDecision.decision, allExecutions, finalAnswer);
  emitProgressLine(options, formatFinalLine(completion.status, completion.finalAnswer));
  if (lastTabId !== null) {
    await clearHighlights(lastTabId).catch(() => undefined);
  }

  return {
    status: completion.status,
    finalAnswer: completion.finalAnswer,
    verification: lastVerification,
    plans: allPlans,
    executions: allExecutions,
    rawResponse: rawResponses.join('\n'),
    screenshotDataUrl: lastDecision.screenshotDataUrl,
    debugInput: {
      pageUrl: lastPageUrl,
      pageTitle: lastPageTitle,
      instruction: task,
      prompt: lastDecision.prompt,
      promptTokens: estimateTokens(lastDecision.prompt),
      measuredInputTokens: lastDecision.measuredInputTokens,
      sessionInputUsageBefore: lastDecision.sessionInputUsageBefore,
      sessionInputUsageAfter: lastDecision.sessionInputUsageAfter,
      sessionInputQuota: lastDecision.sessionInputQuota,
      sessionInputQuotaRemaining: lastDecision.sessionInputQuotaRemaining,
      interactiveElements: lastDecision.promptElements,
    },
    captureMeta: {
      imageWidth: lastDecision.imageWidth,
      imageHeight: lastDecision.imageHeight,
      elementCount: lastElementCount,
      promptElementCount: lastPromptElementCount,
      retryCount: totalRetries,
    },
  };
}
