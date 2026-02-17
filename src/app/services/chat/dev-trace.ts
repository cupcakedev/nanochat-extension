import { DevTraceKind } from '@app/types/dev-trace';
import type { DevTraceItem } from '@app/types/dev-trace';
import type { InteractionProgressEvent } from '@app/services/page/interaction';
import { ChatMode } from '@app/types/mode';

export function readDevTraceFlag(): boolean {
  try {
    const queryFlag = new URLSearchParams(window.location.search).get('devTrace') === '1';
    const storageFlag = window.localStorage.getItem('nanochat:devTrace') === '1';
    return queryFlag || storageFlag;
  } catch {
    return false;
  }
}

export function shouldEnableDevTrace(mode: ChatMode): boolean {
  if (mode !== ChatMode.Agent) return false;
  return import.meta.env.DEV || readDevTraceFlag();
}

export function toLineTraceItem(line: string): DevTraceItem {
  return { id: crypto.randomUUID(), kind: DevTraceKind.Line, line };
}

export function toScreenshotTraceItem(
  event: Extract<InteractionProgressEvent, { type: 'screenshot' }>,
): DevTraceItem {
  return {
    id: crypto.randomUUID(),
    kind: DevTraceKind.Screenshot,
    stepNumber: event.stepNumber,
    imageDataUrl: event.imageDataUrl,
    width: event.width,
    height: event.height,
  };
}

export function appendTraceItem(prev: DevTraceItem[], item: DevTraceItem): DevTraceItem[] {
  return [...prev, item];
}
