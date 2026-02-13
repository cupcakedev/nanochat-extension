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
  return history.slice(-10).map(formatHistoryLine).join('\n');
}

export function buildInteractionPrompt(params: {
  task: string;
  stepNumber: number;
  maxSteps: number;
  pageUrl: string;
  pageTitle: string;
  pageContentExcerpt: string;
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
}): string {
  const elementLines = params.elements.map(createElementLine);

  return [
    'You are a browser agent planner running inside an execution loop.',
    'Return only minified JSON and nothing else.',
    '{"status":"continue|done|fail","finalAnswer":string|null,"reason":string|null,"actions":[{"action":"openUrl|click|type|done|unknown","index":number|null,"text":string|null,"url":string|null,"reason":string|null,"confidence":"high|medium|low"}]}.',
    'Goal: complete the user task safely and efficiently.',
    'If goal is achieved now, set status=done, finalAnswer filled, actions=[].',
    'If impossible or blocked, set status=fail, reason filled, actions=[].',
    'If more work is needed, set status=continue and provide 1 to 4 actions.',
    'Actions are executed in listed order.',
    'Use openUrl with absolute http/https URL for navigation.',
    'If openUrl is needed, return only openUrl in actions for that loop step.',
    'Use click only with a valid index from indexed elements.',
    'Use type only with a valid index and non-empty text.',
    'If instruction has multi-intent (for example type then click/search), output multiple actions in that order.',
    'Never choose disabled=true targets.',
    'Do not repeat failed actions unchanged more than once.',
    `Task: ${params.task}`,
    `Loop step: ${params.stepNumber}/${params.maxSteps}`,
    `Current URL: ${params.pageUrl}`,
    `Current title: ${params.pageTitle}`,
    `Recent execution history:\n${formatExecutionHistory(params.history)}`,
    `Visible page text excerpt:\n${params.pageContentExcerpt || 'none'}`,
    'Indexed interactive elements:',
    elementLines.join('\n'),
  ].join('\n\n');
}
