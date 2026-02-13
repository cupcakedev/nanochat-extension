const FAVICON_SELECTORS = ["link[rel='icon']", "link[rel='shortcut icon']", "link[rel*='icon']"];

const PULSE_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translate3d(-16px, 0, 0)' },
  { opacity: 1, transform: 'translate3d(0, 0, 0)', offset: 0.24 },
  { opacity: 1, transform: 'translate3d(0, 0, 0)', offset: 0.62 },
  { opacity: 1, transform: 'translate3d(88px, 0, 0)', offset: 0.86 },
  { opacity: 0, transform: 'translate3d(182px, 0, 0)' },
];

export { PULSE_KEYFRAMES };

export function createStyledElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element.style, styles);
  return element;
}

function resolveFaviconUrl(): string {
  for (const selector of FAVICON_SELECTORS) {
    const link = document.querySelector<HTMLLinkElement>(selector);
    const href = link?.href;
    if (!href) continue;

    try {
      return new URL(href, window.location.href).href;
    } catch {
      continue;
    }
  }

  return `${window.location.origin}/favicon.ico`;
}

function createFallbackDot(): HTMLSpanElement {
  const dot = createStyledElement('span', {
    width: '16px',
    height: '16px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    background: 'rgba(59, 59, 62, 0.3)',
    color: '#A8A8AC',
    fontSize: '10px',
    lineHeight: '10px',
    flexShrink: '0',
  });

  dot.textContent = '•';
  return dot;
}

function createFaviconElement(): HTMLElement {
  const favicon = createStyledElement('img', {
    width: '16px',
    height: '16px',
    borderRadius: '4px',
    flexShrink: '0',
  });

  favicon.src = resolveFaviconUrl();
  favicon.alt = '';
  favicon.onerror = () => {
    if (!favicon.parentElement) return;
    favicon.replaceWith(createFallbackDot());
  };

  return favicon;
}

export function createIndicatorRoot(rootId: string, zIndex: string): HTMLDivElement {
  const root = createStyledElement('div', {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex,
    overflow: 'hidden',
  });

  root.id = rootId;
  return root;
}

export function createPulseChip(bottomOffset: number): HTMLDivElement {
  const pulse = createStyledElement('div', {
    position: 'fixed',
    right: '22px',
    bottom: `${bottomOffset}px`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    background: 'rgba(39, 39, 42, 0.8)',
    backdropFilter: 'blur(12px)',
    padding: '8px 14px',
    minHeight: '32px',
    boxSizing: 'border-box',
    boxShadow: 'none',
    opacity: '0',
    transform: 'translate3d(-16px, 0, 0)',
  });

  pulse.style.setProperty('-webkit-backdrop-filter', 'blur(12px)');
  pulse.append(createFaviconElement());
  return pulse;
}
