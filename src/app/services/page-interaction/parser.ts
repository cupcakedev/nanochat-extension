import type {
  InteractionActionPlan,
  InteractionActionType,
  InteractionConfidence,
} from '@shared/types';

const MAX_ACTIONS_PER_PLAN = 6;

function extractJsonObject(text: string): string {
  const start = text.indexOf('{');
  if (start === -1) throw new Error('Prompt API returned non-JSON output');

  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text[index];
    if (char === '{') depth += 1;
    if (char !== '}') continue;
    depth -= 1;
    if (depth === 0) return text.slice(start, index + 1);
  }

  throw new Error('Prompt API returned incomplete JSON output');
}

function normalizeTextValue(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeAction(value: unknown): InteractionActionType {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'click') return 'click';
  if (normalized === 'type') return 'type';
  if (normalized === 'done') return 'done';
  return 'unknown';
}

function normalizeConfidence(value: unknown): InteractionConfidence {
  if (typeof value !== 'string') return 'low';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'high') return 'high';
  if (normalized === 'medium') return 'medium';
  return 'low';
}

function normalizeIndex(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
}

function toUnknownPlan(reason: string): InteractionActionPlan {
  return {
    action: 'unknown',
    index: null,
    text: null,
    reason,
    confidence: 'low',
  };
}

function normalizeExecutableActionPlan(
  action: InteractionActionType,
  index: number | null,
  reason: string | null,
): InteractionActionPlan {
  if ((action === 'click' || action === 'type') && index === null) {
    return toUnknownPlan(reason ?? 'Missing index for actionable command');
  }

  return {
    action,
    index,
    text: null,
    reason,
    confidence: 'low',
  };
}

function normalizeActionPlan(value: unknown): InteractionActionPlan {
  if (!value || typeof value !== 'object') {
    return toUnknownPlan('Invalid action item');
  }

  const parsed = value as Record<string, unknown>;
  const action = normalizeAction(parsed.action);
  const index = normalizeIndex(parsed.index);
  const text = normalizeTextValue(parsed.text);
  const reason = normalizeTextValue(parsed.reason);
  const confidence = normalizeConfidence(parsed.confidence);
  const plan = normalizeExecutableActionPlan(action, index, reason);

  if (action === 'click') return { ...plan, confidence };
  return { ...plan, text, confidence };
}

function readRawActions(root: Record<string, unknown>): unknown[] {
  const actions = root.actions;
  if (Array.isArray(actions)) return actions;
  return [root];
}

function readRoot(rawText: string): Record<string, unknown> {
  return JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;
}

export function parseInteractionActions(rawText: string): InteractionActionPlan[] {
  const root = readRoot(rawText);
  const plans = readRawActions(root)
    .slice(0, MAX_ACTIONS_PER_PLAN)
    .map(normalizeActionPlan);

  if (!plans.length) return [toUnknownPlan('No action returned')];
  return plans;
}
