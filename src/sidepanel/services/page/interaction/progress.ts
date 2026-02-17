import type {
  InteractionActionPlan,
  InteractionCompletionVerification,
  InteractionExecutionResult,
  InteractionRunStatus,
} from '@shared/types';

function formatAction(plan: InteractionActionPlan): string {
  const parts: string[] = [plan.action];
  if (plan.index !== null) parts.push(`#${plan.index}`);
  if (plan.text) parts.push(`"${plan.text}"`);
  if (plan.url) parts.push(plan.url);
  return parts.join(' ');
}

function formatExecution(execution: InteractionExecutionResult): string {
  const actionParts: string[] = [execution.requestedAction];
  if (execution.requestedIndex !== null) actionParts.push(`#${execution.requestedIndex}`);
  if (execution.requestedText) actionParts.push(`"${execution.requestedText}"`);
  if (execution.requestedUrl) actionParts.push(execution.requestedUrl);
  return `${actionParts.join(' ')} => ${execution.executed ? 'ok' : 'fail'} | ${execution.message}`;
}

export function formatObserveLine(
  stepNumber: number,
  pageUrl: string,
  elementCount: number,
): string {
  return `[${stepNumber}] observe | ${pageUrl} | elements=${elementCount}`;
}

export function formatPlannerLine(stepNumber: number, status: string, actionCount: number): string {
  return `[${stepNumber}] planner | status=${status} actions=${actionCount}`;
}

export function formatPlannerRawLine(stepNumber: number, raw: string): string {
  return `[${stepNumber}] planner-raw | ${raw}`;
}

export function formatPlanLines(stepNumber: number, plans: InteractionActionPlan[]): string[] {
  return plans.map((plan, index) => `[${stepNumber}] plan ${index + 1} | ${formatAction(plan)}`);
}

export function formatExecutionLines(
  stepNumber: number,
  executions: InteractionExecutionResult[],
): string[] {
  return executions.map(
    (execution, index) => `[${stepNumber}] exec ${index + 1} | ${formatExecution(execution)}`,
  );
}

export function formatVerificationLine(
  stepNumber: number,
  verification: InteractionCompletionVerification,
): string {
  const status = verification.complete ? 'complete' : 'incomplete';
  return `[${stepNumber}] verify | ${status} (${verification.confidence}) | ${verification.reason}`;
}

export function formatVerificationRawLine(stepNumber: number, raw: string): string {
  return `[${stepNumber}] verify-raw | ${raw}`;
}

export function formatFinalLine(status: InteractionRunStatus, finalAnswer: string | null): string {
  return `[final] ${status} | ${finalAnswer ?? 'no final answer'}`;
}
