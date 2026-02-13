import type {
  InteractionActionPlan,
  InteractionActionType,
  InteractionConfidence,
  InteractionRunStatus,
} from '@shared/types';

const MAX_ACTIONS_PER_PLAN = 4;

export interface ParsedInteractionDecision {
  status: Exclude<InteractionRunStatus, 'max-steps'>;
  finalAnswer: string | null;
  reason: string | null;
  actions: InteractionActionPlan[];
}

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

function normalizeStatus(value: unknown): Exclude<InteractionRunStatus, 'max-steps'> {
  if (typeof value !== 'string') return 'continue';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'done') return 'done';
  if (normalized === 'fail') return 'fail';
  return 'continue';
}

function normalizeAction(value: unknown): InteractionActionType {
  if (typeof value !== 'string') return 'unknown';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'click') return 'click';
  if (normalized === 'type') return 'type';
  if (normalized === 'openurl' || normalized === 'open_url' || normalized === 'open-url') return 'openUrl';
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
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.floor(value);
  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
  }
  return null;
}

function validateExecutableAction(
  action: InteractionActionType,
  index: number | null,
  url: string | null,
  reason: string | null,
): InteractionActionPlan {
  if (action === 'openUrl' && !url) {
    return { action: 'unknown', index: null, text: null, url: null, reason: reason ?? 'Missing URL for openUrl', confidence: 'low' };
  }

  if ((action === 'click' || action === 'type') && index === null) {
    return { action: 'unknown', index: null, text: null, url: null, reason: reason ?? 'Missing index for actionable command', confidence: 'low' };
  }

  return { action, index, text: null, url, reason, confidence: 'low' };
}

function normalizeActionPlan(value: unknown): InteractionActionPlan {
  if (!value || typeof value !== 'object') {
    return { action: 'unknown', index: null, text: null, url: null, reason: 'Invalid action item', confidence: 'low' };
  }

  const parsed = value as Record<string, unknown>;
  const action = normalizeAction(parsed.action);
  const index = normalizeIndex(parsed.index);
  const text = normalizeTextValue(parsed.text);
  const url = normalizeTextValue(parsed.url);
  const reason = normalizeTextValue(parsed.reason);
  const confidence = normalizeConfidence(parsed.confidence);
  const plan = validateExecutableAction(action, index, url, reason);

  if (action === 'click') return { ...plan, confidence, text: null, url: null };
  if (action === 'type') return { ...plan, confidence, text };
  return { ...plan, confidence };
}

function readRoot(rawText: string): Record<string, unknown> {
  return JSON.parse(extractJsonObject(rawText)) as Record<string, unknown>;
}

function readActions(root: Record<string, unknown>): InteractionActionPlan[] {
  if (!Array.isArray(root.actions)) return [];
  return root.actions.slice(0, MAX_ACTIONS_PER_PLAN).map(normalizeActionPlan);
}

export function parseInteractionDecision(rawText: string): ParsedInteractionDecision {
  const root = readRoot(rawText);
  const status = normalizeStatus(root.status);
  const finalAnswer = normalizeTextValue(root.finalAnswer);
  const reason = normalizeTextValue(root.reason);
  const actions = readActions(root);

  if (status === 'continue' && actions.length === 0) {
    return {
      status: 'fail',
      finalAnswer: finalAnswer ?? null,
      reason: reason ?? 'Planner returned no actions for continue status',
      actions: [],
    };
  }

  return { status, finalAnswer, reason, actions };
}
