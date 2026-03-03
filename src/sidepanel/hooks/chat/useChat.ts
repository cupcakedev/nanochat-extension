import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@sidepanel/services/prompt';
import {
  AgentContextUnavailableError,
  buildAgentSystemPromptWithContext,
} from '@sidepanel/services/agent';
import {
  createChatMessage,
  executeChatStream,
  executeInteractiveStep,
  extractErrorMessage,
  resolveChatContextSendMode,
  shouldEnableDevTrace,
  toContextUsage,
} from '@sidepanel/services/chat';
import type { ContextUsage } from '@sidepanel/types/chat';
import type { ChatStreamRefs, ChatStreamSetters, InteractiveRefs, InteractiveSetters } from '@sidepanel/types/execution';
import type { DevTraceItem } from '@sidepanel/types/dev-trace';
import { ChatContextSendMode, ChatMode } from '@sidepanel/types/mode';
import type { ChatSendOptions } from '@sidepanel/types/mode';
import { createLogger } from '@shared/utils';
import { MessageRole } from '@shared/types';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';

export type { ContextUsage };

const logger = createLogger('useChat');

interface PerChatPageContext {
  systemPrompt: string;
  pageSource: PageSource;
}

export function useChat(
  serviceRef: RefObject<PromptAPIService>,
  chatId: string | null,
  initialMessages: ChatMessage[],
  initialContextUsage?: { used: number; total: number } | null,
  onMessagesChange?: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource | null,
  ) => void,
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

  messagesRef.current = messages;
  pageSourceRef.current = pageSource;

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
    resetState(initialMessages, initialContextUsage);
  }, [chatId, initialContextUsage, initialMessages, resetState]);

  const fetchPageContext = useCallback(
    async (
      options: ChatSendOptions | undefined,
      currentChatId: string | null,
    ): Promise<PerChatPageContext | null> => {
      if (resolveChatContextSendMode(options) !== ChatContextSendMode.WithPageContext) {
        setChatContextChipSourceOverride(null);
        return null;
      }

      const locked = currentChatId
        ? lockedContextByChatIdRef.current.get(currentChatId)
        : undefined;
      if (locked) {
        setChatContextChipSourceOverride(locked.pageSource);
        return locked;
      }

      const ctx = await buildAgentSystemPromptWithContext();
      const pageSource: PageSource = {
        url: ctx.tab.url,
        title: ctx.tab.title,
        faviconUrl: ctx.tab.favIconUrl,
      };
      setChatContextChipSourceOverride(pageSource);
      if (currentChatId && !lockedContextByChatIdRef.current.has(currentChatId)) {
        lockedContextByChatIdRef.current.set(currentChatId, {
          systemPrompt: ctx.systemPrompt,
          pageSource,
        });
      }
      return { systemPrompt: ctx.systemPrompt, pageSource };
    },
    [],
  );

  const send = useCallback(
    async (text: string, images?: string[], options?: ChatSendOptions) => {
      logger.info('send:start', { mode, textLength: text.length, imageCount: images?.length ?? 0 });

      const userMessage = createChatMessage(MessageRole.User, text, images);
      const assistantMessage = createChatMessage(MessageRole.Assistant, '');

      if (mode === ChatMode.Agent) {
        const agentRefs: InteractiveRefs = { messagesRef, pageSourceRef };
        const agentHandlers: InteractiveSetters = {
          setMessages,
          setStreaming,
          setDevTraceItems,
          setContextUsage,
          setChatContextChipSourceOverride,
          onMessagesChange,
          onMultimodalInputUnsupported: showMultimodalUnsupportedModal,
        };
        const abortController = new AbortController();
        abortRef.current = abortController;
        try {
          await executeInteractiveStep(
            text,
            userMessage,
            assistantMessage,
            mode,
            agentRefs,
            agentHandlers,
            abortController.signal,
          );
        } finally {
          if (abortRef.current === abortController) abortRef.current = null;
        }
        return;
      }

      let pageContext: PerChatPageContext | null = null;
      try {
        pageContext = await fetchPageContext(options, chatIdRef.current);
      } catch (error) {
        if (error instanceof AgentContextUnavailableError) {
          onAgentContextUnavailable?.(error.message);
          return;
        }
        const errorMessages = [
          ...messagesRef.current,
          userMessage,
          createChatMessage(MessageRole.Assistant, `Error: ${extractErrorMessage(error)}`),
        ];
        setMessages(errorMessages);
        setStreaming(false);
        setTokenStats(null);
        onMessagesChange?.(errorMessages, undefined, pageSourceRef.current ?? undefined);
        return;
      }

      const chatRefs: ChatStreamRefs = { serviceRef, messagesRef, pageSourceRef, abortRef };
      const chatHandlers: ChatStreamSetters = {
        setMessages,
        setStreaming,
        setTokenStats,
        setContextUsage,
        onMessagesChange,
        onMultimodalInputUnsupported: showMultimodalUnsupportedModal,
      };
      await executeChatStream(
        userMessage,
        assistantMessage,
        pageContext?.systemPrompt ?? null,
        pageContext?.pageSource ?? null,
        mode,
        chatRefs,
        chatHandlers,
      );
    },
    [
      fetchPageContext,
      mode,
      onAgentContextUnavailable,
      onMessagesChange,
      serviceRef,
      showMultimodalUnsupportedModal,
    ],
  );

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
