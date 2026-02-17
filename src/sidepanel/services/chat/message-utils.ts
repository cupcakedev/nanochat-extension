import type { ChatMessage, PageSource, TokenStats } from '@shared/types';
import { MessageRole } from '@shared/types';
import { ChatContextSendMode } from '@sidepanel/types/mode';
import type { ChatSendOptions } from '@sidepanel/types/mode';

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
  role: MessageRole,
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

export function setAssistantCompletion(
  messages: ChatMessage[],
  content: string,
  images?: string[],
): ChatMessage[] {
  const updated = replaceLastMessageContent(messages, content);
  if (!images?.length) return updated;
  const next = [...updated];
  const last = next[next.length - 1];
  next[next.length - 1] = { ...last, images };
  return next;
}

export function resolvePageSourceForPersist(
  currentPageSource: PageSource | null | undefined,
  override?: PageSource | null,
): PageSource | null | undefined {
  if (override !== undefined) return override;
  return currentPageSource ?? undefined;
}

export function resolveChatContextSendMode(options?: ChatSendOptions): ChatContextSendMode {
  return options?.chatContextSendMode === ChatContextSendMode.WithPageContext
    ? ChatContextSendMode.WithPageContext
    : ChatContextSendMode.WithoutPageContext;
}
