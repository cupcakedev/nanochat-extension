const CONFIG = {
  rootId: 'nanochat-agent-connection-indicator',
  zIndex: '2147483647',
  durationMs: 1700,
  cleanupDelayMs: 150,
  minBottomOffset: 80,
  maxBottomOffset: 360,
  fallbackBottomMin: 145,
  fallbackBottomMax: 250,
  fallbackBottomViewportRatio: 0.245,
} as const;

const FAVICON_SELECTORS = ["link[rel='icon']", "link[rel='shortcut icon']", "link[rel*='icon']"];

const PULSE_KEYFRAMES: Keyframe[] = [
  { opacity: 0, transform: 'translate3d(-16px, 0, 0)' },
  { opacity: 1, transform: 'translate3d(0, 0, 0)', offset: 0.24 },
  { opacity: 1, transform: 'translate3d(0, 0, 0)', offset: 0.62 },
  { opacity: 1, transform: 'translate3d(88px, 0, 0)', offset: 0.86 },
  { opacity: 0, transform: 'translate3d(182px, 0, 0)' },
];

type IndicatorState = {
  removeTimer: number | null;
  indicatorBottomOffset: number | null;
  activeRoot: HTMLDivElement | null;
};

const state: IndicatorState = {
  removeTimer: null,
  indicatorBottomOffset: null,
  activeRoot: null,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function createStyledElement<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  styles: Partial<CSSStyleDeclaration>,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  Object.assign(element.style, styles);
  return element;
}

function resolveBottomOffset(): number {
  if (state.indicatorBottomOffset !== null) {
    return state.indicatorBottomOffset;
  }

  const fallback = window.innerHeight * CONFIG.fallbackBottomViewportRatio;
  return Math.round(clamp(fallback, CONFIG.fallbackBottomMin, CONFIG.fallbackBottomMax));
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

function createIndicatorRoot(): HTMLDivElement {
  const root = createStyledElement('div', {
    position: 'fixed',
    inset: '0',
    pointerEvents: 'none',
    zIndex: CONFIG.zIndex,
    overflow: 'hidden',
  });

  root.id = CONFIG.rootId;
  return root;
}

function createPulseChip(bottomOffset: number): HTMLDivElement {
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

function clearRemoveTimer(): void {
  if (state.removeTimer === null) return;
  window.clearTimeout(state.removeTimer);
  state.removeTimer = null;
}

function removeActiveIndicator(): void {
  clearRemoveTimer();

  const root = state.activeRoot ?? document.getElementById(CONFIG.rootId);
  if (!root) return;

  root.getAnimations().forEach((animation) => animation.cancel());
  root.remove();
  state.activeRoot = null;
}

function scheduleRemoval(root: HTMLDivElement): void {
  state.removeTimer = window.setTimeout(() => {
    root.remove();
    state.activeRoot = null;
    state.removeTimer = null;
  }, CONFIG.durationMs + CONFIG.cleanupDelayMs);
}

export function setAgentIndicatorBottomOffset(bottomOffset: number): void {
  if (!Number.isFinite(bottomOffset)) return;

  state.indicatorBottomOffset = Math.round(
    clamp(bottomOffset, CONFIG.minBottomOffset, CONFIG.maxBottomOffset),
  );
}

export function pulseAgentConnectionIndicator(): void {
  if (window !== window.top || !document.documentElement) return;

  removeActiveIndicator();

  const root = createIndicatorRoot();
  const pulse = createPulseChip(resolveBottomOffset());
  root.append(pulse);
  document.documentElement.appendChild(root);
  state.activeRoot = root;

  pulse.animate(PULSE_KEYFRAMES, {
    duration: CONFIG.durationMs,
    easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    fill: 'forwards',
  });

  scheduleRemoval(root);
}
