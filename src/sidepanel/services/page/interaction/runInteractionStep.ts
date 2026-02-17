import {
  clearHighlights,
  getActiveTab,
  getTabById,
  getInteractionSnapshot,
  openExtensionPageInTab,
  waitForTabSettled,
} from '@sidepanel/services/page/tab-bridge';
import type {
  InteractionActionPlan,
  InteractionCompletionVerification,
  InteractionExecutionResult,
  InteractionRunStatus,
  InteractionSnapshotPayload,
  PageInteractionStepResult,
} from '@shared/types';
import { captureStackedViewport } from './capture';
import { enforceTypingFirst } from './guards';
import { estimateTokens, resetInteractionPromptSessions, warmInteractionPromptSessions } from './prompt-api';
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
  INTERACTION_SNAPSHOT_MAX_ELEMENTS,
  INTERACTION_TAB_SETTLE_IDLE_MS,
  INTERACTION_TAB_SETTLE_MAX_WAIT_MS,
  INTERACTION_TAB_SETTLE_POLL_MS,
} from './constants';
import { requestPlannerDecision } from './run-step-planner';
import {
  buildDoneLoopKey,
  buildDoneStatusNavigationPlans,
  buildExplorationClickKey,
  buildRejectedDoneExplorationPlans,
  buildRejectedDoneRecoveryPlans,
  buildStuckDoneRecoveryPlans,
  buildVerificationCacheKey,
  countMeaningfulExecutions,
  DONE_LOOP_RECOVERY_THRESHOLD,
} from './run-step-recovery';
import { executePlannedActions, verifierExecution } from './run-step-executor';
import { resolveCompletion } from './run-step-result';
import {
  applyStrategyPlanGuard,
  buildPlannerStrategyHints,
  createInteractionStrategyState,
  updateInteractionStrategyState,
} from './run-step-strategy';
import {
  buildSyntheticSnapshot,
  emitProgressLine,
  extractErrorMessage,
  isAbortError,
  isContentConnectionUnavailableError,
  isSameDestination,
  normalizeInstruction,
  throwIfAborted,
} from './run-step-utils';
import type { InteractionRunOptions, PromptDecisionResult } from './run-step-types';
import type { PlannerModelMemorySnapshot } from './run-step-types';

export type {
  InteractionProgressEvent,
  InteractionProgressLineEvent,
  InteractionProgressScreenshotEvent,
} from './run-step-types';
export type { InteractionRunOptions };

const AGENT_MAX_STEPS = 12;
const AGENT_VIEWPORT_SEGMENTS = 1;
const AGENT_PLACEHOLDER_PAGE_PATH = 'src/placeholder.html';

