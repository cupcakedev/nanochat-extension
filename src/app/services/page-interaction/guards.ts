import type { InteractionActionPlan, InteractiveElementSnapshotItem } from '@shared/types';

const TYPE_INTENT_KEYWORDS = ['type', 'enter', 'input', 'fill', 'paste', 'write', 'insert', 'set'];
const CLICK_INTENT_KEYWORDS = ['click', 'press', 'tap', 'open', 'go to', 'select', 'choose'];
const COUPON_KEYWORDS = ['coupon', 'promo', 'discount', 'voucher', 'gift card', 'promo code', 'discount code'];
const TYPEABLE_ROLES = new Set(['textbox', 'combobox', 'searchbox', 'spinbutton']);
const TYPEABLE_TAGS = new Set(['input', 'textarea', 'select']);
const BUTTON_LIKE_VALUES = new Set(['add', 'apply', 'submit', 'continue', 'checkout', 'cart', 'go', 'next', 'ok']);

function hasKeyword(value: string, keywords: string[]): boolean {
  const normalized = value.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function extractQuotedValue(instruction: string): string | null {
  const doubleQuote = instruction.match(/"([^"\n]{1,200})"/);
  if (doubleQuote?.[1]) return doubleQuote[1].trim();
  const singleQuote = instruction.match(/'([^'\n]{1,200})'/);
  if (singleQuote?.[1]) return singleQuote[1].trim();
  return null;
}

function extractCodeValue(instruction: string): string | null {
  const values = instruction.match(/\b[A-Z0-9][A-Z0-9_-]{3,}\b/g) ?? [];
  const filtered = values.filter((value) => !TYPE_INTENT_KEYWORDS.includes(value.toLowerCase()));
  return filtered[0] ?? null;
}

function isTypeableElement(element: InteractiveElementSnapshotItem): boolean {
  if (element.disabled) return false;
  if (TYPEABLE_TAGS.has(element.tag)) return true;
  return element.role !== null && TYPEABLE_ROLES.has(element.role.toLowerCase());
}

function scoreByInstructionHints(elementText: string, instruction: string): number {
  const targetText = elementText.toLowerCase();
  const normalizedInstruction = instruction.toLowerCase();
  let score = 0;
  if (/email/.test(normalizedInstruction) && /email/.test(targetText)) score += 6;
  if (/phone/.test(normalizedInstruction) && /phone|mobile|tel/.test(targetText)) score += 6;
  if (/name/.test(normalizedInstruction) && /name/.test(targetText)) score += 4;
  if (hasKeyword(instruction, COUPON_KEYWORDS) && /coupon|promo|discount|voucher|gift|code/.test(targetText)) {
    score += 8;
  }
  return score;
}

function scoreTypeCandidate(element: InteractiveElementSnapshotItem, instruction: string): number {
  if (!isTypeableElement(element)) return -1;
  const elementText = [element.text, element.ariaLabel, element.placeholder, element.name, element.id]
    .filter(Boolean)
    .join(' ');

  let score = 1 + scoreByInstructionHints(elementText, instruction);
  if (element.tag === 'input') score += 2;
  if (element.inputType && ['text', 'search', 'email', 'tel', 'url', 'password'].includes(element.inputType)) {
    score += 3;
  }
  if (element.placeholder) score += 1;
  if (element.name) score += 1;
  if (!elementText.trim()) score -= 1;
  return score;
}

function chooseTypeCandidate(elements: InteractiveElementSnapshotItem[], instruction: string): InteractiveElementSnapshotItem | null {
  const scored = elements
    .map((element) => ({ element, score: scoreTypeCandidate(element, instruction) }))
    .sort((a, b) => b.score - a.score);

  if (!scored.length || scored[0].score < 1) return null;
  return scored[0].element;
}

function isClickOnlyInstruction(instruction: string, preferredValue: string | null): boolean {
  const hasClickIntent = hasKeyword(instruction, CLICK_INTENT_KEYWORDS);
  const hasTypeIntent = hasKeyword(instruction, TYPE_INTENT_KEYWORDS);
  const explicitButton = /\b(button|btn)\b/.test(instruction.toLowerCase());
  const isButtonValue = preferredValue ? BUTTON_LIKE_VALUES.has(preferredValue.toLowerCase()) : false;
  return hasClickIntent && !hasTypeIntent && (explicitButton || isButtonValue);
}

function patchMissingTypeText(plan: InteractionActionPlan, preferredValue: string | null, clickOnly: boolean): InteractionActionPlan {
  if (plan.action !== 'type' || plan.text || !preferredValue || clickOnly) return plan;
  const reason = `${plan.reason ?? ''} Filled missing text from instruction.`.trim();
  return { ...plan, text: preferredValue, reason };
}

function enforceTypingFirstForSinglePlan(
  plan: InteractionActionPlan,
  instruction: string,
  elements: InteractiveElementSnapshotItem[],
): InteractionActionPlan {
  const preferredValue = extractQuotedValue(instruction) ?? extractCodeValue(instruction);
  const clickOnly = isClickOnlyInstruction(instruction, preferredValue);
  const patched = patchMissingTypeText(plan, preferredValue, clickOnly);
  const shouldForceTyping = hasKeyword(instruction, TYPE_INTENT_KEYWORDS) || hasKeyword(instruction, COUPON_KEYWORDS);
  if (!shouldForceTyping || !preferredValue || clickOnly) return patched;
  if (patched.action === 'type' && patched.text) return patched;

  const candidate = chooseTypeCandidate(elements, instruction);
  if (!candidate) return patched;

  return {
    action: 'type',
    index: candidate.index,
    text: preferredValue,
    confidence: patched.confidence === 'high' ? 'high' : 'medium',
    reason: `Typing-first guard: input text "${preferredValue}" into index ${candidate.index} before any click.`,
  };
}

function shouldPrependTypingAction(original: InteractionActionPlan, adjusted: InteractionActionPlan): boolean {
  return original.action !== 'type' && adjusted.action === 'type' && adjusted.index !== null && adjusted.text !== null;
}

export function enforceTypingFirst(
  plans: InteractionActionPlan[],
  instruction: string,
  elements: InteractiveElementSnapshotItem[],
): InteractionActionPlan[] {
  if (!plans.length) return plans;

  const [first, ...rest] = plans;
  const adjustedFirst = enforceTypingFirstForSinglePlan(first, instruction, elements);

  if (shouldPrependTypingAction(first, adjustedFirst)) {
    return [adjustedFirst, first, ...rest];
  }

  return [adjustedFirst, ...rest];
}
