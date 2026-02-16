import {
  clearHighlights,
  executeAction,
  getActiveTab,
  getTabById,
  getInteractionSnapshot,
  openExtensionPageInTab,
  openUrlInTab,
  waitForTabSettled,
} from '@app/services/tab-bridge';
import { createLogger } from '@shared/utils';
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
import { estimateTokens, isInputTooLargeError, isPromptTimeoutError, runTextImagePrompt } from './prompt-api';
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
const DONE_LOOP_RECOVERY_THRESHOLD = 2;
const EXPLORATION_POSITIVE_KEYWORDS = [
  'similar',
  'related',
  'more',
  'shop',
  'discover',
  'collection',
  'category',
  'product',
  'items',
  'sneaker',
  'shoe',
  'men',
  'women',
  'kids',
  'next',
  'continue',
  'view',
  'details',
];
const EXPLORATION_NEGATIVE_KEYWORDS = [
  'cookie',
  'consent',
  'privacy',
  'terms',
  'accept',
  'reject',
  'close',
  'dismiss',
  'sign in',
  'login',
  'register',
  'newsletter',
  'subscribe',
  'language',
  'country',
  'region',
];

const logger = createLogger('interaction-step');

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
  signal?: AbortSignal;
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

function createAbortError(): Error {
  const error = new Error('Agent run aborted');
  error.name = 'AbortError';
  return error;
}

function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    if (/aborted|cancelled/i.test(error.message)) return true;
  }
  return false;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw createAbortError();
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

function compactKeyPart(value: string | null | undefined, maxChars = 220): string {
  if (!value) return '';
  const compacted = value.replace(/\s+/g, ' ').trim();
  return compacted.length <= maxChars ? compacted : compacted.slice(0, maxChars);
}

function countMeaningfulExecutions(executions: InteractionExecutionResult[]): number {
  return executions.reduce((count, execution) => (
    count + (execution.requestedAction === 'unknown' ? 0 : 1)
  ), 0);
}

function buildVerificationCacheKey(params: {
  task: string;
  pageUrl: string;
  pageTitle: string;
  plannerFinalAnswer: string | null;
  plannerReason: string | null;
  meaningfulExecutionCount: number;
}): string {
  return [
    compactKeyPart(params.task, 260),
    normalizeComparableUrl(params.pageUrl),
    compactKeyPart(params.pageTitle, 160),
    compactKeyPart(params.plannerFinalAnswer, 220),
    compactKeyPart(params.plannerReason, 180),
    String(params.meaningfulExecutionCount),
  ].join('|');
}

function buildDoneLoopKey(params: {
  task: string;
  pageUrl: string;
  meaningfulExecutionCount: number;
}): string {
  return [
    compactKeyPart(params.task, 260),
    normalizeComparableUrl(params.pageUrl),
    String(params.meaningfulExecutionCount),
  ].join('|');
}

