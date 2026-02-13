import { createIndicatorRoot, createPulseChip, PULSE_KEYFRAMES } from './agent-indicator-elements';

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

function resolveBottomOffset(): number {
  if (state.indicatorBottomOffset !== null) {
    return state.indicatorBottomOffset;
  }

  const fallback = window.innerHeight * CONFIG.fallbackBottomViewportRatio;
  return Math.round(clamp(fallback, CONFIG.fallbackBottomMin, CONFIG.fallbackBottomMax));
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

  const root = createIndicatorRoot(CONFIG.rootId, CONFIG.zIndex);
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