function compactMemoryValue(value: string, maxChars: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars)}...`;
}

function toMemoryTimelineLine(
  stepNumber: number,
  pageUrl: string,
  state: PlannerModelMemorySnapshot,
): string {
  return [
    `step=${stepNumber}`,
    `url=${pageUrl}`,
    `eval=${compactMemoryValue(state.evaluationPreviousGoal, 120)}`,
    `memory=${compactMemoryValue(state.memory, 180)}`,
    `next=${compactMemoryValue(state.nextGoal, 120)}`,
  ].join(' | ');
}

export async function runPageInteractionStep(
  userInstruction: string,
  options?: InteractionRunOptions,
): Promise<PageInteractionStepResult> {
  throwIfAborted(options?.signal);
  resetInteractionPromptSessions();
  try {
    await warmInteractionPromptSessions();
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
    let plannerMemoryState: PlannerModelMemorySnapshot | null = null;
    const plannerMemoryTimeline: string[] = [];
    const verificationCache = new Map<string, InteractionCompletionVerification>();
    const attemptedRejectedDoneClickKeys = new Set<string>();
    let lastRejectedDoneKey: string | null = null;
    let rejectedDoneStreak = 0;
    const strategyState = createInteractionStrategyState(task);

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
    const snapshotOptions = {
      maxElements: INTERACTION_SNAPSHOT_MAX_ELEMENTS,
      viewportOnly: true,
      viewportSegments: AGENT_VIEWPORT_SEGMENTS,
    } as const;
    try {
      snapshot = await getInteractionSnapshot(activeTab.tabId, snapshotOptions);
      const baseViewportHeight = Math.max(
        1,
        Math.round(snapshot.viewportHeight / AGENT_VIEWPORT_SEGMENTS),
      );
      capture = await captureStackedViewport({
        windowId: activeTab.windowId,
        tabId: activeTab.tabId,
        baseScrollY: snapshot.scrollY,
        viewportHeight: baseViewportHeight,
        viewportSegments: AGENT_VIEWPORT_SEGMENTS,
        settleMs: INTERACTION_CAPTURE_SETTLE_MS,
      });
      if (
        capture.capturedScrollTop !== null &&
        Math.abs(capture.capturedScrollTop - snapshot.scrollY) > 1
      ) {
        snapshot = await getInteractionSnapshot(activeTab.tabId, snapshotOptions);
      }
      throwIfAborted(options?.signal);
    } catch (error) {
      if (isAbortError(error)) throw error;
      if (!isContentConnectionUnavailableError(error)) throw error;

      const placeholderUrl = chrome.runtime.getURL(AGENT_PLACEHOLDER_PAGE_PATH);
      if (!isSameDestination(activeTab.url, placeholderUrl)) {
        const placeholderOpenResult = await openExtensionPageInTab(
          activeTab.tabId,
          AGENT_PLACEHOLDER_PAGE_PATH,
        );
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

    emitProgressLine(
      options,
      formatObserveLine(stepNumber, snapshot.pageUrl, snapshot.interactiveElements.length),
    );
    updateInteractionStrategyState(strategyState, snapshot);
    lastPageUrl = snapshot.pageUrl;
    lastPageTitle = snapshot.pageTitle;
    const scrollContext = {
      scrollY: snapshot.scrollY,
      viewportHeight: snapshot.viewportHeight,
    };
    const strategyHints = buildPlannerStrategyHints(strategyState, snapshot, allExecutions);

    const decision = await requestPlannerDecision({
      task,
      stepNumber,
      maxSteps: AGENT_MAX_STEPS,
      pageUrl: snapshot.pageUrl,
      pageTitle: snapshot.pageTitle,
      scrollY: snapshot.scrollY,
      viewportHeight: snapshot.viewportHeight,
      history: allExecutions,
      elements: snapshot.interactiveElements,
      modelMemoryState: plannerMemoryState,
      modelMemoryTimeline: plannerMemoryTimeline,
      strategyHints,
      baseCanvas: capture.canvas,
      viewport: { width: snapshot.viewportWidth, height: snapshot.viewportHeight },
      onProgress: options?.onProgress,
      signal: options?.signal,
    });
    plannerMemoryState = decision.decision.currentState;
    const memoryLine = toMemoryTimelineLine(
      stepNumber,
      snapshot.pageUrl,
      decision.decision.currentState,
    );
    const lastMemoryLine =
      plannerMemoryTimeline.length > 0 ? plannerMemoryTimeline[plannerMemoryTimeline.length - 1] : null;
    if (memoryLine !== lastMemoryLine) {
      plannerMemoryTimeline.push(memoryLine);
      if (plannerMemoryTimeline.length > 12) {
        plannerMemoryTimeline.splice(0, plannerMemoryTimeline.length - 12);
      }
    }

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
        formatPlanLines(stepNumber, doneStatusRecoveryPlans).forEach((line) =>
          emitProgressLine(options, line),
        );
        allPlans.push(...doneStatusRecoveryPlans);

        const doneStatusRecoveries = await executePlannedActions(
          activeTab.tabId,
          doneStatusRecoveryPlans,
          scrollContext,
          options?.signal,
        );
        formatExecutionLines(stepNumber, doneStatusRecoveries).forEach((line) =>
          emitProgressLine(options, line),
        );
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
        emitProgressLine(
          options,
          formatVerificationRawLine(stepNumber, verificationResult.rawOutput),
        );
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
        formatPlanLines(stepNumber, recoveryPlans).forEach((line) =>
          emitProgressLine(options, line),
        );
        allPlans.push(...recoveryPlans);

        const recoveryExecutions = await executePlannedActions(
          activeTab.tabId,
          recoveryPlans,
          scrollContext,
          options?.signal,
        );
        formatExecutionLines(stepNumber, recoveryExecutions).forEach((line) =>
          emitProgressLine(options, line),
        );
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
        formatPlanLines(stepNumber, explorationPlans).forEach((line) =>
          emitProgressLine(options, line),
        );
        allPlans.push(...explorationPlans);

        const explorationExecutions = await executePlannedActions(
          activeTab.tabId,
          explorationPlans,
          scrollContext,
          options?.signal,
        );
        formatExecutionLines(stepNumber, explorationExecutions).forEach((line) =>
          emitProgressLine(options, line),
        );
        allExecutions.push(...explorationExecutions);

        for (const plan of explorationPlans) {
          if (plan.action === 'click' && plan.index !== null) {
            attemptedRejectedDoneClickKeys.add(
              buildExplorationClickKey(snapshot.pageUrl, plan.index),
            );
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
      rejectedDoneStreak = lastRejectedDoneKey === doneLoopKey ? rejectedDoneStreak + 1 : 1;
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
        formatPlanLines(stepNumber, stuckRecoveryPlans).forEach((line) =>
          emitProgressLine(options, line),
        );
        allPlans.push(...stuckRecoveryPlans);

        const stuckRecoveryExecutions = await executePlannedActions(
          activeTab.tabId,
          stuckRecoveryPlans,
          scrollContext,
          options?.signal,
        );
        formatExecutionLines(stepNumber, stuckRecoveryExecutions).forEach((line) =>
          emitProgressLine(options, line),
        );
        allExecutions.push(...stuckRecoveryExecutions);

        if (!stuckRecoveryExecutions.length) {
          finalStatus = 'fail';
          finalAnswer = 'Done-loop recovery produced no executable actions';
          break;
        }

        const lastStuckRecoveryExecution =
          stuckRecoveryExecutions[stuckRecoveryExecutions.length - 1];
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
    const strategyAdjustedPlans = applyStrategyPlanGuard({
      state: strategyState,
      snapshot,
      plans: decision.decision.actions,
      history: allExecutions,
    });
    if (strategyAdjustedPlans !== decision.decision.actions) {
      emitProgressLine(
        options,
        `[${stepNumber}] strategy | no progress detected, switched to focused navigation plan`,
      );
    }
    const plans = enforceTypingFirst(strategyAdjustedPlans, task, decision.promptElements);
    formatPlanLines(stepNumber, plans).forEach((line) => emitProgressLine(options, line));
    allPlans.push(...plans);

    const executions = await executePlannedActions(
      activeTab.tabId,
      plans,
      scrollContext,
      options?.signal,
    );
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

    const completion = resolveCompletion(
      finalStatus,
      lastDecision.decision,
      allExecutions,
      finalAnswer,
    );
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
        plannerMemoryState,
        plannerMemoryTimeline,
      },
      captureMeta: {
        imageWidth: lastDecision.imageWidth,
        imageHeight: lastDecision.imageHeight,
        elementCount: lastElementCount,
        promptElementCount: lastPromptElementCount,
        retryCount: totalRetries,
      },
    };
  } finally {
    resetInteractionPromptSessions();
  }
}
