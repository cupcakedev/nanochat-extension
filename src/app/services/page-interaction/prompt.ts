import type { InteractionExecutionResult, InteractiveElementSnapshotItem } from '@shared/types';

function compact(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function truncate(value: string | null | undefined, max: number): string | null {
  const normalized = compact(value);
  if (!normalized) return null;
  return normalized.length <= max ? normalized : normalized.slice(0, max);
}

function createElementLine(element: InteractiveElementSnapshotItem): string {
  const parts: string[] = [`[${element.index}] <${element.tag}>`];
  if (element.role) parts.push(`role=${truncate(element.role, 32)}`);
  if (element.inputType) parts.push(`type=${truncate(element.inputType, 32)}`);
  if (element.text) parts.push(`text="${truncate(element.text, 100)}"`);
  if (element.ariaLabel) parts.push(`aria="${truncate(element.ariaLabel, 100)}"`);
  if (element.placeholder) parts.push(`placeholder="${truncate(element.placeholder, 80)}"`);
  if (element.name) parts.push(`name="${truncate(element.name, 80)}"`);
  if (element.id) parts.push(`id="${truncate(element.id, 80)}"`);
  if (element.href) parts.push(`href="${truncate(element.href, 180)}"`);
  parts.push(`disabled=${element.disabled ? 'true' : 'false'}`);
  parts.push(`rect=${element.rect.x},${element.rect.y},${element.rect.width},${element.rect.height}`);
  return parts.join(' | ');
}

function formatHistoryLine(execution: InteractionExecutionResult, index: number): string {
  const actionParts: string[] = [execution.requestedAction];
  if (execution.requestedIndex !== null) actionParts.push(`#${execution.requestedIndex}`);
  if (execution.requestedText) actionParts.push(`"${truncate(execution.requestedText, 80)}"`);
  if (execution.requestedUrl) actionParts.push(execution.requestedUrl);
  return `${index + 1}. ${actionParts.join(' ')} => ${execution.executed ? 'ok' : 'fail'} | ${truncate(execution.message, 140) ?? ''}`;
}

function formatExecutionHistory(history: InteractionExecutionResult[]): string {
  if (!history.length) return 'none';
  return history.slice(-6).map(formatHistoryLine).join('\n');
}

export function buildInteractionPrompt(params: {
  task: string;
  stepNumber: number;
  maxSteps: number;
  pageUrl: string;
  pageTitle: string;
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
}): string {
  const elementLines = params.elements.map(createElementLine);

  return [
    'You are a browser agent planner in an execution loop.',
    'Return only minified JSON and nothing else.',
    '{"status":"continue|done|fail","finalAnswer":string|null,"reason":string|null,"actions":[{"action":"openUrl|click|type|done|unknown","index":number|null,"text":string|null,"url":string|null,"reason":string|null,"confidence":"high|medium|low"}]}.',
    'Goal: complete the user task safely and efficiently.',
    'Be skeptical: default status=continue. Use status=done only with explicit final-state evidence on current page.',
    'Never claim done from assumption, intent, or partial progress.',
    'Status rules: done when all task requirements are already satisfied now; fail only when truly blocked/impossible; otherwise continue with 1-4 actions.',
    'Navigation rules: for open/go/watch tasks, done only when Current URL already matches target destination.',
    'If finalAnswer/reason has a URL different from Current URL, status must be continue and actions must start with openUrl to that URL.',
    'Homepage/search/category/placeholder pages are usually intermediate unless user explicitly requested them.',
    'If indexed interactive elements are empty and task is not complete, choose openUrl as first recovery action.',
    'Interpret intent language-agnostically.',
    'Actions execute in listed order.',
    'openUrl: global navigation, absolute http/https URL, use when destination is known or inferable.',
    'click: only indexed interactive elements; do not substitute click for direct navigation when openUrl is available.',
    'type: only indexed editable element with non-empty text.',
    'done: only when final completion is visible now.',
    'unknown: only when no safe actionable step exists.',
    'Use click/type only with valid index values.',
    'Never choose disabled=true targets.',
    'Do not repeat unchanged failed actions.',
    `Task: ${params.task}`,
    `Loop step: ${params.stepNumber}/${params.maxSteps}`,
    `Current URL: ${params.pageUrl}`,
    `Current title: ${params.pageTitle}`,
    `Recent execution history:\n${formatExecutionHistory(params.history)}`,
    'Indexed interactive elements:',
    elementLines.join('\n'),
  ].join('\n\n');
}
