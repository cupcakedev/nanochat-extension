import type {
  InteractionActionPlan,
  InteractionExecutionResult,
  InteractionSnapshotPayload,
} from '@shared/types';
import type { PlannerStrategyHints } from './run-step-types';
import { normalizeComparableUrl } from './run-step-utils';

const TITLE_SUFFIX_PATTERNS = [/\s*\(\d{4}\)\s*$/i, /\s*\|\s*.*$/i];

export interface InteractionStrategyState {
  task: string;
  lastObservationKey: string | null;
  noProgressStreak: number;
}

function compact(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTitle(value: string | null | undefined): string | null {
  let next = compact(value);
  if (!next) return null;
  for (const pattern of TITLE_SUFFIX_PATTERNS) {
    next = next.replace(pattern, '').trim();
  }
  return next.length > 0 ? next : null;
}

function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  return value.length <= max ? value : value.slice(0, max);
}

function buildElementSignature(snapshot: InteractionSnapshotPayload): string {
  return snapshot.interactiveElements
    .slice(0, 10)
    .map((element) => {
      const content =
        compact(element.text) ??
        compact(element.ariaLabel) ??
        compact(element.placeholder) ??
        compact(element.href) ??
        element.tag;
      return `${element.tag}:${truncate(content, 28) ?? element.tag}`;
    })
    .join('|');
}

function buildObservationKey(snapshot: InteractionSnapshotPayload): string {
  const url = normalizeComparableUrl(snapshot.pageUrl);
  const title = normalizeTitle(snapshot.pageTitle) ?? 'untitled';
  const scrollBucket = Math.round(snapshot.scrollY / 80);
  const signature = buildElementSignature(snapshot);
  return `${url}|${title}|${scrollBucket}|${signature}`;
}

function executionFingerprint(execution: InteractionExecutionResult | null): string {
  if (!execution) return 'none';
  return [
    execution.requestedAction,
    execution.requestedIndex ?? '',
    compact(execution.requestedText) ?? '',
    compact(execution.requestedUrl) ?? '',
  ].join('|');
}

function planFingerprint(plan: InteractionActionPlan | null): string {
  if (!plan) return 'none';
  return [plan.action, plan.index ?? '', compact(plan.text) ?? '', compact(plan.url) ?? ''].join(
    '|',
  );
}

function buildFallbackSearchUrl(task: string, currentUrl: string): string {
  const queryBase = truncate(compact(task), 220) ?? 'search';
  try {
    const url = new URL(currentUrl);
    const query = /^https?:$/i.test(url.protocol) ? `${queryBase} site:${url.hostname}` : queryBase;
    return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  } catch {
    return `https://www.google.com/search?q=${encodeURIComponent(queryBase)}`;
  }
}

function evaluatePreviousGoal(
  state: InteractionStrategyState,
  history: InteractionExecutionResult[],
): string {
  const last = history[history.length - 1];
  if (!last) return 'Unknown - first step on current task.';
  if (!last.executed) return `Failed - last action did not execute (${last.message}).`;
  if (state.noProgressStreak > 0) {
    return 'Failed - last action executed but page context did not change.';
  }
  return 'Success - page context changed after the last action.';
}

export function createInteractionStrategyState(task: string): InteractionStrategyState {
  return {
    task,
    lastObservationKey: null,
    noProgressStreak: 0,
  };
}

export function updateInteractionStrategyState(
  state: InteractionStrategyState,
  snapshot: InteractionSnapshotPayload,
): void {
  const observationKey = buildObservationKey(snapshot);
  if (state.lastObservationKey === observationKey) {
    state.noProgressStreak += 1;
  } else {
    state.noProgressStreak = 0;
  }
  state.lastObservationKey = observationKey;
}

export function buildPlannerStrategyHints(
  state: InteractionStrategyState,
  snapshot: InteractionSnapshotPayload,
  history: InteractionExecutionResult[],
): PlannerStrategyHints {
  const evaluationPreviousGoal = evaluatePreviousGoal(state, history);
  const lastExecution = history[history.length - 1] ?? null;
  const memory = `noProgressStreak=${state.noProgressStreak}, currentTitle="${truncate(normalizeTitle(snapshot.pageTitle), 80) ?? 'untitled'}", lastAction="${executionFingerprint(lastExecution)}"`;
  const nextGoal =
    state.noProgressStreak >= 2
      ? 'Break stagnation by switching to a different interaction mode that is likely to change the page state.'
      : 'Find the most direct action that advances the user task with clear observable progress.';
  const constraints = [
    'Do not repeat the same click index on the same URL when context is unchanged.',
    'Choose actions that are likely to cause measurable state change (URL, visible content, or scroll position).',
  ];

  if (state.noProgressStreak >= 2) {
    constraints.push(
      'Switch action mode immediately when repeated actions execute but page context does not change.',
    );
  }
  if (state.noProgressStreak >= 3) {
    constraints.push(
      'Try a fundamentally different approach: openUrl, type, or click a different element.',
    );
  }

  return {
    evaluationPreviousGoal,
    memory,
    nextGoal,
    constraints,
  };
}

export function applyStrategyPlanGuard(params: {
  state: InteractionStrategyState;
  snapshot: InteractionSnapshotPayload;
  plans: InteractionActionPlan[];
  history: InteractionExecutionResult[];
}): InteractionActionPlan[] {
  const { state, snapshot, plans, history } = params;
  if (state.noProgressStreak < 2) return plans;
  if (!plans.length) return plans;

  const firstPlan = plans[0];
  const lastExecution = history[history.length - 1] ?? null;
  const repeatedSameAction = planFingerprint(firstPlan) === executionFingerprint(lastExecution);

  if (!repeatedSameAction) return plans;
  if (plans.some((plan) => plan.action === 'openUrl' && typeof plan.url === 'string')) return plans;

  if (state.noProgressStreak >= 3) {
    return [
      {
        action: 'openUrl',
        index: null,
        text: null,
        url: buildFallbackSearchUrl(state.task, snapshot.pageUrl),
        reason:
          'Strategy guard: repeated no-progress state, switching to targeted navigation search.',
        confidence: 'high',
      },
    ];
  }

  return [
    {
      action: 'scrollDown',
      index: null,
      text: null,
      url: null,
      reason:
        'Strategy guard: repeated no-progress state, switching from direct interaction to context-expanding scroll.',
      confidence: 'medium',
    },
  ];
}
