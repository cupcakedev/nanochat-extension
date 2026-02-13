interface RectBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const MIN_VISIBLE_AREA = 36;
const MIN_VISIBLE_HITS = 1;

function toRectBox(rect: DOMRect): RectBox {
  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function isRectValid(rect: RectBox | null): rect is RectBox {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function intersectRect(a: RectBox, b: RectBox): RectBox | null {
  const left = Math.max(a.left, b.left);
  const top = Math.max(a.top, b.top);
  const right = Math.min(a.right, b.right);
  const bottom = Math.min(a.bottom, b.bottom);
  const width = right - left;
  const height = bottom - top;
  if (width <= 0 || height <= 0) return null;
  return { left, top, right, bottom, width, height };
}

function viewportRect(): RectBox {
  return {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function isOverflowClipping(style: CSSStyleDeclaration): boolean {
  const value = `${style.overflow} ${style.overflowX} ${style.overflowY}`.toLowerCase();
  return /hidden|clip/.test(value);
}

function isTransparent(style: CSSStyleDeclaration): boolean {
  const opacity = Number.parseFloat(style.opacity || '1');
  return Number.isFinite(opacity) && opacity <= 0.01;
}

function blocksVisibility(style: CSSStyleDeclaration): boolean {
  return style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || isTransparent(style);
}

function hasHiddenAttribute(element: HTMLElement): boolean {
  return element.hasAttribute('hidden');
}

function isControlElement(element: HTMLElement): boolean {
  return (
    element instanceof HTMLAnchorElement ||
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLTextAreaElement
  );
}

function shouldRejectAriaHidden(element: HTMLElement): boolean {
  return element.getAttribute('aria-hidden') === 'true' && !isControlElement(element);
}

function hasVisibleStyleChain(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  while (current) {
    if (hasHiddenAttribute(current)) return false;
    if (blocksVisibility(window.getComputedStyle(current))) return false;
    current = current.parentElement;
  }
  return true;
}

function resolveClippedRect(element: HTMLElement, viewportOnly: boolean): RectBox | null {
  let rect: RectBox | null = toRectBox(element.getBoundingClientRect());
  if (!isRectValid(rect)) return null;

  if (viewportOnly) {
    rect = intersectRect(rect, viewportRect());
    if (!isRectValid(rect)) return null;
  }

  let parent: HTMLElement | null = element.parentElement;
  while (parent && rect) {
    const style = window.getComputedStyle(parent);
    if (blocksVisibility(style) || hasHiddenAttribute(parent)) return null;
    if (isOverflowClipping(style)) {
      const parentRect = toRectBox(parent.getBoundingClientRect());
      if (parentRect.width > 1 && parentRect.height > 1) {
        rect = intersectRect(rect, parentRect);
      }
      if (!isRectValid(rect)) return null;
    }
    parent = parent.parentElement;
  }

  return rect;
}

function toSamplePoints(rect: RectBox): Array<{ x: number; y: number }> {
  const insetX = Math.min(8, Math.max(1, rect.width * 0.2));
  const insetY = Math.min(8, Math.max(1, rect.height * 0.2));
  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + insetX, y: rect.top + insetY },
    { x: rect.right - insetX, y: rect.top + insetY },
    { x: rect.left + insetX, y: rect.bottom - insetY },
    { x: rect.right - insetX, y: rect.bottom - insetY },
  ];

  return points
    .map((point) => ({
      x: Math.max(0, Math.min(window.innerWidth - 1, Math.round(point.x))),
      y: Math.max(0, Math.min(window.innerHeight - 1, Math.round(point.y))),
    }))
    .filter((point, index, arr) => arr.findIndex((item) => item.x === point.x && item.y === point.y) === index);
}

function closestInteractiveElement(element: Element | null): HTMLElement | null {
  if (!element) return null;
  return element.closest<HTMLElement>(
    'a[href],button,input,select,textarea,[role],[tabindex],[contenteditable="true"],[onclick]',
  );
}

function normalizeComparableHref(value: string): string {
  try {
    const url = new URL(value, location.href);
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
}

function hasSameHref(element: HTMLElement, hit: HTMLElement): boolean {
  if (!(element instanceof HTMLAnchorElement) || !(hit instanceof HTMLAnchorElement)) return false;
  return normalizeComparableHref(element.href) === normalizeComparableHref(hit.href);
}

function isRelatedToHit(element: HTMLElement, hit: Element): boolean {
  if (element === hit) return true;
  if (element.contains(hit)) return true;
  if (hit instanceof HTMLElement && hit.contains(element)) return true;
  if (!(hit instanceof HTMLElement)) return false;
  const closest = closestInteractiveElement(hit);
  if (!closest) return false;
  if (closest === element || element.contains(closest) || closest.contains(element)) return true;
  return hasSameHref(element, closest);
}

function isPointVisibleForElement(element: HTMLElement, x: number, y: number): boolean {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return false;
  return isRelatedToHit(element, hit);
}

function visibleHitsCount(element: HTMLElement, rect: RectBox): number {
  return toSamplePoints(rect).reduce((count, point) => (
    count + (isPointVisibleForElement(element, point.x, point.y) ? 1 : 0)
  ), 0);
}

function hasEnoughVisibleArea(rect: RectBox): boolean {
  return rect.width * rect.height >= MIN_VISIBLE_AREA;
}

export function isElementUserVisible(element: HTMLElement, viewportOnly: boolean): boolean {
  if (shouldRejectAriaHidden(element)) return false;
  if (!hasVisibleStyleChain(element)) return false;
  if (window.getComputedStyle(element).pointerEvents === 'none') return false;

  const rect = resolveClippedRect(element, viewportOnly);
  if (!isRectValid(rect) || !hasEnoughVisibleArea(rect)) return false;

  const requiredHits = Math.min(MIN_VISIBLE_HITS, toSamplePoints(rect).length);
  return visibleHitsCount(element, rect) >= requiredHits;
}
