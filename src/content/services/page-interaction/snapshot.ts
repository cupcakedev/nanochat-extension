import type { InteractiveElementSnapshotItem, InteractionSnapshotPayload } from '@shared/types';
import { applyInteractionHighlights } from './highlights';
import { collectSearchRoots } from './search-roots';
import { isElementUserVisible } from './visibility';

const INTERACTIVE_TAGS = new Set([
  'a', 'button', 'input', 'textarea', 'select', 'option', 'summary', 'label', 'details',
]);

const INTERACTIVE_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'switch', 'menuitem', 'tab',
  'textbox', 'combobox', 'option', 'searchbox', 'spinbutton', 'slider',
]);

const DEFAULT_MAX_ELEMENTS = 50;
const DEFAULT_VIEWPORT_SEGMENTS = 1;
const MAX_VIEWPORT_SEGMENTS = 2;
const PRIORITY_SELECTORS = [
  'a#video-title[href*="/watch"]',
  'a#thumbnail[href*="/watch"]',
  'a[href*="/watch"]',
];
const BASE_SELECTORS = [
  'a[href]',
  'button',
  "input:not([type='hidden'])",
  'select',
  'textarea',
  'summary',
  'label[for]',
  '[role]',
  '[tabindex]',
  "[contenteditable='true']",
  '[onclick]',
];

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
  if (element instanceof HTMLAnchorElement) {
    return normalizeText(element.innerText) ?? normalizeText(element.getAttribute('title'));
  }
  return normalizeText(element.innerText) ?? normalizeText(element.textContent);
}

function getHref(element: HTMLElement): string | null {
  return element instanceof HTMLAnchorElement ? normalizeText(element.href, 220) : null;
}

function getAriaLabel(element: HTMLElement): string | null {
  return normalizeText(element.getAttribute('aria-label')) ?? normalizeText(element.getAttribute('title'));
}

function toSummary(element: HTMLElement, index: number, yOffset = 0): InteractiveElementSnapshotItem {
  const rect = element.getBoundingClientRect();
  return {
    index,
    tag: element.tagName.toLowerCase(),
    role: normalizeText(element.getAttribute('role'), 32),
    inputType: element instanceof HTMLInputElement ? normalizeText(element.type, 32) : null,
    text: getPrimaryText(element),
    ariaLabel: getAriaLabel(element),
    placeholder: normalizeText(element.getAttribute('placeholder'), 80),
    name: normalizeText(element.getAttribute('name'), 80),
    id: normalizeText(element.id, 80),
    href: getHref(element),
    disabled: isDisabled(element),
    rect: {
      x: Math.round(rect.left),
      y: Math.round(rect.top + yOffset),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

function pushSelectorMatches(
  root: ParentNode,
  selectors: string[],
  seen: Set<HTMLElement>,
  result: HTMLElement[],
): void {
  selectors.forEach((selector) => {
    root.querySelectorAll<HTMLElement>(selector).forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      result.push(element);
    });
  });
}

function queryCandidates(): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];
  collectSearchRoots().forEach((root) => {
    pushSelectorMatches(root, PRIORITY_SELECTORS, seen, result);
    pushSelectorMatches(root, BASE_SELECTORS, seen, result);
  });
  return result;
}

function interactionPriority(element: HTMLElement): number {
  if (element instanceof HTMLAnchorElement && /\/watch\?v=/i.test(element.href)) return 0;
  if (element instanceof HTMLAnchorElement) return 1;
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement
  ) return 2;
  return 3;
}

function compareByPosition(left: HTMLElement, right: HTMLElement): number {
  const l = left.getBoundingClientRect();
  const r = right.getBoundingClientRect();
  return l.top !== r.top ? l.top - r.top : l.left - r.left;
}

function sortByPriorityAndPosition(elements: HTMLElement[]): HTMLElement[] {
  return elements.sort((left, right) => {
    const priorityDiff = interactionPriority(left) - interactionPriority(right);
    if (priorityDiff !== 0) return priorityDiff;
    return compareByPosition(left, right);
  });
}

