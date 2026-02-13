import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import {
  AgentContextUnavailableError,
  buildAgentSystemPrompt,
} from '@app/services/agent-context';
import { createLogger } from '@shared/utils';
import type { ChatMessage, TokenStats } from '@shared/types';

const logger = createLogger('useChat');

function replaceLastMessageContent(prev: ChatMessage[], content: string): ChatMessage[] {
  const updated = [...prev];
  const last = updated[updated.length - 1];
  updated[updated.length - 1] = { ...last, content };
  return updated;
}

function appendTokenToLastMessage(prev: ChatMessage[], token: string): ChatMessage[] {
  const last = prev[prev.length - 1];
  return replaceLastMessageContent(prev, last.content + token);
}

function trimLastMessageTrailingWhitespace(prev: ChatMessage[]): ChatMessage[] {
  const last = prev[prev.length - 1];
  const trimmed = last.content.trimEnd();
  if (trimmed === last.content) return prev;
  return replaceLastMessageContent(prev, trimmed);
}

function createChatMessage(
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

function extractErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An error occurred during generation';
}

function toContextUsage(raw: { used: number; total: number }): ContextUsage {
  return { ...raw, percent: Math.round((raw.used / raw.total) * 100) };
}

function calculateTokenStats(tokenCount: number, startTime: number): TokenStats {
  const duration = (performance.now() - startTime) / 1000;
  return {
    tokenCount,
    duration,
    tokensPerSecond: tokenCount / duration,
  };
}

export interface ContextUsage {
  used: number;
  total: number;
  percent: number;
}

export function useChat(
  serviceRef: RefObject<PromptAPIService>,
  chatId: string | null,
  initialMessages: ChatMessage[],
  initialContextUsage?: { used: number; total: number } | null,
  onMessagesChange?: (messages: ChatMessage[], contextUsage?: { used: number; total: number }) => void,
  mode: 'chat' | 'agent' = 'chat',
  onAgentContextUnavailable?: (message: string) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

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
      logger.info('send:start', {
        mode,
        textLength: text.length,
        imageCount: images?.length ?? 0,
        historyLength: messagesRef.current.length,
      });

      let systemPrompt: string | null = null;
      if (mode === 'agent') {
        logger.info('send:buildingAgentContext');
        try {
          systemPrompt = await buildAgentSystemPrompt();
          logger.info('send:agentContextReady', { systemPromptLength: systemPrompt.length });
        } catch (err) {
          if (err instanceof AgentContextUnavailableError) {
            logger.warn('send:agentContextUnavailable', err.message);
            onAgentContextUnavailable?.(err.message);
            return;
          }
          const errorMessage = extractErrorMessage(err);
          logger.error('send:agentContextBuildFailed', errorMessage);
          const userMessage = createChatMessage('user', text, images);
          const assistantMessage = createChatMessage('assistant', `Error: ${errorMessage}`);
          const failedMessages = [...messagesRef.current, userMessage, assistantMessage];
          setMessages(failedMessages);
          setTokenStats(null);
          setStreaming(false);
          onMessagesChange?.(failedMessages);
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
        if (abortController.signal.aborted) {
          logger.info('send:aborted');
          return;
        }
        const errorContent = `Error: ${extractErrorMessage(err)}`;
        logger.error('send:error', errorContent);
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
          contextUsed: ctxUsage?.used,
          contextTotal: ctxUsage?.total,
        });

        onMessagesChange?.(trimmed, ctxUsage);
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
