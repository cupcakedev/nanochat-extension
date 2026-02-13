import type { InteractionActionPlan, InteractionExecutionResult, PageInteractionStepResult } from '@shared/types';

function formatAction(plan: InteractionActionPlan): string {
  const parts: string[] = [plan.action];
  if (plan.index !== null) parts.push(`#${plan.index}`);
  if (plan.text) parts.push(`"${plan.text}"`);
  return parts.join(' ');
}

function formatExecutionStatus(execution: InteractionExecutionResult): string {
  return execution.executed ? 'executed' : 'not executed';
}

function formatStepLine(stepNumber: number, plan: InteractionActionPlan, execution: InteractionExecutionResult | undefined): string {
  if (!execution) {
    return `${stepNumber}. ${formatAction(plan)} | pending`;
  }

  return `${stepNumber}. ${formatAction(plan)} | ${formatExecutionStatus(execution)} | ${execution.message}`;
}

function formatCaptureMeta(result: PageInteractionStepResult): string {
  const { imageWidth, imageHeight, elementCount, promptElementCount, retryCount } = result.captureMeta;
  return `${imageWidth}x${imageHeight}, indexed ${elementCount}, prompted ${promptElementCount}, retries ${retryCount}`;
}

function formatReason(plans: InteractionActionPlan[]): string {
  const reasons = plans.map((plan) => plan.reason).filter((value): value is string => Boolean(value));
  return reasons[0] ?? 'No reason provided';
}

function formatConfidence(plans: InteractionActionPlan[]): string {
  const values = plans.map((plan) => plan.confidence);
  if (!values.length) return 'low';
  if (values.includes('high')) return 'high';
  if (values.includes('medium')) return 'medium';
  return 'low';
}

function formatStepSummary(result: PageInteractionStepResult): string {
  return result.plans.map((plan, index) => formatStepLine(index + 1, plan, result.executions[index])).join('\n');
}

export function formatInteractionAssistantMessage(result: PageInteractionStepResult): string {
  const executedCount = result.executions.filter((execution) => execution.executed).length;
  return [
    `Actions: ${result.plans.length}`,
    `Executed: ${executedCount}/${result.executions.length}`,
    'Steps:',
    formatStepSummary(result),
    `Reason: ${formatReason(result.plans)}`,
    `Confidence: ${formatConfidence(result.plans)}`,
    `Capture: ${formatCaptureMeta(result)}`,
  ].join('\n');
}

export function extractInteractionUsage(result: PageInteractionStepResult): { used: number; total: number } | undefined {
  const used = result.debugInput.sessionInputUsageAfter ?? result.debugInput.sessionInputUsageBefore;
  const total = result.debugInput.sessionInputQuota;
  if (used === null || total === null) return undefined;
  return { used, total };
}
