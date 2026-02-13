import type { InteractiveElementSnapshotItem, InteractionSnapshotPayload } from '@shared/types';
import { applyInteractionHighlights } from './highlights';

const INTERACTIVE_TAGS = new Set([
  'a', 'button', 'input', 'textarea', 'select', 'option', 'summary', 'label', 'details',
]);

const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'menuitem', 'tab',
  'textbox', 'combobox', 'option', 'searchbox', 'spinbutton', 'slider',
]);

const DEFAULT_MAX_ELEMENTS = 50;

function normalizeText(value: string | null | undefined, max = 140): string | null {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  return normalized.length <= max ? normalized : normalized.slice(0, max);
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

function isVisible(element: HTMLElement, viewportOnly: boolean): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (!viewportOnly) return true;
  return rect.bottom >= 0 && rect.right >= 0 && rect.left <= window.innerWidth && rect.top <= window.innerHeight;
}

function isInteractiveElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag === 'body' || tag === 'html') return false;
  if (INTERACTIVE_TAGS.has(tag)) return true;
  const role = element.getAttribute('role')?.toLowerCase() ?? '';
  if (INTERACTIVE_ROLES.has(role)) return true;
  if (element.tabIndex >= 0) return true;
  if (element.isContentEditable) return true;
  if (element.hasAttribute('onclick')) return true;
  return window.getComputedStyle(element).cursor === 'pointer';
}

function getPrimaryText(element: HTMLElement): string | null {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return normalizeText(element.value) ?? normalizeText(element.placeholder);
  }
  if (element instanceof HTMLSelectElement) {
    const selected = element.options[element.selectedIndex]?.text ?? '';
    return normalizeText(selected) ?? normalizeText(element.name);
  }
  return normalizeText(element.innerText) ?? normalizeText(element.textContent);
}

function getHref(element: HTMLElement): string | null {
  if (element instanceof HTMLAnchorElement) return normalizeText(element.href, 220);
  return null;
}

function toSummary(element: HTMLElement, index: number): InteractiveElementSnapshotItem {
  const rect = element.getBoundingClientRect();
  return {
    index,
    tag: element.tagName.toLowerCase(),
    role: normalizeText(element.getAttribute('role'), 32),
    inputType: element instanceof HTMLInputElement ? normalizeText(element.type, 32) : null,
    text: getPrimaryText(element),
    ariaLabel: normalizeText(element.getAttribute('aria-label')),
    placeholder: normalizeText(element.getAttribute('placeholder'), 80),
    name: normalizeText(element.getAttribute('name'), 80),
    id: normalizeText(element.id, 80),
    href: getHref(element),
    disabled: isDisabled(element),
    rect: {
      x: Math.round(rect.left),
      y: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

function queryCandidates(): HTMLElement[] {
  const selectors = [
    'a[href]', 'button', "input:not([type='hidden'])", 'select', 'textarea',
    'summary', 'label[for]', '[role]', '[tabindex]', "[contenteditable='true']", '[onclick]',
  ];
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];
  for (const selector of selectors) {
    document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
      if (!seen.has(el)) {
        seen.add(el);
        result.push(el);
      }
    });
  }
  return result;
}

function collectInteractiveElements(maxElements: number, viewportOnly: boolean): HTMLElement[] {
  return queryCandidates()
    .filter((el) => isInteractiveElement(el) && isVisible(el, viewportOnly))
    .sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return ar.top !== br.top ? ar.top - br.top : ar.left - br.left;
    })
    .slice(0, Math.max(1, maxElements));
}

export function extractInteractionSnapshot(
  maxElements = DEFAULT_MAX_ELEMENTS,
  viewportOnly = true,
): InteractionSnapshotPayload {
  const elements = collectInteractiveElements(maxElements, viewportOnly);
  applyInteractionHighlights(elements);

  return {
    pageUrl: location.href,
    pageTitle: document.title,
    interactiveElements: elements.map((el, i) => toSummary(el, i + 1)),
  };
}
