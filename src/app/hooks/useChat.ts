import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import { AgentContextUnavailableError, buildAgentSystemPrompt } from '@app/services/agent-context';
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
import {
  extractInteractionUsage,
  formatInteractionAssistantMessage,
  runPageInteractionStep,
} from '@app/services/page-interaction';
import type { ChatMode } from '@app/types/mode';
import { createLogger } from '@shared/utils';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';

const logger = createLogger('useChat');

export type { ContextUsage };

function setAssistantCompletion(
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

export function useChat(
  serviceRef: RefObject<PromptAPIService>,
  chatId: string | null,
  initialMessages: ChatMessage[],
  initialContextUsage?: { used: number; total: number } | null,
  onMessagesChange?: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource,
  ) => void,
  mode: ChatMode = 'chat',
  pageSource?: PageSource | null,
  onAgentContextUnavailable?: (message: string) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(
    initialContextUsage ? toContextUsage(initialContextUsage) : null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const pageSourceRef = useRef(pageSource);
  const chatIdRef = useRef(chatId);

  messagesRef.current = messages;
  pageSourceRef.current = pageSource;

  const resetState = useCallback((msgs: ChatMessage[], ctx?: { used: number; total: number } | null) => {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages(msgs);
    setStreaming(false);
    setTokenStats(null);
    setContextUsage(ctx ? toContextUsage(ctx) : null);
  }, []);

  useEffect(() => {
    if (chatIdRef.current === chatId) return;
    chatIdRef.current = chatId;
    resetState(initialMessages, initialContextUsage);
  }, [chatId, initialContextUsage, initialMessages, resetState]);

  const sendInteractive = useCallback(async (
    text: string,
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
  ) => {
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setStreaming(true);
    setTokenStats(null);

    try {
      const result = await runPageInteractionStep(text);
      const usage = extractInteractionUsage(result);
      const formatted = formatInteractionAssistantMessage(result);
      const completedMessages = setAssistantCompletion(
        [...messagesRef.current, userMessage, assistantMessage],
        formatted,
        [result.screenshotDataUrl],
      );
      setMessages(completedMessages);
      setContextUsage(usage ? toContextUsage(usage) : null);
      onMessagesChange?.(completedMessages, usage, pageSourceRef.current ?? undefined);
    } catch (error) {
      const completedMessages = setAssistantCompletion(
        [...messagesRef.current, userMessage, assistantMessage],
        `Error: ${extractErrorMessage(error)}`,
      );
      setMessages(completedMessages);
      setContextUsage(null);
      onMessagesChange?.(completedMessages, undefined, pageSourceRef.current ?? undefined);
    } finally {
      setStreaming(false);
    }
  }, [onMessagesChange]);

  const sendChat = useCallback(async (
    userMessage: ChatMessage,
    assistantMessage: ChatMessage,
    systemPrompt: string | null,
  ) => {
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
          tokenCount += 1;
          setMessages((prev) => appendTokenToLastMessage(prev, token));
        },
        abortController.signal,
        systemPrompt,
      );
    } catch (error) {
      if (!abortController.signal.aborted) {
        setMessages((prev) => replaceLastMessageContent(prev, `Error: ${extractErrorMessage(error)}`));
      }
    } finally {
      const trimmedMessages = trimLastMessageTrailingWhitespace(messagesRef.current);
      const usage = serviceRef.current.getContextUsage();
      const rawUsage = usage ? { used: usage.used, total: usage.total } : undefined;
      const stats = tokenCount > 0 ? calculateTokenStats(tokenCount, startTime) : null;

      setMessages(trimmedMessages);
      setStreaming(false);
      setTokenStats(stats);
      setContextUsage(rawUsage ? toContextUsage(rawUsage) : null);
      abortRef.current = null;

      logger.info('send:complete', {
        mode,
        tokenCount,
        duration: stats?.duration.toFixed(2),
        tokensPerSecond: stats?.tokensPerSecond.toFixed(1),
      });

      onMessagesChange?.(trimmedMessages, rawUsage, pageSourceRef.current ?? undefined);
    }
  }, [mode, onMessagesChange, serviceRef]);

  const send = useCallback(async (text: string, images?: string[]) => {
    logger.info('send:start', { mode, textLength: text.length, imageCount: images?.length ?? 0 });

    let systemPrompt: string | null = null;
    if (mode === 'agent') {
      try {
        systemPrompt = await buildAgentSystemPrompt();
      } catch (error) {
        if (error instanceof AgentContextUnavailableError) {
          onAgentContextUnavailable?.(error.message);
          return;
        }

        const userMessage = createChatMessage('user', text, images);
        const failedMessages = [
          ...messagesRef.current,
          userMessage,
          createChatMessage('assistant', `Error: ${extractErrorMessage(error)}`),
        ];
        setMessages(failedMessages);
        setStreaming(false);
        setTokenStats(null);
        onMessagesChange?.(failedMessages, undefined, pageSourceRef.current ?? undefined);
        return;
      }
    }

    const userMessage = createChatMessage('user', text, images);
    const assistantMessage = createChatMessage('assistant', '');

    if (mode === 'interactive') {
      await sendInteractive(text, userMessage, assistantMessage);
      return;
    }

    await sendChat(userMessage, assistantMessage, systemPrompt);
  }, [mode, onAgentContextUnavailable, onMessagesChange, sendChat, sendInteractive]);

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    resetState([]);
    onMessagesChange?.([]);
  }, [onMessagesChange, resetState]);

  return { messages, streaming, tokenStats, contextUsage, send, stop, clear };
}
