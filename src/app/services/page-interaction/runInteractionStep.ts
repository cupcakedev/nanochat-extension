import {
  clearHighlights,
  executeAction,
  getActiveTab,
  getInteractionSnapshot,
  getPageContent,
  openUrlInTab,
} from '@app/services/tab-bridge';
import type {
  ExecutableInteractionAction,
  InteractionActionPlan,
  InteractionExecutionResult,
  InteractiveElementSnapshotItem,
  InteractionRunStatus,
  PageInteractionStepResult,
} from '@shared/types';
import { buildInteractionPrompt } from './prompt';
import { parseInteractionDecision, type ParsedInteractionDecision } from './parser';
import { captureVisibleViewport } from './capture';
import { annotateInteractionCanvas } from './annotate-canvas';
import { enforceTypingFirst } from './guards';
import { estimateTokens, isInputTooLargeError, runTextImagePrompt } from './prompt-api';
import {
  INTERACTION_CAPTURE_SETTLE_MS,
  INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS,
  INTERACTION_PROMPT_RETRY_SHRINK_FACTOR,
  INTERACTION_SNAPSHOT_MAX_ELEMENTS,
} from './constants';

const AGENT_MAX_STEPS = 12;
const PAGE_TEXT_MAX_CHARS = 2800;
const PAGE_TEXT_MIN_CHARS = 600;

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

function nextPromptElementLimit(current: number): number {
  return Math.floor(current * INTERACTION_PROMPT_RETRY_SHRINK_FACTOR);
}

function mustStopRetrying(current: number, next: number): boolean {
  return next < 6 || next >= current;
}

function sanitizePageContent(content: string, maxChars: number): string {
  const normalized = content.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length <= maxChars ? normalized : normalized.slice(0, maxChars);
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
  pageContent: string;
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
  baseCanvas: HTMLCanvasElement;
  viewport: { width: number; height: number };
}): Promise<PromptDecisionResult> {
  let elementLimit = Math.max(1, params.elements.length);
  let pageTextLimit = PAGE_TEXT_MAX_CHARS;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS; attempt += 1) {
    const promptElements = params.elements.slice(0, Math.max(1, elementLimit));
    const pageContentExcerpt = sanitizePageContent(params.pageContent, pageTextLimit);
    const prompt = buildInteractionPrompt({
      task: params.task,
      stepNumber: params.stepNumber,
      maxSteps: params.maxSteps,
      pageUrl: params.pageUrl,
      pageTitle: params.pageTitle,
      pageContentExcerpt,
      history: params.history,
      elements: promptElements,
    });
    const annotatedCanvas = annotateInteractionCanvas(params.baseCanvas, promptElements, params.viewport);

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
        screenshotDataUrl: annotatedCanvas.toDataURL('image/png'),
        imageWidth: annotatedCanvas.width,
        imageHeight: annotatedCanvas.height,
      };
    } catch (error) {
      lastError = error;
      if (!isInputTooLargeError(error)) throw error;
      const nextElementLimit = nextPromptElementLimit(elementLimit);
      if (mustStopRetrying(elementLimit, nextElementLimit) && pageTextLimit <= PAGE_TEXT_MIN_CHARS) throw error;
      elementLimit = mustStopRetrying(elementLimit, nextElementLimit) ? elementLimit : nextElementLimit;
      pageTextLimit = Math.max(PAGE_TEXT_MIN_CHARS, Math.floor(pageTextLimit * INTERACTION_PROMPT_RETRY_SHRINK_FACTOR));
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

export async function runPageInteractionStep(userInstruction: string): Promise<PageInteractionStepResult> {
  const task = normalizeInstruction(userInstruction);
  const allPlans: InteractionActionPlan[] = [];
  const allExecutions: InteractionExecutionResult[] = [];
  const rawResponses: string[] = [];
  let finalStatus: InteractionRunStatus = 'continue';
  let finalAnswer: string | null = null;
  let lastDecision: PromptDecisionResult | null = null;
  let lastPageUrl = '';
  let lastPageTitle = '';
  let lastTabId: number | null = null;
  let lastElementCount = 0;
  let lastPromptElementCount = 0;
  let totalRetries = 0;

  for (let stepNumber = 1; stepNumber <= AGENT_MAX_STEPS; stepNumber += 1) {
    const activeTab = await getActiveTab();
    lastTabId = activeTab.tabId;
    const snapshot = await getInteractionSnapshot(activeTab.tabId, {
      maxElements: INTERACTION_SNAPSHOT_MAX_ELEMENTS,
      viewportOnly: true,
    });
    lastPageUrl = snapshot.pageUrl;
    lastPageTitle = snapshot.pageTitle;
    const capture = await captureVisibleViewport(activeTab.windowId, INTERACTION_CAPTURE_SETTLE_MS);
    const pageContent = await getPageContent(activeTab.tabId, { showIndicator: false }).catch(() => '');

    const decision = await requestPlannerDecision({
      task,
      stepNumber,
      maxSteps: AGENT_MAX_STEPS,
      pageUrl: snapshot.pageUrl,
      pageTitle: snapshot.pageTitle,
      pageContent,
      history: allExecutions,
      elements: snapshot.interactiveElements,
      baseCanvas: capture.canvas,
      viewport: { width: snapshot.viewportWidth, height: snapshot.viewportHeight },
    });

    rawResponses.push(decision.rawResponse);
    lastDecision = decision;
    lastElementCount = snapshot.interactiveElements.length;
    lastPromptElementCount = decision.promptElements.length;
    totalRetries += decision.retryCount;

    if (decision.decision.status !== 'continue') {
      finalStatus = decision.decision.status;
      finalAnswer = decision.decision.finalAnswer ?? decision.decision.reason;
      break;
    }

    const plans = enforceTypingFirst(decision.decision.actions, task, decision.promptElements);
    allPlans.push(...plans);

    const executions = await executePlannedActions(activeTab.tabId, plans);
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
  if (lastTabId !== null) {
    await clearHighlights(lastTabId).catch(() => undefined);
  }

  return {
    status: completion.status,
    finalAnswer: completion.finalAnswer,
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