function collectInteractiveElements(maxElements: number, viewportOnly: boolean): HTMLElement[] {
  return sortByPriorityAndPosition(
    queryCandidates().filter((element) => isInteractiveElement(element) && isElementUserVisible(element, viewportOnly)),
  ).slice(0, Math.max(1, maxElements));
}

function currentScrollY(): number {
  return Math.max(0, Math.round(window.scrollY || window.pageYOffset || 0));
}

function scrollToY(top: number): number {
  const nextTop = Math.max(0, Math.round(top));
  window.scrollTo({ top: nextTop, left: window.scrollX, behavior: 'auto' });
  return currentScrollY();
}

function normalizeViewportSegments(viewportSegments: number | undefined): number {
  if (typeof viewportSegments !== 'number' || !Number.isFinite(viewportSegments)) {
    return DEFAULT_VIEWPORT_SEGMENTS;
  }
  const rounded = Math.floor(viewportSegments);
  return Math.min(MAX_VIEWPORT_SEGMENTS, Math.max(DEFAULT_VIEWPORT_SEGMENTS, rounded));
}

interface SegmentCapture {
  elements: HTMLElement[];
  summaries: Omit<InteractiveElementSnapshotItem, 'index'>[];
}

function collectSegmentCapture(
  maxElements: number,
  viewportOnly: boolean,
  yOffset: number,
): SegmentCapture {
  const elements = collectInteractiveElements(maxElements, viewportOnly);
  return {
    elements,
    summaries: elements.map((element) => {
      const summary = toSummary(element, 0, yOffset);
      return {
        tag: summary.tag,
        role: summary.role,
        inputType: summary.inputType,
        text: summary.text,
        ariaLabel: summary.ariaLabel,
        placeholder: summary.placeholder,
        name: summary.name,
        id: summary.id,
        href: summary.href,
        disabled: summary.disabled,
        rect: summary.rect,
      };
    }),
  };
}

function mergeSegmentCaptures(
  segments: SegmentCapture[],
  maxElements: number,
): { elements: HTMLElement[]; summaries: InteractiveElementSnapshotItem[] } {
  const seen = new Set<HTMLElement>();
  const elements: HTMLElement[] = [];
  const summaries: InteractiveElementSnapshotItem[] = [];

  for (const segment of segments) {
    for (let index = 0; index < segment.elements.length; index += 1) {
      const element = segment.elements[index];
      if (seen.has(element)) continue;
      seen.add(element);
      elements.push(element);
      summaries.push({
        index: summaries.length + 1,
        ...segment.summaries[index],
      });
      if (summaries.length >= maxElements) {
        return { elements, summaries };
      }
    }
  }

  return { elements, summaries };
}

export function extractInteractionSnapshot(
  maxElements = DEFAULT_MAX_ELEMENTS,
  viewportOnly = true,
  viewportSegments = DEFAULT_VIEWPORT_SEGMENTS,
): InteractionSnapshotPayload {
  const normalizedMaxElements = Math.max(1, maxElements);
  const segmentsToCapture = viewportOnly ? normalizeViewportSegments(viewportSegments) : 1;
  const initialScrollY = currentScrollY();
  const baseViewportHeight = window.innerHeight;

  const perSegmentLimit = Math.max(1, Math.ceil(normalizedMaxElements / segmentsToCapture));
  const segments: SegmentCapture[] = [];
  for (let segment = 0; segment < segmentsToCapture; segment += 1) {
    if (segment > 0) {
      scrollToY(initialScrollY + baseViewportHeight * segment);
    }
    segments.push(
      collectSegmentCapture(perSegmentLimit, viewportOnly, baseViewportHeight * segment),
    );
  }

  if (segmentsToCapture > 1) {
    scrollToY(initialScrollY);
  }

  const merged = mergeSegmentCaptures(segments, normalizedMaxElements);
  applyInteractionHighlights(merged.elements);
  return {
    pageUrl: location.href,
    pageTitle: document.title,
    scrollY: initialScrollY,
    viewportWidth: window.innerWidth,
    viewportHeight: baseViewportHeight * segmentsToCapture,
    interactiveElements: merged.summaries,
  };
}
