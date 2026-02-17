import type {
  InteractionActionPlan,
  InteractionExecutionResult,
  InteractiveElementSnapshotItem,
} from '@shared/types';
import type { ParsedInteractionDecision } from './parser';
import type {
  DoneLoopKeyParams,
  RejectedDoneExplorationParams,
  StuckDoneRecoveryParams,
  VerificationCacheKeyParams,
} from './run-step-types';

export const DONE_LOOP_RECOVERY_THRESHOLD = 2;

const EXPLORATION_POSITIVE_KEYWORDS = [
  'similar',
  'related',
  'more',
  'shop',
  'discover',
  'collection',
  'category',
  'product',
  'items',
  'sneaker',
  'shoe',
  'men',
  'women',
  'kids',
  'next',
  'continue',
  'view',
  'details',
];

const EXPLORATION_NEGATIVE_KEYWORDS = [
  'cookie',
  'consent',
  'privacy',
  'terms',
  'accept',
  'reject',
  'close',
  'dismiss',
  'sign in',
  'login',
  'register',
  'newsletter',
  'subscribe',
  'language',
  'country',
  'region',
];

function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return value.trim();
  }
}

function isSameDestination(currentUrl: string, targetUrl: string): boolean {
  return normalizeComparableUrl(currentUrl) === normalizeComparableUrl(targetUrl);
}

