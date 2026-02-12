import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import type { ChatMessage, TokenStats } from '@shared/types';

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

function calculateTokenStats(tokenCount: number, startTime: number): TokenStats {
  const duration = (performance.now() - startTime) / 1000;
  return {
    tokenCount,
    duration,
    tokensPerSecond: tokenCount / duration,
  };
}

export function useChat(
  serviceRef: RefObject<PromptAPIService>,
  chatId: string | null,
  initialMessages: ChatMessage[],
  onMessagesChange?: (messages: ChatMessage[]) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  useEffect(() => {
    abortRef.current?.abort();
    setMessages(initialMessages);
    setStreaming(false);
    setTokenStats(null);
  }, [chatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(
    async (text: string, images?: string[]) => {
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

        if (tokenCount > 0) {
          setTokenStats(calculateTokenStats(tokenCount, startTime));
        }

        onMessagesChange?.(trimmed);
      }
    },
    [serviceRef, onMessagesChange],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setStreaming(false);
    setTokenStats(null);
    onMessagesChange?.([]);
  }, [onMessagesChange]);

  return { messages, streaming, tokenStats, send, stop, clear };
}
