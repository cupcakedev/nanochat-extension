import type { PageInteractionStepResult } from '@shared/types';

function formatAction(result: PageInteractionStepResult): string {
  const { action, index, text } = result.plan;
  const parts: string[] = [action];
  if (index !== null) parts.push(`#${index}`);
  if (text) parts.push(`"${text}"`);
  return parts.join(' ');
}

function formatReason(reason: string | null): string {
  return reason ?? 'No reason provided';
}

function formatCaptureMeta(result: PageInteractionStepResult): string {
  const { imageWidth, imageHeight, elementCount, promptElementCount, retryCount } = result.captureMeta;
  return `${imageWidth}x${imageHeight}, indexed ${elementCount}, prompted ${promptElementCount}, retries ${retryCount}`;
}

export function formatInteractionAssistantMessage(result: PageInteractionStepResult): string {
  const status = result.execution.executed ? 'Executed' : 'Not executed';
  return [
    `Action: ${formatAction(result)}`,
    `Status: ${status}`,
    `Execution: ${result.execution.message}`,
    `Reason: ${formatReason(result.plan.reason)}`,
    `Confidence: ${result.plan.confidence}`,
    `Capture: ${formatCaptureMeta(result)}`,
  ].join('\n');
}

export function extractInteractionUsage(result: PageInteractionStepResult): { used: number; total: number } | undefined {
  const used = result.debugInput.sessionInputUsageAfter ?? result.debugInput.sessionInputUsageBefore;
  const total = result.debugInput.sessionInputQuota;
  if (used === null || total === null) return undefined;
  return { used, total };
}
