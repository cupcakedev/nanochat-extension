import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@sidepanel/services/prompt';
import { shouldEnableDevTrace, toContextUsage } from '@sidepanel/services/chat';
import type { ContextUsage } from '@sidepanel/types/chat';
import type { ContextUsageSnapshot, OnMessagesChange, PerChatPageContext } from '@sidepanel/types/chat-hook';
import type { DevTraceItem } from '@sidepanel/types/dev-trace';
import { ChatMode } from '@sidepanel/types/mode';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';
import { useChatSend } from './useChatSend';

export type { ContextUsage };

export function useChat(
  serviceRef: RefObject<PromptAPIService>,
  chatId: string | null,
  initialMessages: ChatMessage[],
  initialContextUsage?: ContextUsageSnapshot | null,
  onMessagesChange?: OnMessagesChange,
  mode: ChatMode = ChatMode.Chat,
  pageSource?: PageSource | null,
  onAgentContextUnavailable?: (message: string) => void,
) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
  const [devTraceItems, setDevTraceItems] = useState<DevTraceItem[]>([]);
  const [chatContextChipSourceOverride, setChatContextChipSourceOverride] = useState<
    PageSource | null | undefined
  >(undefined);
  const [multimodalModalOpen, setMultimodalModalOpen] = useState(false);
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(
    initialContextUsage ? toContextUsage(initialContextUsage) : null,
  );

  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const pageSourceRef = useRef(pageSource);
  const chatIdRef = useRef(chatId);
  const lockedContextByChatIdRef = useRef<Map<string, PerChatPageContext>>(new Map());

  const devTraceEnabled = shouldEnableDevTrace(mode);

  const resetState = useCallback(
    (msgs: ChatMessage[], ctx?: { used: number; total: number } | null) => {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages(msgs);
      setStreaming(false);
      setTokenStats(null);
      setDevTraceItems([]);
      setChatContextChipSourceOverride(undefined);
      setMultimodalModalOpen(false);
      setContextUsage(ctx ? toContextUsage(ctx) : null);
    },
    [],
  );

  const showMultimodalUnsupportedModal = useCallback((_message: string) => {
    setMultimodalModalOpen(true);
  }, []);

  const closeMultimodalUnsupportedModal = useCallback(() => {
    setMultimodalModalOpen(false);
  }, []);

  useEffect(() => {
    if (chatIdRef.current === chatId) return;
    chatIdRef.current = chatId;
    queueMicrotask(() => {
      resetState(initialMessages, initialContextUsage);
    });
  }, [chatId, initialContextUsage, initialMessages, resetState]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    pageSourceRef.current = pageSource;
  }, [pageSource]);

  const send = useChatSend({
    mode,
    serviceRef,
    messagesRef,
    pageSourceRef,
    chatIdRef,
    abortRef,
    lockedContextByChatIdRef,
    setMessages,
    setStreaming,
    setTokenStats,
    setContextUsage,
    setDevTraceItems,
    setChatContextChipSourceOverride,
    onMessagesChange,
    onMultimodalInputUnsupported: showMultimodalUnsupportedModal,
    onAgentContextUnavailable,
  });

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    messages,
    streaming,
    tokenStats,
    contextUsage,
    devTraceItems,
    devTraceEnabled,
    chatContextChipSourceOverride,
    multimodalModalOpen,
    closeMultimodalUnsupportedModal,
    send,
    stop,
  };
}
