import type { InteractiveElementSnapshotItem, InteractionSnapshotPayload } from '@shared/types';
import { applyInteractionHighlights } from './highlights';
import { collectSearchRoots } from './search-roots';
import { isElementUserVisible } from './visibility';

const INTERACTIVE_TAGS = new Set([
  'a',
  'button',
  'details',
  'embed',
  'input',
  'label',
  'menu',
  'menuitem',
  'object',
  'select',
  'textarea',
  'option',
  'summary',
]);

const INTERACTIVE_ROLES = new Set([
  'button',
  'menu',
  'menuitem',
  'link',
  'checkbox',
  'radio',
  'slider',
  'switch',
  'tab',
  'tabpanel',
  'textbox',
  'combobox',
  'grid',
  'listbox',
  'option',
  'progressbar',
  'scrollbar',
  'searchbox',
  'tree',
  'treeitem',
  'spinbutton',
  'tooltip',
  'a-button-inner',
  'a-dropdown-button',
  'click',
  'menuitemcheckbox',
  'menuitemradio',
  'a-button-text',
  'button-text',
  'button-icon',
  'button-icon-only',
  'button-text-icon-only',
  'dropdown',
]);

const IGNORED_TAGS = new Set([
  'svg',
  'path',
  'circle',
  'line',
  'rect',
  'polygon',
  'polyline',
  'ellipse',
  'g',
  'use',
  'image',
  'defs',
  'clippath',
  'mask',
  'symbol',
  'br',
  'hr',
  'wbr',
  'col',
  'source',
  'track',
]);

const INTERACTIVE_DATA_ACTIONS = new Set(['a-dropdown-select', 'a-dropdown-button']);
const DEFAULT_MAX_ELEMENTS = 50;
const DEFAULT_VIEWPORT_SEGMENTS = 1;
const MAX_VIEWPORT_SEGMENTS = 2;

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
  if (IGNORED_TAGS.has(tag)) return false;
  if (INTERACTIVE_TAGS.has(tag)) return true;
  const role = element.getAttribute('role')?.toLowerCase();
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  const ariaRole = element.getAttribute('aria-role')?.toLowerCase();
  if (ariaRole && INTERACTIVE_ROLES.has(ariaRole)) return true;
  const tabIndex = element.getAttribute('tabindex');
  if (tabIndex !== null && tabIndex !== '-1') return true;
  const dataAction = element.getAttribute('data-action')?.toLowerCase();
  if (dataAction && INTERACTIVE_DATA_ACTIONS.has(dataAction)) return true;
  if (
    element.hasAttribute('aria-expanded') ||
    element.hasAttribute('aria-pressed') ||
    element.hasAttribute('aria-selected') ||
    element.hasAttribute('aria-checked')
  )
    return true;
  if (element.isContentEditable) return true;
  if (element.hasAttribute('onclick') || element.onclick !== null) return true;
  if (
    element.hasAttribute('ng-click') ||
    element.hasAttribute('@click') ||
    element.hasAttribute('v-on:click')
  )
    return true;
  if (element.draggable || element.getAttribute('draggable') === 'true') return true;
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
  return (
    normalizeText(element.getAttribute('aria-label')) ??
    normalizeText(element.getAttribute('title'))
  );
}

function toSummary(
  element: HTMLElement,
  index: number,
  yOffset = 0,
): InteractiveElementSnapshotItem {
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

function queryCandidates(): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const result: HTMLElement[] = [];
  collectSearchRoots().forEach((root) => {
    root.querySelectorAll<HTMLElement>('*').forEach((element) => {
      if (seen.has(element)) return;
      seen.add(element);
      result.push(element);
    });
  });
  return result;
}

function hasMeaningfulContent(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  if (INTERACTIVE_TAGS.has(tag)) return true;
  const role = element.getAttribute('role')?.toLowerCase();
  if (role && INTERACTIVE_ROLES.has(role)) return true;
  const text = normalizeText(element.innerText ?? element.textContent);
  if (text && text.toLowerCase() !== tag) return true;
  const aria = normalizeText(element.getAttribute('aria-label'));
  if (aria) return true;
  const title = normalizeText(element.getAttribute('title'));
  if (title) return true;
  if (element.id) return true;
  return false;
}

function interactionPriority(element: HTMLElement): number {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role')?.toLowerCase();
  if (tag === 'a' || tag === 'button' || tag === 'input' || tag === 'textarea' || tag === 'select')
    return 0;
  if (
    role &&
    (role === 'button' ||
      role === 'link' ||
      role === 'tab' ||
      role === 'textbox' ||
      role === 'combobox' ||
      role === 'searchbox' ||
      role === 'menuitem')
  )
    return 1;
  if (tag === 'summary' || tag === 'details' || tag === 'label' || tag === 'option') return 2;
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
    queryCandidates().filter(
      (element) =>
        isInteractiveElement(element) &&
        hasMeaningfulContent(element) &&
        isElementUserVisible(element, viewportOnly),
    ),
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
  const orderedUniqueElements: HTMLElement[] = [];
  const summaryByElement = new Map<HTMLElement, Omit<InteractiveElementSnapshotItem, 'index'>>();

  for (const segment of segments) {
    for (let index = 0; index < segment.elements.length; index += 1) {
      const element = segment.elements[index];
      if (summaryByElement.has(element)) continue;
      orderedUniqueElements.push(element);
      summaryByElement.set(element, segment.summaries[index]);
    }
  }

  const elements = orderedUniqueElements.slice(0, maxElements);
  const summaries = elements.map((element, index) => ({
    index: index + 1,
    ...summaryByElement.get(element)!,
  }));

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
