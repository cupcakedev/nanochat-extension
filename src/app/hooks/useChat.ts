import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import {
  AgentContextUnavailableError,
  buildAgentSystemPrompt,
} from '@app/services/agent-context';
import {
  appendTokenToLastMessage,
  calculateTokenStats,
  createChatMessage,
  extractErrorMessage,
  replaceLastMessageContent,
  toContextUsage,
  trimLastMessageTrailingWhitespace,
  type ContextUsage,
} from '@app/services/chat-message-utils';
import { createLogger } from '@shared/utils';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';

const logger = createLogger('useChat');

export type { ContextUsage };

export function useChat(
  serviceRef: RefObject<PromptAPIService>,
  chatId: string | null,
  initialMessages: ChatMessage[],
  initialContextUsage?: { used: number; total: number } | null,
  onMessagesChange?: (messages: ChatMessage[], contextUsage?: { used: number; total: number }, pageSource?: PageSource) => void,
  mode: 'chat' | 'agent' = 'chat',
  pageSource?: PageSource | null,
  onAgentContextUnavailable?: (message: string) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pageSourceRef = useRef(pageSource);
  pageSourceRef.current = pageSource;

  const resetState = useCallback(
    (msgs: ChatMessage[], ctx?: { used: number; total: number } | null) => {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages(msgs);
      setStreaming(false);
      setTokenStats(null);
      setContextUsage(ctx ? toContextUsage(ctx) : null);
    },
    [],
  );

  useEffect(() => {
    resetState(initialMessages, initialContextUsage);
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    async (text: string, images?: string[]) => {
      logger.info('send:start', { mode, textLength: text.length, imageCount: images?.length ?? 0 });

      let systemPrompt: string | null = null;
      if (mode === 'agent') {
        try {
          systemPrompt = await buildAgentSystemPrompt();
        } catch (err) {
          if (err instanceof AgentContextUnavailableError) {
            onAgentContextUnavailable?.(err.message);
            return;
          }
          const errorMessage = extractErrorMessage(err);
          const userMessage = createChatMessage('user', text, images);
          const assistantMessage = createChatMessage('assistant', `Error: ${errorMessage}`);
          const failedMessages = [...messagesRef.current, userMessage, assistantMessage];
          setMessages(failedMessages);
          setTokenStats(null);
          setStreaming(false);
          onMessagesChange?.(failedMessages, undefined, pageSourceRef.current ?? undefined);
          return;
        }
      }

      const userMessage = createChatMessage('user', text, images);
      const assistantMessage = createChatMessage('assistant', '');

      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      setStreaming(true);
      setTokenStats(null);

      const abortController = new AbortController();
      abortRef.current = abortController;

      const startTime = performance.now();
      let tokenCount = 0;

      try {
        const allMessages = [...messagesRef.current, userMessage];

        await serviceRef.current.streamChat(
          allMessages,
          (token) => {
            tokenCount++;
            setMessages((prev) => appendTokenToLastMessage(prev, token));
          },
          abortController.signal,
          systemPrompt,
        );
      } catch (err) {
        if (abortController.signal.aborted) return;
        const errorContent = `Error: ${extractErrorMessage(err)}`;
        setMessages((prev) => replaceLastMessageContent(prev, errorContent));
      } finally {
        const trimmed = trimLastMessageTrailingWhitespace(messagesRef.current);
        setMessages(trimmed);
        setStreaming(false);
        abortRef.current = null;

        const stats = tokenCount > 0 ? calculateTokenStats(tokenCount, startTime) : null;
        setTokenStats(stats);

        const usage = serviceRef.current.getContextUsage();
        const ctxUsage = usage ? { used: usage.used, total: usage.total } : undefined;
        setContextUsage(ctxUsage ? toContextUsage(ctxUsage) : null);

        logger.info('send:complete', {
          mode,
          tokenCount,
          duration: stats?.duration.toFixed(2),
          tokensPerSecond: stats?.tokensPerSecond.toFixed(1),
        });

        onMessagesChange?.(trimmed, ctxUsage, pageSourceRef.current ?? undefined);
      }
    },
    [serviceRef, onMessagesChange, mode, onAgentContextUnavailable],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    resetState([]);
    onMessagesChange?.([]);
  }, [resetState, onMessagesChange]);

  return { messages, streaming, tokenStats, contextUsage, send, stop, clear };
}
