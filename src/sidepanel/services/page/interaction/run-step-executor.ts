import {
  executeAction,
  openUrlInTab,
  setInteractionScroll,
} from '@sidepanel/services/page/tab-bridge';
import type { InteractionActionPlan, InteractionExecutionResult } from '@shared/types';
import type { ExecutableInteractionPlan, ScrollContext } from './run-step-types';
import { isAbortError, throwIfAborted } from './run-step-utils';

function isExecutableAction(plan: InteractionActionPlan): plan is ExecutableInteractionPlan {
  return (plan.action === 'click' || plan.action === 'type') && plan.index !== null;
}

function fallbackExecution(
  plan: InteractionActionPlan,
  message: string,
): InteractionExecutionResult {
  return {
    requestedAction: plan.action,
    requestedIndex: plan.index,
    requestedText: plan.text,
    requestedUrl: plan.url,
    executed: false,
    message,
  };
}

export function verifierExecution(reason: string): InteractionExecutionResult {
  return {
    requestedAction: 'unknown',
    requestedIndex: null,
    requestedText: null,
    requestedUrl: null,
    executed: false,
    message: `Verifier rejected completion: ${reason}`,
  };
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

function toExecutionFromOpenUrl(
  plan: InteractionActionPlan,
  finalUrl: string,
): InteractionExecutionResult {
  return {
    requestedAction: plan.action,
    requestedIndex: null,
    requestedText: null,
    requestedUrl: finalUrl,
    executed: true,
    message: `Opened ${finalUrl}`,
  };
}

function toExecutionFromScroll(
  plan: InteractionActionPlan,
  scrollTop: number,
): InteractionExecutionResult {
  return {
    requestedAction: plan.action,
    requestedIndex: null,
    requestedText: null,
    requestedUrl: null,
    executed: true,
    message: `Scrolled to ${scrollTop}px`,
  };
}

async function executeSinglePlan(
  tabId: number,
  plan: InteractionActionPlan,
  scrollContext: ScrollContext,
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

  if (plan.action === 'scrollDown' || plan.action === 'scrollUp') {
    const delta =
      plan.action === 'scrollDown' ? scrollContext.viewportHeight : -scrollContext.viewportHeight;
    const targetTop = Math.max(0, scrollContext.scrollY + delta);
    const actualTop = await setInteractionScroll(tabId, targetTop);
    scrollContext.scrollY = actualTop;
    return toExecutionFromScroll(plan, actualTop);
  }

  if (isExecutableAction(plan)) {
    throwIfAborted(signal);
    const response = await executeAction(
      tabId,
      plan.action,
      plan.index,
      plan.action === 'type' ? (plan.text ?? '') : null,
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

export async function executePlannedActions(
  tabId: number,
  plans: InteractionActionPlan[],
  scrollContext: ScrollContext,
  signal?: AbortSignal,
): Promise<InteractionExecutionResult[]> {
  const executions: InteractionExecutionResult[] = [];

  for (const plan of plans) {
    throwIfAborted(signal);
    const execution = await executeSinglePlan(tabId, plan, scrollContext, signal);
    executions.push(execution);
    if (shouldStopAfterExecution(execution)) break;
  }

  return executions;
}
