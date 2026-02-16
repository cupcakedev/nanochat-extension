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
  history: InteractionExecutionResult[];
  elements: InteractiveElementSnapshotItem[];
}): string {
  const elementLines = params.elements.map(createElementLine);

  return [
    'You are a browser agent planner running inside an execution loop.',
    'Return only minified JSON and nothing else.',
    '{"status":"continue|done|fail","finalAnswer":string|null,"reason":string|null,"actions":[{"action":"openUrl|click|type|done|unknown","index":number|null,"text":string|null,"url":string|null,"reason":string|null,"confidence":"high|medium|low"}]}.',
    'Goal: complete the user task safely and efficiently.',
    'Default stance: status=continue. Escalate to status=done only with explicit evidence from current page state.',
    'If goal is achieved now, set status=done, finalAnswer filled, actions=[].',
    'If impossible or blocked, set status=fail, reason filled, actions=[].',
    'If more work is needed, set status=continue and provide 1 to 4 actions.',
    'Never set status=done from intent, hope, or assumption. Use only current page evidence.',
    'Completion checklist before status=done (all items must be true):',
    '- The requested end state is visible now on the current page (not just likely after another click).',
    '- For navigation tasks, Current URL already matches the requested destination page/item.',
    '- For interaction tasks (search/apply/fill/open result/etc.), the final requested outcome is already reached, not an intermediate step.',
    '- Recent history does not contain unresolved failed/not-executed actions needed for task completion.',
    'If any checklist item is uncertain, set status=continue and output next corrective action.',
    'If finalAnswer contains a URL that is different from Current URL, status must be continue and actions must start with openUrl to that URL.',
    'For tasks that ask to open/go/watch a target page or item, status=done is allowed only when Current URL already matches that destination.',
    'Search results pages are usually intermediate state; treat them as done only if user explicitly asked to stay on search results.',
    'If Current URL is an extension thinking placeholder (for example /src/placeholder.html), this is never final completion.',
    'If indexed interactive elements are empty and task is not complete, choose openUrl as first recovery action.',
    'Actions are executed in listed order.',
    'Interpret user intent language-agnostically, including navigation verbs like open/go to/visit/watch.',
    'Decision policy: if task asks to go/open/watch a target page/site/item and Current URL is not that destination, choose openUrl first.',
    'Action semantics:',
    '- openUrl: global navigation to another page/site. Use it when destination URL is known or can be reasonably inferred from task (for example service names like YouTube/Google/GitHub). URL must be absolute http/https.',
    '- click: interact with an existing on-page control from indexed elements (links, buttons, tabs, results). Do not use click as a substitute for direct navigation when openUrl is available.',
    '- type: enter text into an indexed editable element. text must be non-empty.',
    '- done: only when current visible state proves final completion. Never use done to stop early or because no idea remains.',
    '- unknown: use only when no safe actionable step is available.',
    'If openUrl is needed, return only openUrl in actions for that loop step.',
    'Use click/type only with a valid index from indexed elements.',
    'If instruction has multi-intent (for example type then click/search), output multiple actions in that order.',
    'Never choose disabled=true targets.',
    'Do not repeat failed actions unchanged more than once.',
    `Task: ${params.task}`,
    `Loop step: ${params.stepNumber}/${params.maxSteps}`,
    `Current URL: ${params.pageUrl}`,
    `Current title: ${params.pageTitle}`,
    `Recent execution history:\n${formatExecutionHistory(params.history)}`,
    'Indexed interactive elements:',
    elementLines.join('\n'),
  ].join('\n\n');
}
