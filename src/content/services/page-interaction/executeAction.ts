import type { ExecuteActionResponse, InteractionActionType } from '@shared/types';
import { HIGHLIGHT_ATTR } from './constants';
import { clearInteractionHighlights } from './highlights';
import { executeInputType, executeSelectType, executeContentEditableType } from './type-action-utils';

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

function executeClick(target: HTMLElement): { ok: boolean; message: string } {
  if (isDisabled(target)) return { ok: false, message: 'Target is disabled' };
  target.scrollIntoView({ block: 'center', inline: 'center' });
  target.focus();
  target.click();
  return { ok: true, message: 'Click executed' };
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
    return executeContentEditableType(resolved, text);
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
