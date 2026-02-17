import type { InteractionExecutionResult, InteractiveElementSnapshotItem } from '@shared/types';
import type { PlannerStrategyHints } from './run-step-types';

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

function normalizeComparable(value: string | null | undefined): string | null {
  const normalized = compact(value);
  return normalized ? normalized.toLowerCase() : null;
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeTextContent(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildOpeningTag(element: InteractiveElementSnapshotItem, innerContent: string): string {
  const attributes: string[] = [];
  if (element.role) attributes.push(`role="${escapeAttribute(truncate(element.role, 32) ?? '')}"`);
  if (element.inputType)
    attributes.push(`type="${escapeAttribute(truncate(element.inputType, 32) ?? '')}"`);
  const ariaValue = truncate(element.ariaLabel, 120);
  if (
    ariaValue &&
    normalizeComparable(ariaValue) !== normalizeComparable(truncate(innerContent, 120))
  ) {
    attributes.push(`aria="${escapeAttribute(ariaValue)}"`);
  }
  if (element.placeholder)
    attributes.push(`placeholder="${escapeAttribute(truncate(element.placeholder, 80) ?? '')}"`);
  if (element.name) attributes.push(`name="${escapeAttribute(truncate(element.name, 80) ?? '')}"`);
  if (element.id) attributes.push(`id="${escapeAttribute(truncate(element.id, 80) ?? '')}"`);
  if (element.href) attributes.push(`href="${escapeAttribute(truncate(element.href, 180) ?? '')}"`);
  return attributes.length > 0 ? `<${element.tag} ${attributes.join(' ')}>` : `<${element.tag}>`;
}

function getInnerContent(element: InteractiveElementSnapshotItem): string {
  return (
    truncate(element.text, 120) ??
    truncate(element.ariaLabel, 120) ??
    truncate(element.placeholder, 80) ??
    truncate(element.name, 80) ??
    truncate(element.id, 80) ??
    truncate(element.href, 120) ??
    element.tag
  );
}

function createElementLine(element: InteractiveElementSnapshotItem): string {
  const innerContent = getInnerContent(element);
  const openingTag = buildOpeningTag(element, innerContent);
  const content = escapeTextContent(innerContent);
  return `[${element.index}] ${openingTag}${content}</${element.tag}>`;
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
  strategyHints?: PlannerStrategyHints;
}): string {
  const elementLines = params.elements.map(createElementLine);
  const strategyConstraints =
    params.strategyHints?.constraints.length && params.strategyHints.constraints.length > 0
      ? params.strategyHints.constraints
          .map((constraint, index) => `${index + 1}. ${constraint}`)
          .join('\n')
      : 'none';
  const strategySection = params.strategyHints
    ? [
        'Planner strategy state:',
        `Previous goal evaluation: ${params.strategyHints.evaluationPreviousGoal}`,
        `Working memory: ${params.strategyHints.memory}`,
        `Next goal: ${params.strategyHints.nextGoal}`,
        `Hard constraints:\n${strategyConstraints}`,
      ]
    : [];

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
    'Do not repeat failed actions unchanged.',
    'If no indexed interactive elements are available and the task is not complete, use openUrl to navigate.',
    `Task: ${params.task}`,
    `Loop step: ${params.stepNumber}/${params.maxSteps}`,
    `Current URL: ${params.pageUrl}`,
    `Current title: ${params.pageTitle}`,
    `Scroll position: ${params.scrollY}px (viewport height: ${params.viewportHeight}px)`,
    `Recent execution history:\n${formatExecutionHistory(params.history)}`,
    ...strategySection,
    'Indexed interactive elements:',
    elementLines.join('\n'),
  ].join('\n\n');
}
