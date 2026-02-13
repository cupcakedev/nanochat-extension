import type { InteractionActionPlan, InteractionExecutionResult, PageInteractionStepResult } from '@shared/types';

function formatAction(plan: InteractionActionPlan): string {
  const parts: string[] = [plan.action];
  if (plan.index !== null) parts.push(`#${plan.index}`);
  if (plan.text) parts.push(`"${plan.text}"`);
  if (plan.url) parts.push(plan.url);
  return parts.join(' ');
}

function formatExecutionStatus(execution: InteractionExecutionResult): string {
  return execution.executed ? 'executed' : 'not executed';
}

function formatStepLine(stepNumber: number, plan: InteractionActionPlan, execution: InteractionExecutionResult | undefined): string {
  if (!execution) return `${stepNumber}. ${formatAction(plan)} | pending`;
  return `${stepNumber}. ${formatAction(plan)} | ${formatExecutionStatus(execution)} | ${execution.message}`;
}

function formatCaptureMeta(result: PageInteractionStepResult): string {
  const { imageWidth, imageHeight, elementCount, promptElementCount, retryCount } = result.captureMeta;
  return `${imageWidth}x${imageHeight}, indexed ${elementCount}, prompted ${promptElementCount}, retries ${retryCount}`;
}

function formatStepSummary(result: PageInteractionStepResult): string {
  if (!result.plans.length) return 'No executed actions';
  return result.plans.map((plan, index) => formatStepLine(index + 1, plan, result.executions[index])).join('\n');
}

function formatFinalAnswer(result: PageInteractionStepResult): string {
  return result.finalAnswer ?? 'No final answer';
}

function formatVerification(result: PageInteractionStepResult): string {
  if (!result.verification) return 'n/a';
  const label = result.verification.complete ? 'passed' : 'failed';
  return `${label} (${result.verification.confidence}) - ${result.verification.reason}`;
}

export function formatInteractionAssistantMessage(result: PageInteractionStepResult): string {
  const executedCount = result.executions.filter((execution) => execution.executed).length;
  return [
    `Status: ${result.status}`,
    `Actions: ${result.plans.length}`,
    `Executed: ${executedCount}/${result.executions.length}`,
    'Steps:',
    formatStepSummary(result),
    `Verification: ${formatVerification(result)}`,
    `Result: ${formatFinalAnswer(result)}`,
    `Capture: ${formatCaptureMeta(result)}`,
  ].join('\n');
}

export function extractInteractionUsage(result: PageInteractionStepResult): { used: number; total: number } | undefined {
  const used = result.debugInput.sessionInputUsageAfter ?? result.debugInput.sessionInputUsageBefore;
  const total = result.debugInput.sessionInputQuota;
  if (used === null || total === null) return undefined;
  return { used, total };
}
