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
  scrollY: number;
  viewportHeight: number;
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
}): string {
  const elementLines = params.elements.map(createElementLine);

  return [
    'You are a browser agent planner running inside an execution loop.',
    'Return only minified JSON and nothing else.',
    '{"status":"continue|done|fail","finalAnswer":string|null,"reason":string|null,"actions":[{"action":"openUrl|click|type|scrollDown|scrollUp|done|unknown","index":number|null,"text":string|null,"url":string|null,"reason":string|null,"confidence":"high|medium|low"}]}.',
    'Goal: complete the user task safely and efficiently.',
    'If the goal is fully achieved on the current page, set status=done with finalAnswer filled.',
    'If the task is impossible or blocked, set status=fail with reason filled.',
    'If more work is needed, set status=continue and provide 1 to 4 actions.',
    'Never set status=done from intent or assumption alone. Use current page evidence.',
    'For open/go/watch tasks, status=done only when Current URL already matches the target destination.',
    'If finalAnswer contains a URL different from Current URL, status must be continue and actions must include a concrete navigation step.',
    'Actions are executed in listed order.',
    'Prefer click on a visible indexed element when a matching destination link/control is already present on the current page.',
    'Use openUrl with an absolute http/https URL only when no suitable indexed element can reach that destination.',
    'Use click with a valid index from the indexed elements list to interact with buttons, links, and other controls on the page.',
    'Use type with a valid index and non-empty text to fill input fields.',
    'If the instruction has multi-intent (for example type then click/search), output multiple actions in that order.',
    'Use scrollDown to scroll the page down by one viewport height to reveal more content or elements.',
    'Use scrollUp to scroll back up. Neither requires an index.',
    'Use click/type only with valid index values from the elements list below.',
    'Never choose disabled=true targets.',
    'Do not repeat failed actions unchanged.',
    'If no indexed interactive elements are available and the task is not complete, use openUrl to navigate.',
    `Task: ${params.task}`,
    `Loop step: ${params.stepNumber}/${params.maxSteps}`,
    `Current URL: ${params.pageUrl}`,
    `Current title: ${params.pageTitle}`,
    `Scroll position: ${params.scrollY}px (viewport height: ${params.viewportHeight}px)`,
    `Recent execution history:\n${formatExecutionHistory(params.history)}`,
    'Indexed interactive elements:',
    elementLines.join('\n'),
  ].join('\n\n');
}
