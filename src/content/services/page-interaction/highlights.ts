import { HIGHLIGHT_ATTR, HIGHLIGHT_COLORS, HIGHLIGHT_CONTAINER_ID } from './constants';

function getPageHeight(): number {
  return Math.max(
    document.documentElement?.scrollHeight ?? 0,
    document.body?.scrollHeight ?? 0,
    window.innerHeight,
  );
}

function createContainer(): HTMLDivElement {
  const container = document.createElement('div');
  container.id = HIGHLIGHT_CONTAINER_ID;
  container.style.position = 'absolute';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = `${getPageHeight()}px`;
  container.style.pointerEvents = 'none';
  container.style.zIndex = '2147483647';
  document.body.appendChild(container);
  return container;
}

export function clearInteractionHighlights(): void {
  const container = document.getElementById(HIGHLIGHT_CONTAINER_ID);
  if (container) container.remove();

  document
    .querySelectorAll<HTMLElement>(`[${HIGHLIGHT_ATTR}]`)
    .forEach((el) => el.removeAttribute(HIGHLIGHT_ATTR));
}

export function applyInteractionHighlights(elements: HTMLElement[]): void {
  clearInteractionHighlights();
  const container = createContainer();

  elements.forEach((element, position) => {
    const index = position + 1;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const color = HIGHLIGHT_COLORS[position % HIGHLIGHT_COLORS.length];
    const top = rect.top + window.scrollY;
    const left = rect.left + window.scrollX;
    element.setAttribute(HIGHLIGHT_ATTR, String(index));

    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = `${left}px`;
    overlay.style.top = `${top}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.border = `2px solid ${color}`;
    overlay.style.background = `${color}26`;
    overlay.style.boxSizing = 'border-box';

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.left = `${left + Math.max(0, rect.width - 28)}px`;
    label.style.top = `${Math.max(0, top - 16)}px`;
    label.style.padding = '1px 5px';
    label.style.fontSize = '10px';
    label.style.fontWeight = '700';
    label.style.lineHeight = '1.2';
    label.style.borderRadius = '4px';
    label.style.background = color;
    label.style.color = '#ffffff';
    label.textContent = String(index);

    container.appendChild(overlay);
    container.appendChild(label);
  });
}
