import type { ExecuteActionResponse, InteractionActionType } from '@shared/types';
import { HIGHLIGHT_ATTR } from './constants';
import { clearInteractionHighlights } from './highlights';

type ValueTarget = HTMLInputElement | HTMLTextAreaElement;

function findElementByIndex(index: number): HTMLElement | null {
  if (!Number.isFinite(index) || index <= 0) return null;
  return document.querySelector<HTMLElement>(`[${HIGHLIGHT_ATTR}="${index}"]`);
}

function isDisabled(element: HTMLElement): boolean {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLOptionElement
  ) {
    return element.disabled;
  }
  return element.getAttribute('aria-disabled') === 'true' || element.hasAttribute('disabled');
}

function resolveTypeTarget(target: HTMLElement): HTMLElement {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target.isContentEditable
  ) {
    return target;
  }

  if (target instanceof HTMLLabelElement) {
    if (target.control instanceof HTMLElement) return target.control;
    if (target.htmlFor) {
      const byId = document.getElementById(target.htmlFor);
      if (byId instanceof HTMLElement) return byId;
    }
  }

  const descendant = target.querySelector<HTMLElement>(
    "input:not([type='hidden']), textarea, select, [contenteditable='true']",
  );
  return descendant ?? target;
}

function setNativeInputValue(element: ValueTarget, value: string): void {
  const descriptor =
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value') ??
    Object.getOwnPropertyDescriptor(element.constructor.prototype, 'value');
  if (descriptor?.set) {
    descriptor.set.call(element, value);
    return;
  }
  element.value = value;
}

function dispatchTextEvents(target: HTMLElement, previousValue: string, nextValue: string): void {
  const tracker = (target as { _valueTracker?: { setValue: (v: string) => void } })._valueTracker;
  if (tracker && typeof tracker.setValue === 'function') {
    tracker.setValue(previousValue);
  }

  try {
    target.dispatchEvent(
      new InputEvent('beforeinput', { bubbles: true, composed: true, data: nextValue, inputType: 'insertText' }),
    );
  } catch {}

  try {
    target.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, data: nextValue, inputType: 'insertText' }),
    );
  } catch {
    target.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  target.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
}

function executeClick(target: HTMLElement): { ok: boolean; message: string } {
  if (isDisabled(target)) return { ok: false, message: 'Target is disabled' };
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  target.click();
  return { ok: true, message: 'Click executed' };
}

function executeInputType(target: ValueTarget, text: string): { ok: boolean; message: string } {
  const blocked = new Set(['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'image', 'range', 'color']);
  if (target instanceof HTMLInputElement && blocked.has(target.type)) {
    return { ok: false, message: 'Target input type is not text-editable' };
  }
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  const prev = target.value;
  setNativeInputValue(target, text);
  if (target.value !== text) target.value = text;
  try { target.setSelectionRange(target.value.length, target.value.length); } catch {}
  dispatchTextEvents(target, prev, target.value);
  return { ok: true, message: `Input value updated "${prev}" -> "${target.value}"` };
}

function executeSelectType(target: HTMLSelectElement, text: string): { ok: boolean; message: string } {
  const normalized = text.trim().toLowerCase();
  const match = Array.from(target.options).find((o) => {
    const label = o.text.trim().toLowerCase();
    const value = o.value.trim().toLowerCase();
    return label === normalized || value === normalized || label.includes(normalized);
  });
  if (!match) return { ok: false, message: 'No matching option in select' };
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  const prev = target.value;
  target.value = match.value;
  dispatchTextEvents(target, prev, target.value);
  return { ok: true, message: `Select value updated "${prev}" -> "${target.value}"` };
}

function executeType(target: HTMLElement, text: string): { ok: boolean; message: string } {
  const resolved = resolveTypeTarget(target);
  if (isDisabled(resolved)) return { ok: false, message: 'Target is disabled' };

  if (resolved instanceof HTMLInputElement || resolved instanceof HTMLTextAreaElement) {
    return executeInputType(resolved, text);
  }
  if (resolved instanceof HTMLSelectElement) {
    return executeSelectType(resolved, text);
  }
  if (resolved.isContentEditable) {
    resolved.scrollIntoView({ block: 'center', inline: 'center' });
    resolved.focus();
    const prev = resolved.textContent ?? '';
    resolved.textContent = text;
    dispatchTextEvents(resolved, prev, resolved.textContent ?? '');
    return { ok: true, message: 'Content editable value updated' };
  }
  return { ok: false, message: 'Target does not support typing' };
}

export function executeInteractionAction(
  action: InteractionActionType,
  index: number,
  text: string | null | undefined,
): ExecuteActionResponse {
  const normalizedText = typeof text === 'string' ? text : null;
  const target = findElementByIndex(index);

  if (!target) {
    clearInteractionHighlights();
    return { action, index, text: normalizedText, ok: false, message: 'Target index not found' };
  }

  try {
    if (action === 'click') {
      const result = executeClick(target);
      return { action, index, text: null, ok: result.ok, message: result.message };
    }
    const result = executeType(target, normalizedText ?? '');
    return { action, index, text: normalizedText, ok: result.ok, message: result.message };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown action execution error';
    return { action, index, text: normalizedText, ok: false, message };
  } finally {
    clearInteractionHighlights();
  }
}
