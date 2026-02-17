import type { InteractionSnapshotPayload } from '@shared/types';
import type { InteractionRunOptions } from './run-step-types';

const CONTENT_CONNECTION_ERROR_MESSAGES = [
  'Could not establish connection. Receiving end does not exist.',
  'The message port closed before a response was received.',
];

export function normalizeInstruction(instruction: string): string {
  const normalized = instruction.replace(/\s+/g, ' ').trim();
  if (!normalized) throw new Error('Enter an instruction first');
  return normalized;
}

export function extractErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createAbortError(): Error {
  const error = new Error('Agent run aborted');
  error.name = 'AbortError';
  return error;
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.name === 'AbortError') return true;
    if (/aborted|cancelled/i.test(error.message)) return true;
  }
  return false;
}

export function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw createAbortError();
}

export function isContentConnectionUnavailableError(error: unknown): boolean {
  const message = extractErrorMessage(error);
  return CONTENT_CONNECTION_ERROR_MESSAGES.some((needle) => message.includes(needle));
}

export function buildSyntheticSnapshot(params: {
  pageUrl: string;
  pageTitle: string;
  viewportWidth: number;
  viewportHeight: number;
}): InteractionSnapshotPayload {
  return {
    pageUrl: params.pageUrl,
    pageTitle: params.pageTitle,
    scrollY: 0,
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
    interactiveElements: [],
  };
}

export function emitProgressLine(options: InteractionRunOptions | undefined, line: string): void {
  options?.onProgress?.({ type: 'line', line });
}

export function emitProgressScreenshot(
  onProgress: InteractionRunOptions['onProgress'] | undefined,
  stepNumber: number,
  canvas: HTMLCanvasElement,
): string | null {
  if (!onProgress) return null;
  const imageDataUrl = canvas.toDataURL('image/png');
  onProgress({
    type: 'screenshot',
    stepNumber,
    imageDataUrl,
    width: canvas.width,
    height: canvas.height,
  });
  return imageDataUrl;
}

export function normalizeComparableUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = '';
    return url.toString();
  } catch {
    return value.trim();
  }
}

export function isSameDestination(currentUrl: string, targetUrl: string): boolean {
  return normalizeComparableUrl(currentUrl) === normalizeComparableUrl(targetUrl);
}
