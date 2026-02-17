import type { MutableRefObject } from 'react';
import { AGENT_CONTEXT_UNAVAILABLE_MESSAGE } from './context';

export interface AgentContextChip {
  url: string;
  title: string;
  faviconUrl: string;
}

export function resolveSiteTitle(title: string, url: string): string {
  if (title.trim()) return title.trim();
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Current site';
  }
}

export function extractAgentErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : AGENT_CONTEXT_UNAVAILABLE_MESSAGE;
}

export function clearTimerRef(ref: MutableRefObject<number | null>): void {
  if (ref.current === null) return;
  window.clearTimeout(ref.current);
  ref.current = null;
}
