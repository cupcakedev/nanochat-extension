import { getActiveTab, getInteractionSnapshot, executeAction, clearHighlights } from '@app/services/tab-bridge';
import type {
  ExecutableInteractionAction,
  InteractionActionPlan,
  InteractiveElementSnapshotItem,
  PageInteractionStepResult,
} from '@shared/types';
import { buildInteractionPrompt } from './prompt';
import { parseInteractionAction } from './parser';
import { captureVisibleViewport } from './capture';
import { enforceTypingFirst } from './guards';
import { estimateTokens, isInputTooLargeError, runTextImagePrompt } from './prompt-api';
import {
  INTERACTION_CAPTURE_SETTLE_MS,
  INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS,
  INTERACTION_PROMPT_RETRY_SHRINK_FACTOR,
  INTERACTION_SNAPSHOT_MAX_ELEMENTS,
} from './constants';

interface PromptPlanResult {
  plan: InteractionActionPlan;
  rawResponse: string;
  prompt: string;
  promptElements: InteractiveElementSnapshotItem[];
  retryCount: number;
  measuredInputTokens: number | null;
  sessionInputUsageBefore: number | null;
  sessionInputUsageAfter: number | null;
  sessionInputQuota: number | null;
  sessionInputQuotaRemaining: number | null;
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

function createFallbackExecutionResult(plan: InteractionActionPlan) {
  if (plan.action === 'done') {
    return {
      requestedAction: 'done' as const,
      requestedIndex: null,
      requestedText: null,
      executed: false,
      message: 'AI marked instruction as already completed',
    };
  }

  return {
    requestedAction: 'unknown' as const,
    requestedIndex: null,
    requestedText: null,
    executed: false,
    message: 'AI could not choose a safe action',
  };
}

async function executePlannedAction(tabId: number, plan: InteractionActionPlan) {
  if (!isExecutableAction(plan)) {
    await clearHighlights(tabId);
    return createFallbackExecutionResult(plan);
  }

  const response = await executeAction(
    tabId,
    plan.action,
    plan.index,
    plan.action === 'type' ? plan.text ?? '' : null,
  );

  return {
    requestedAction: plan.action,
    requestedIndex: plan.index,
    requestedText: plan.text,
    executed: response.ok,
    message: response.message,
  };
}

function nextPromptElementLimit(current: number): number {
  return Math.floor(current * INTERACTION_PROMPT_RETRY_SHRINK_FACTOR);
}

function mustStopRetrying(current: number, next: number): boolean {
  return next < 6 || next >= current;
}

async function requestActionPlan(
  pageUrl: string,
  pageTitle: string,
  instruction: string,
  elements: InteractiveElementSnapshotItem[],
  imageCanvas: HTMLCanvasElement,
): Promise<PromptPlanResult> {
  let limit = Math.max(1, elements.length);
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS; attempt += 1) {
    const promptElements = elements.slice(0, Math.max(1, limit));
    const prompt = buildInteractionPrompt({ pageUrl, pageTitle, instruction, elements: promptElements });

    try {
      const runResult = await runTextImagePrompt(prompt, imageCanvas);
      const plan = parseInteractionAction(runResult.output);
      return {
        plan,
        rawResponse: runResult.output,
        prompt,
        promptElements,
        retryCount: attempt,
        measuredInputTokens: runResult.measuredInputTokens,
        sessionInputUsageBefore: runResult.sessionInputUsageBefore,
        sessionInputUsageAfter: runResult.sessionInputUsageAfter,
        sessionInputQuota: runResult.sessionInputQuota,
        sessionInputQuotaRemaining: runResult.sessionInputQuotaRemaining,
      };
    } catch (error) {
      lastError = error;
      if (!isInputTooLargeError(error)) throw error;
      const next = nextPromptElementLimit(limit);
      if (mustStopRetrying(limit, next)) throw error;
      limit = next;
    }
  }

  throw (lastError instanceof Error ? lastError : new Error('Prompt API request failed'));
}

export async function runPageInteractionStep(userInstruction: string): Promise<PageInteractionStepResult> {
  const instruction = normalizeInstruction(userInstruction);
  const activeTab = await getActiveTab();
  const snapshot = await getInteractionSnapshot(activeTab.tabId, {
    maxElements: INTERACTION_SNAPSHOT_MAX_ELEMENTS,
    viewportOnly: true,
  });
  const capture = await captureVisibleViewport(activeTab.windowId, INTERACTION_CAPTURE_SETTLE_MS);

  try {
    const planned = await requestActionPlan(
      snapshot.pageUrl,
      snapshot.pageTitle,
      instruction,
      snapshot.interactiveElements,
      capture.canvas,
    );

    const plan = enforceTypingFirst(planned.plan, instruction, planned.promptElements);
    const execution = await executePlannedAction(activeTab.tabId, plan);

    return {
      plan,
      execution,
      rawResponse: planned.rawResponse,
      screenshotDataUrl: capture.dataUrl,
      debugInput: {
        pageUrl: snapshot.pageUrl,
        pageTitle: snapshot.pageTitle,
        instruction,
        prompt: planned.prompt,
        promptTokens: estimateTokens(planned.prompt),
        measuredInputTokens: planned.measuredInputTokens,
        sessionInputUsageBefore: planned.sessionInputUsageBefore,
        sessionInputUsageAfter: planned.sessionInputUsageAfter,
        sessionInputQuota: planned.sessionInputQuota,
        sessionInputQuotaRemaining: planned.sessionInputQuotaRemaining,
        interactiveElements: planned.promptElements,
      },
      captureMeta: {
        imageWidth: capture.canvas.width,
        imageHeight: capture.canvas.height,
        elementCount: snapshot.interactiveElements.length,
        promptElementCount: planned.promptElements.length,
        retryCount: planned.retryCount,
      },
    };
  } catch (error) {
    await clearHighlights(activeTab.tabId).catch(() => undefined);
    throw error;
  }
}
