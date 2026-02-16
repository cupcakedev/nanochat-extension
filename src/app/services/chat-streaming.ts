import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import {
  appendTokenToLastMessage,
  calculateTokenStats,
  extractErrorMessage,
  replaceLastMessageContent,
  resolvePageSourceForPersist,
  toContextUsage,
  trimLastMessageTrailingWhitespace,
  type ContextUsage,
} from '@app/services/chat-message-utils';
import type { ChatMode } from '@app/types/mode';
import { createLogger } from '@shared/utils';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';

const logger = createLogger('chat-streaming');

export interface ChatStreamRefs {
  serviceRef: RefObject<PromptAPIService>;
  messagesRef: RefObject<ChatMessage[]>;
  pageSourceRef: RefObject<PageSource | null | undefined>;
  abortRef: RefObject<AbortController | null>;
}

export interface ChatStreamSetters {
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setStreaming: (v: boolean) => void;
  setTokenStats: (v: TokenStats | null) => void;
  setContextUsage: (v: ContextUsage | null) => void;
  onMessagesChange?: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource | null,
  ) => void;
}

export async function executeChatStream(
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  systemPrompt: string | null,
  pageSourceOverride: PageSource | null | undefined,
  mode: ChatMode,
  refs: ChatStreamRefs,
  setters: ChatStreamSetters,
): Promise<void> {
  setters.setMessages((prev) => [...prev, userMessage, assistantMessage]);
  setters.setStreaming(true);
  setters.setTokenStats(null);

  const abortController = new AbortController();
  (refs.abortRef as { current: AbortController | null }).current = abortController;
  const startTime = performance.now();
  let tokenCount = 0;

  try {
    const allMessages = [...refs.messagesRef.current, userMessage];
    await refs.serviceRef.current.streamChat(
      allMessages,
      (token) => {
        tokenCount += 1;
        setters.setMessages((prev) => appendTokenToLastMessage(prev as ChatMessage[], token));
      },
      abortController.signal,
      systemPrompt,
    );
  } catch (error) {
    if (!abortController.signal.aborted) {
      setters.setMessages((prev) =>
        replaceLastMessageContent(prev as ChatMessage[], `Error: ${extractErrorMessage(error)}`),
      );
    }
  } finally {
    const trimmedMessages = trimLastMessageTrailingWhitespace(refs.messagesRef.current);
    const usage = refs.serviceRef.current.getContextUsage();
    const rawUsage = usage ? { used: usage.used, total: usage.total } : undefined;
    const stats = tokenCount > 0 ? calculateTokenStats(tokenCount, startTime) : null;
    const pageSourceToPersist = resolvePageSourceForPersist(refs.pageSourceRef.current, pageSourceOverride);

    setters.setMessages(trimmedMessages);
    setters.setStreaming(false);
    setters.setTokenStats(stats);
    setters.setContextUsage(rawUsage ? toContextUsage(rawUsage) : null);
    (refs.abortRef as { current: AbortController | null }).current = null;

    logger.info('send:complete', {
      mode,
      tokenCount,
      duration: stats?.duration.toFixed(2),
      tokensPerSecond: stats?.tokensPerSecond.toFixed(1),
    });

    setters.onMessagesChange?.(trimmedMessages, rawUsage, pageSourceToPersist);
  }
}