function buildStuckDoneRecoveryPlans(params: {
  task: string;
  currentUrl: string;
}): InteractionActionPlan[] {
  const queryBase = compactKeyPart(params.task, 280) || 'site search';
  let query = queryBase;
  try {
    const url = new URL(params.currentUrl);
    if (/^https?:$/i.test(url.protocol) && url.hostname.trim()) {
      query = `${queryBase} site:${url.hostname}`;
    }
  } catch {
    // Keep generic query when URL is not parseable.
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return [toRecoveryOpenUrlPlan(searchUrl, 'Stuck done-loop recovery via search navigation')];
}

function splitTaskTokens(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function isLikelyClickableElement(element: InteractiveElementSnapshotItem): boolean {
  if (element.disabled) return false;
  if (element.href) return true;
  const tag = element.tag.toLowerCase();
  if (tag === 'a' || tag === 'button' || tag === 'summary') return true;
  const role = element.role?.toLowerCase() ?? '';
  return role.includes('button')
    || role.includes('link')
    || role.includes('tab')
    || role.includes('menuitem')
    || role.includes('option');
}

function buildElementTextForScoring(element: InteractiveElementSnapshotItem): string {
  return [
    element.text,
    element.ariaLabel,
    element.placeholder,
    element.name,
    element.id,
    element.href,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function computeExplorationClickScore(element: InteractiveElementSnapshotItem, taskTokens: string[]): number {
  if (!isLikelyClickableElement(element)) return -1000;
  const elementText = buildElementTextForScoring(element);
  let score = 0;

  if (element.href) score += 4;
  if (element.tag.toLowerCase() === 'a') score += 2;
  if (element.tag.toLowerCase() === 'button') score += 2;
  if (element.role?.toLowerCase().includes('link')) score += 2;
  if (element.role?.toLowerCase().includes('button')) score += 2;

  for (const keyword of EXPLORATION_POSITIVE_KEYWORDS) {
    if (elementText.includes(keyword)) score += 2;
  }
  for (const keyword of EXPLORATION_NEGATIVE_KEYWORDS) {
    if (elementText.includes(keyword)) score -= 4;
  }
  for (const token of taskTokens) {
    if (elementText.includes(token)) score += 2;
  }

  if (!elementText.trim()) score -= 2;
  return score;
}

function buildExplorationClickKey(pageUrl: string, index: number): string {
  return `${normalizeComparableUrl(pageUrl)}#${index}`;
}

function buildRejectedDoneExplorationPlans(params: {
  task: string;
  currentUrl: string;
  elements: InteractiveElementSnapshotItem[];
  attemptedClickKeys: Set<string>;
}): InteractionActionPlan[] {
  const taskTokens = splitTaskTokens(params.task);
  let best: { element: InteractiveElementSnapshotItem; score: number } | null = null;

  for (const element of params.elements) {
    const clickKey = buildExplorationClickKey(params.currentUrl, element.index);
    if (params.attemptedClickKeys.has(clickKey)) continue;
    const score = computeExplorationClickScore(element, taskTokens);
    if (score < 1) continue;
    if (!best || score > best.score) {
      best = { element, score };
    }
  }

  if (!best) return [];
  return [{
    action: 'click',
    index: best.element.index,
    text: null,
    url: null,
    reason: `Verifier rejected done; exploratory on-page click at index ${best.element.index}.`,
    confidence: best.score >= 8 ? 'high' : 'medium',
  }];
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

async function executeSinglePlan(
  tabId: number,
  plan: InteractionActionPlan,
  signal?: AbortSignal,
): Promise<InteractionExecutionResult> {
  throwIfAborted(signal);
  if (plan.action === 'openUrl') {
    if (!plan.url) return fallbackExecution(plan, 'openUrl action requires URL');
    try {
      const result = await openUrlInTab(tabId, plan.url);
      throwIfAborted(signal);
      return toExecutionFromOpenUrl(plan, result.finalUrl);
    } catch (error) {
      if (isAbortError(error)) throw error;
      const message = error instanceof Error ? error.message : 'openUrl failed';
      return fallbackExecution(plan, message);
    }
  }

  if (isExecutableAction(plan)) {
    throwIfAborted(signal);
    const response = await executeAction(
      tabId,
      plan.action,
      plan.index,
      plan.action === 'type' ? plan.text ?? '' : null,
    );
    throwIfAborted(signal);
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
  signal?: AbortSignal,
): Promise<InteractionExecutionResult[]> {
  const executions: InteractionExecutionResult[] = [];

  for (const plan of plans) {
    throwIfAborted(signal);
    const execution = await executeSinglePlan(tabId, plan, signal);
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
  signal?: AbortSignal;
}): Promise<PromptDecisionResult> {
  let elementLimit = Math.max(1, params.elements.length);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS; attempt += 1) {
    throwIfAborted(params.signal);
    logger.info('planner:attempt:start', {
      stepNumber: params.stepNumber,
      attempt: attempt + 1,
      maxAttempts: INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS + 1,
      elementLimit,
      pageUrl: params.pageUrl,
    });
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
      logger.info('planner:model:request', {
        stepNumber: params.stepNumber,
        attempt: attempt + 1,
        promptLength: prompt.length,
        promptElementCount: promptElements.length,
      });
      const runResult = await runTextImagePrompt(prompt, annotatedCanvas, params.signal);
      logger.info('planner:model:response', {
        stepNumber: params.stepNumber,
        attempt: attempt + 1,
        outputLength: runResult.output.length,
      });
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
      if (isAbortError(error)) throw error;
      lastError = error;
      if (isPromptTimeoutError(error)) {
        emitProgressLine(
          { onProgress: params.onProgress },
          `[${params.stepNumber}] planner timeout on attempt ${attempt + 1}, retrying`,
        );
        logger.warn('planner:attempt:timeout', {
          stepNumber: params.stepNumber,
          attempt: attempt + 1,
          message: extractErrorMessage(error),
        });
        continue;
      }
      if (!isInputTooLargeError(error)) throw error;
      const nextElementLimit = nextPromptElementLimit(elementLimit);
      if (mustStopRetrying(elementLimit, nextElementLimit)) throw error;
      elementLimit = nextElementLimit;
      logger.warn('planner:attempt:retry-shrink', {
        stepNumber: params.stepNumber,
        attempt: attempt + 1,
        previousElementLimit: promptElements.length,
        nextElementLimit: elementLimit,
      });
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
  throwIfAborted(options?.signal);
  const task = normalizeInstruction(userInstruction);
  const pinnedTab = await getActiveTab();
  const allPlans: InteractionActionPlan[] = [];
  const allExecutions: InteractionExecutionResult[] = [];
  const rawResponses: string[] = [];
  let finalStatus: InteractionRunStatus = 'continue';
  let finalAnswer: string | null = null;
  let lastVerification: InteractionCompletionVerification | null = null;
  let lastDecision: PromptDecisionResult | null = null;
  let lastPageUrl = '';
  let lastPageTitle = '';
  let lastTabId: number | null = pinnedTab.tabId;
  let lastElementCount = 0;
  let lastPromptElementCount = 0;
  let totalRetries = 0;
  const verificationCache = new Map<string, InteractionCompletionVerification>();
  const attemptedRejectedDoneClickKeys = new Set<string>();
  let lastRejectedDoneKey: string | null = null;
  let rejectedDoneStreak = 0;

  for (let stepNumber = 1; stepNumber <= AGENT_MAX_STEPS; stepNumber += 1) {
    throwIfAborted(options?.signal);
    const activeTab = { ...pinnedTab };
    lastTabId = activeTab.tabId;
    await waitForTabSettled(activeTab.tabId, {
      maxWaitMs: INTERACTION_TAB_SETTLE_MAX_WAIT_MS,
      pollIntervalMs: INTERACTION_TAB_SETTLE_POLL_MS,
      stableIdleMs: INTERACTION_TAB_SETTLE_IDLE_MS,
    });
    throwIfAborted(options?.signal);

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
      throwIfAborted(options?.signal);
    } catch (error) {
      if (isAbortError(error)) throw error;
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
      throwIfAborted(options?.signal);
      const recoveredTab = await getTabById(pinnedTab.tabId);
      capture = await captureStackedViewport({
        windowId: recoveredTab.windowId,
        tabId: recoveredTab.tabId,
        baseScrollY: 0,
        viewportHeight: 1,
        viewportSegments: 1,
        settleMs: INTERACTION_CAPTURE_SETTLE_MS,
      });
      throwIfAborted(options?.signal);
      snapshot = buildSyntheticSnapshot({
        pageUrl: recoveredTab.url || placeholderUrl,
        pageTitle: recoveredTab.title || 'NanoChat',
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
      signal: options?.signal,
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
      const meaningfulExecutionCount = countMeaningfulExecutions(allExecutions);
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

        const doneStatusRecoveries = await executePlannedActions(activeTab.tabId, doneStatusRecoveryPlans, options?.signal);
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
        lastRejectedDoneKey = null;
        rejectedDoneStreak = 0;
        continue;
      }

      const verificationCacheKey = buildVerificationCacheKey({
        task,
        pageUrl: snapshot.pageUrl,
        pageTitle: snapshot.pageTitle,
        plannerFinalAnswer: decision.decision.finalAnswer,
        plannerReason: decision.decision.reason,
        meaningfulExecutionCount,
      });
      const cachedVerification = verificationCache.get(verificationCacheKey);
      const verificationResult = cachedVerification
        ? {
          verification: cachedVerification,
          rawOutput: '{"cached":true}',
        }
        : await verifyTaskCompletion({
          task,
          pageUrl: snapshot.pageUrl,
          pageTitle: snapshot.pageTitle,
          history: allExecutions,
          plannerFinalAnswer: decision.decision.finalAnswer,
          signal: options?.signal,
        }).catch((error) => {
          if (isAbortError(error)) throw error;
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
      if (!cachedVerification) {
        verificationCache.set(verificationCacheKey, verification);
      }
      lastVerification = verification;
      emitProgressLine(options, formatVerificationLine(stepNumber, verification));
      if (verificationResult.rawOutput) {
        emitProgressLine(options, formatVerificationRawLine(stepNumber, verificationResult.rawOutput));
      }
      if (verification.complete) {
        finalStatus = 'done';
        finalAnswer = decision.decision.finalAnswer ?? verification.reason;
        lastRejectedDoneKey = null;
        rejectedDoneStreak = 0;
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

        const recoveryExecutions = await executePlannedActions(activeTab.tabId, recoveryPlans, options?.signal);
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
        lastRejectedDoneKey = null;
        rejectedDoneStreak = 0;
        continue;
      }

      const explorationPlans = buildRejectedDoneExplorationPlans({
        task,
        currentUrl: snapshot.pageUrl,
        elements: snapshot.interactiveElements,
        attemptedClickKeys: attemptedRejectedDoneClickKeys,
      });
      if (explorationPlans.length > 0) {
        emitProgressLine(
          options,
          `[${stepNumber}] recovery | verifier rejected done, forcing exploratory click actions=${explorationPlans.length}`,
        );
        formatPlanLines(stepNumber, explorationPlans).forEach((line) => emitProgressLine(options, line));
        allPlans.push(...explorationPlans);

        const explorationExecutions = await executePlannedActions(activeTab.tabId, explorationPlans, options?.signal);
        formatExecutionLines(stepNumber, explorationExecutions).forEach((line) => emitProgressLine(options, line));
        allExecutions.push(...explorationExecutions);

        for (const plan of explorationPlans) {
          if (plan.action === 'click' && plan.index !== null) {
            attemptedRejectedDoneClickKeys.add(buildExplorationClickKey(snapshot.pageUrl, plan.index));
          }
        }

        if (!explorationExecutions.length) {
          finalStatus = 'fail';
          finalAnswer = 'Exploration recovery produced no executable actions';
          break;
        }
        lastRejectedDoneKey = null;
        rejectedDoneStreak = 0;
        continue;
      }

      allExecutions.push(verifierExecution(verification.reason));
      const doneLoopKey = buildDoneLoopKey({
        task,
        pageUrl: snapshot.pageUrl,
        meaningfulExecutionCount,
      });
      rejectedDoneStreak = (lastRejectedDoneKey === doneLoopKey) ? (rejectedDoneStreak + 1) : 1;
      lastRejectedDoneKey = doneLoopKey;
      if (rejectedDoneStreak >= DONE_LOOP_RECOVERY_THRESHOLD) {
        const stuckRecoveryPlans = buildStuckDoneRecoveryPlans({
          task,
          currentUrl: snapshot.pageUrl,
        });
        emitProgressLine(
          options,
          `[${stepNumber}] recovery | repeated done-loop detected, forcing actions=${stuckRecoveryPlans.length}`,
        );
        formatPlanLines(stepNumber, stuckRecoveryPlans).forEach((line) => emitProgressLine(options, line));
        allPlans.push(...stuckRecoveryPlans);

        const stuckRecoveryExecutions = await executePlannedActions(activeTab.tabId, stuckRecoveryPlans, options?.signal);
        formatExecutionLines(stepNumber, stuckRecoveryExecutions).forEach((line) => emitProgressLine(options, line));
        allExecutions.push(...stuckRecoveryExecutions);

        if (!stuckRecoveryExecutions.length) {
          finalStatus = 'fail';
          finalAnswer = 'Done-loop recovery produced no executable actions';
          break;
        }

        const lastStuckRecoveryExecution = stuckRecoveryExecutions[stuckRecoveryExecutions.length - 1];
        if (!lastStuckRecoveryExecution.executed && stepNumber >= AGENT_MAX_STEPS) {
          finalStatus = 'max-steps';
          finalAnswer = 'Maximum agent steps reached';
          break;
        }

        lastRejectedDoneKey = null;
        rejectedDoneStreak = 0;
        continue;
      }
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

    lastRejectedDoneKey = null;
    rejectedDoneStreak = 0;
    const plans = enforceTypingFirst(decision.decision.actions, task, decision.promptElements);
    formatPlanLines(stepNumber, plans).forEach((line) => emitProgressLine(options, line));
    allPlans.push(...plans);

    const executions = await executePlannedActions(activeTab.tabId, plans, options?.signal);
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