function extractFirstHttpUrlCandidate(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/https?:\/\/[^\s"'<>`]+/i);
  if (!match) return null;
  try {
    return new URL(match[0]).toString();
  } catch {
    return null;
  }
}

function toRecoveryOpenUrlPlan(url: string, reason: string): InteractionActionPlan {
  return {
    action: 'openUrl',
    index: null,
    text: null,
    url,
    reason,
    confidence: 'high',
  };
}

function keepExecutableRecoveryActions(actions: InteractionActionPlan[]): InteractionActionPlan[] {
  return actions.filter(
    (action) =>
      action.action === 'openUrl' ||
      action.action === 'click' ||
      action.action === 'type' ||
      action.action === 'scrollDown' ||
      action.action === 'scrollUp',
  );
}

export function buildRejectedDoneRecoveryPlans(params: {
  currentUrl: string;
  decision: ParsedInteractionDecision;
}): InteractionActionPlan[] {
  const aiActions = keepExecutableRecoveryActions(params.decision.actions);
  if (aiActions.length > 0) return aiActions;

  const finalAnswerUrl = extractFirstHttpUrlCandidate(params.decision.finalAnswer);
  if (finalAnswerUrl && !isSameDestination(params.currentUrl, finalAnswerUrl)) {
    return [
      toRecoveryOpenUrlPlan(
        finalAnswerUrl,
        'Verifier rejected done, navigating to planner finalAnswer URL',
      ),
    ];
  }

  const reasonUrl = extractFirstHttpUrlCandidate(params.decision.reason);
  if (reasonUrl && !isSameDestination(params.currentUrl, reasonUrl)) {
    return [
      toRecoveryOpenUrlPlan(reasonUrl, 'Verifier rejected done, navigating to planner reason URL'),
    ];
  }

  return [];
}

export function buildDoneStatusNavigationPlans(params: {
  currentUrl: string;
  decision: ParsedInteractionDecision;
}): InteractionActionPlan[] {
  const aiActions = keepExecutableRecoveryActions(params.decision.actions);
  if (aiActions.length > 0) return aiActions;

  const finalAnswerUrl = extractFirstHttpUrlCandidate(params.decision.finalAnswer);
  if (finalAnswerUrl && !isSameDestination(params.currentUrl, finalAnswerUrl)) {
    return [
      toRecoveryOpenUrlPlan(finalAnswerUrl, 'Planner marked done with off-page finalAnswer URL'),
    ];
  }

  const reasonUrl = extractFirstHttpUrlCandidate(params.decision.reason);
  if (reasonUrl && !isSameDestination(params.currentUrl, reasonUrl)) {
    return [toRecoveryOpenUrlPlan(reasonUrl, 'Planner marked done with off-page reason URL')];
  }

  return [];
}

function compactKeyPart(value: string | null | undefined, maxChars = 220): string {
  if (!value) return '';
  const compacted = value.replace(/\s+/g, ' ').trim();
  return compacted.length <= maxChars ? compacted : compacted.slice(0, maxChars);
}

export function countMeaningfulExecutions(executions: InteractionExecutionResult[]): number {
  return executions.reduce(
    (count, execution) => count + (execution.requestedAction === 'unknown' ? 0 : 1),
    0,
  );
}

export function buildVerificationCacheKey(params: VerificationCacheKeyParams): string {
  return [
    compactKeyPart(params.task, 260),
    normalizeComparableUrl(params.pageUrl),
    compactKeyPart(params.pageTitle, 160),
    compactKeyPart(params.plannerFinalAnswer, 220),
    compactKeyPart(params.plannerReason, 180),
    String(params.meaningfulExecutionCount),
  ].join('|');
}

export function buildDoneLoopKey(params: DoneLoopKeyParams): string {
  return [
    compactKeyPart(params.task, 260),
    normalizeComparableUrl(params.pageUrl),
    String(params.meaningfulExecutionCount),
  ].join('|');
}

export function buildStuckDoneRecoveryPlans(
  params: StuckDoneRecoveryParams,
): InteractionActionPlan[] {
  const queryBase = compactKeyPart(params.task, 280) || 'site search';
  let query = queryBase;
  try {
    const url = new URL(params.currentUrl);
    if (/^https?:$/i.test(url.protocol) && url.hostname.trim()) {
      query = `${queryBase} site:${url.hostname}`;
    }
  } catch {
    // Keep generic query when URL is not parseable.
  }

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return [toRecoveryOpenUrlPlan(searchUrl, 'Stuck done-loop recovery via search navigation')];
}

function splitTaskTokens(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function isLikelyClickableElement(element: InteractiveElementSnapshotItem): boolean {
  if (element.disabled) return false;
  if (element.href) return true;
  const tag = element.tag.toLowerCase();
  if (tag === 'a' || tag === 'button' || tag === 'summary') return true;
  const role = element.role?.toLowerCase() ?? '';
  return (
    role.includes('button') ||
    role.includes('link') ||
    role.includes('tab') ||
    role.includes('menuitem') ||
    role.includes('option')
  );
}

function buildElementTextForScoring(element: InteractiveElementSnapshotItem): string {
  return [
    element.text,
    element.ariaLabel,
    element.placeholder,
    element.name,
    element.id,
    element.href,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function computeExplorationClickScore(
  element: InteractiveElementSnapshotItem,
  taskTokens: string[],
): number {
  if (!isLikelyClickableElement(element)) return -1000;
  const elementText = buildElementTextForScoring(element);
  let score = 0;

  if (element.href) score += 4;
  if (element.tag.toLowerCase() === 'a') score += 2;
  if (element.tag.toLowerCase() === 'button') score += 2;
  if (element.role?.toLowerCase().includes('link')) score += 2;
  if (element.role?.toLowerCase().includes('button')) score += 2;

  for (const keyword of EXPLORATION_POSITIVE_KEYWORDS) {
    if (elementText.includes(keyword)) score += 2;
  }

  for (const keyword of EXPLORATION_NEGATIVE_KEYWORDS) {
    if (elementText.includes(keyword)) score -= 4;
  }

  for (const token of taskTokens) {
    if (elementText.includes(token)) score += 2;
  }

  if (!elementText.trim()) score -= 2;
  return score;
}

export function buildExplorationClickKey(pageUrl: string, index: number): string {
  return `${normalizeComparableUrl(pageUrl)}#${index}`;
}

export function buildRejectedDoneExplorationPlans(
  params: RejectedDoneExplorationParams,
): InteractionActionPlan[] {
  const taskTokens = splitTaskTokens(params.task);
  let best: { element: InteractiveElementSnapshotItem; score: number } | null = null;

  for (const element of params.elements) {
    const clickKey = buildExplorationClickKey(params.currentUrl, element.index);
    if (params.attemptedClickKeys.has(clickKey)) continue;
    const score = computeExplorationClickScore(element, taskTokens);
    if (score < 1) continue;
    if (!best || score > best.score) {
      best = { element, score };
    }
  }

  if (!best) return [];
  return [
    {
      action: 'click',
      index: best.element.index,
      text: null,
      url: null,
      reason: `Verifier rejected done; exploratory on-page click at index ${best.element.index}.`,
      confidence: best.score >= 8 ? 'high' : 'medium',
    },
  ];
}
