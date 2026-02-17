import { createLogger } from '@shared/utils';
import { buildInteractionPrompt } from './prompt';
import { parseInteractionDecision } from './parser';
import { annotateInteractionCanvas } from './annotate-canvas';
import { isInputTooLargeError, isPromptTimeoutError, runTextImagePrompt } from './prompt-api';
import {
  INTERACTION_PROMPT_MAX_RETRY_ATTEMPTS,
  INTERACTION_PROMPT_RETRY_SHRINK_FACTOR,
} from './constants';
import type { PlannerRequestParams, PromptDecisionResult } from './run-step-types';
import {
  emitProgressLine,
  emitProgressScreenshot,
  extractErrorMessage,
  isAbortError,
  throwIfAborted,
} from './run-step-utils';

const logger = createLogger('interaction-step:planner');

function nextPromptElementLimit(current: number): number {
  return Math.floor(current * INTERACTION_PROMPT_RETRY_SHRINK_FACTOR);
}

function mustStopRetrying(current: number, next: number): boolean {
  return next < 6 || next >= current;
}

export async function requestPlannerDecision(
  params: PlannerRequestParams,
): Promise<PromptDecisionResult> {
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
      scrollY: params.scrollY,
      viewportHeight: params.viewportHeight,
      history: params.history,
      elements: promptElements,
      strategyHints: params.strategyHints,
    });
    const annotatedCanvas = annotateInteractionCanvas(
      params.baseCanvas,
      promptElements,
      params.viewport,
    );
    const emittedScreenshot = emitProgressScreenshot(
      params.onProgress,
      params.stepNumber,
      annotatedCanvas,
    );

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
          { onProgress: params.onProgress, signal: params.signal },
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

  throw lastError instanceof Error ? lastError : new Error('Prompt API request failed');
}
