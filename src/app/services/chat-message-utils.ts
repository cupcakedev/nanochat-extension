import type { ChatMessage, TokenStats } from '@shared/types';

export interface ContextUsage {
  used: number;
  total: number;
  percent: number;
}

export function replaceLastMessageContent(prev: ChatMessage[], content: string): ChatMessage[] {
  const updated = [...prev];
  const last = updated[updated.length - 1];
  updated[updated.length - 1] = { ...last, content };
  return updated;
}

export function appendTokenToLastMessage(prev: ChatMessage[], token: string): ChatMessage[] {
  const last = prev[prev.length - 1];
  return replaceLastMessageContent(prev, last.content + token);
}

export function trimLastMessageTrailingWhitespace(prev: ChatMessage[]): ChatMessage[] {
  const last = prev[prev.length - 1];
  const trimmed = last.content.trimEnd();
  if (trimmed === last.content) return prev;
  return replaceLastMessageContent(prev, trimmed);
}

export function createChatMessage(
  role: 'user' | 'assistant',
  content: string,
  images?: string[],
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    ...(images?.length ? { images } : {}),
    timestamp: Date.now(),
  };
}

export function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An error occurred during generation';
}

export function toContextUsage(raw: { used: number; total: number }): ContextUsage {
  return { ...raw, percent: Math.round((raw.used / raw.total) * 100) };
}

export function calculateTokenStats(tokenCount: number, startTime: number): TokenStats {
  const duration = (performance.now() - startTime) / 1000;
  return {
    tokenCount,
    duration,
    tokensPerSecond: tokenCount / duration,
  };
}
