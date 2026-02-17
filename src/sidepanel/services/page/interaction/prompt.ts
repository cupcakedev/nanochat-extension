import type { InteractionExecutionResult, InteractiveElementSnapshotItem } from '@shared/types';
import type { PlannerModelMemorySnapshot, PlannerStrategyHints } from './run-step-types';

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
  return history.slice(-4).map(formatHistoryLine).join('\n');
}

function formatModelMemoryTimeline(timeline: string[]): string {
  if (!timeline.length) return 'none';
  return timeline.slice(-3).map((line, index) => `${index + 1}. ${line}`).join('\n');
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
  modelMemoryState: PlannerModelMemorySnapshot | null;
  modelMemoryTimeline: string[];
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
        'Strategy:',
        `Eval: ${params.strategyHints.evaluationPreviousGoal}`,
        `Memory: ${params.strategyHints.memory}`,
        `Next: ${params.strategyHints.nextGoal}`,
        `Constraints:\n${strategyConstraints}`,
      ]
    : [];
  const memoryState = params.modelMemoryState ?? {
    evaluationPreviousGoal: 'Unknown - first planner step for this run.',
    memory: 'No long-term memory recorded yet.',
    nextGoal: 'Find the most direct safe action.',
  };

  return [
    'Output only minified JSON matching this shape:',
    '{"thinking":string,"status":"continue|done|fail","finalAnswer":string|null,"reason":string|null,"currentState":{"evaluationPreviousGoal":string,"memory":string,"nextGoal":string},"actions":[{"action":"openUrl|click|type|scrollDown|scrollUp|done|unknown","index":number|null,"text":string|null,"url":string|null,"reason":string|null,"confidence":"high|medium|low"}]}',
    'thinking should be factual and action-oriented (1-3 short sentences).',
    'Set status=done as soon as the minimal user objective is satisfied by current page evidence.',
    'Do not continue exploratory navigation after completion unless the task explicitly asks for multiple results/iterations.',
    'Use status=continue only when a concrete unmet requirement remains.',
    `Task: ${params.task}`,
    `Step: ${params.stepNumber}/${params.maxSteps}`,
    `URL: ${params.pageUrl}`,
    `Title: ${params.pageTitle}`,
    `Scroll: ${params.scrollY}px (vh ${params.viewportHeight}px)`,
    `Recent history:\n${formatExecutionHistory(params.history)}`,
    'Previous memory state:',
    `evalPrev: ${memoryState.evaluationPreviousGoal}`,
    `memory: ${memoryState.memory}`,
    `nextGoal: ${memoryState.nextGoal}`,
    `Memory timeline:\n${formatModelMemoryTimeline(params.modelMemoryTimeline)}`,
    ...strategySection,
    'Indexed elements:',
    elementLines.join('\n'),
  ].join('\n');
}
