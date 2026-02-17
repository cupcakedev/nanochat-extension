import { useCallback, useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@sidepanel/services/prompt';
import {
  AgentContextUnavailableError,
  buildAgentSystemPromptWithContext,
} from '@sidepanel/services/agent';
import {
  createChatMessage,
  extractErrorMessage,
  resolveChatContextSendMode,
  toContextUsage,
  type ContextUsage,
} from '@sidepanel/services/chat';
import { shouldEnableDevTrace } from '@sidepanel/services/chat';
import { executeChatStream } from '@sidepanel/services/chat';
import { executeInteractiveStep } from '@sidepanel/services/chat';
import type { DevTraceItem } from '@sidepanel/types/dev-trace';
import { ChatContextSendMode, ChatMode } from '@sidepanel/types/mode';
import type { ChatSendOptions } from '@sidepanel/types/mode';
import { createLogger } from '@shared/utils';
import { MessageRole } from '@shared/types';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';

export type { ContextUsage };

const logger = createLogger('useChat');

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
  const [contextUsage, setContextUsage] = useState<ContextUsage | null>(
    initialContextUsage ? toContextUsage(initialContextUsage) : null,
  );
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef(messages);
  const pageSourceRef = useRef(pageSource);
  const chatIdRef = useRef(chatId);
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
      setContextUsage(ctx ? toContextUsage(ctx) : null);
    },
    [],
  );

  useEffect(() => {
    if (chatIdRef.current === chatId) return;
    chatIdRef.current = chatId;
    resetState(initialMessages, initialContextUsage);
  }, [chatId, initialContextUsage, initialMessages, resetState]);

  const send = useCallback(
    async (text: string, images?: string[], options?: ChatSendOptions) => {
      logger.info('send:start', { mode, textLength: text.length, imageCount: images?.length ?? 0 });

      const interactiveRefs = { messagesRef, pageSourceRef };
      const streamRefs = { serviceRef, messagesRef, pageSourceRef, abortRef };

      const userMessage = createChatMessage(MessageRole.User, text, images);
      const assistantMessage = createChatMessage(MessageRole.Assistant, '');

      if (mode === ChatMode.Agent) {
        const setters = {
          setMessages,
          setStreaming,
          setDevTraceItems,
          setContextUsage,
          setChatContextChipSourceOverride,
          onMessagesChange,
        };
        const abortController = new AbortController();
        abortRef.current = abortController;
        try {
          await executeInteractiveStep(
            text,
            userMessage,
            assistantMessage,
            mode,
            interactiveRefs,
            setters,
            abortController.signal,
          );
        } finally {
          if (abortRef.current === abortController) {
            abortRef.current = null;
          }
        }
        return;
      }

      let systemPrompt: string | null = null;
      let pageSourceOverride: PageSource | null | undefined = null;
      if (resolveChatContextSendMode(options) === ChatContextSendMode.WithPageContext) {
        try {
          const contextPrompt = await buildAgentSystemPromptWithContext();
          systemPrompt = contextPrompt.systemPrompt;
          pageSourceOverride = {
            url: contextPrompt.tab.url,
            title: contextPrompt.tab.title,
            faviconUrl: contextPrompt.tab.favIconUrl,
          };
          setChatContextChipSourceOverride(pageSourceOverride);
        } catch (error) {
          if (error instanceof AgentContextUnavailableError) {
            onAgentContextUnavailable?.(error.message);
            return;
          }
          const failedMessages = [
            ...messagesRef.current,
            userMessage,
            createChatMessage(MessageRole.Assistant, `Error: ${extractErrorMessage(error)}`),
          ];
          setMessages(failedMessages);
          setStreaming(false);
          setTokenStats(null);
          onMessagesChange?.(failedMessages, undefined, pageSourceRef.current ?? undefined);
          return;
        }
      } else {
        setChatContextChipSourceOverride(null);
      }

      const setters = {
        setMessages,
        setStreaming,
        setTokenStats,
        setContextUsage,
        onMessagesChange,
      };
      await executeChatStream(
        userMessage,
        assistantMessage,
        systemPrompt,
        pageSourceOverride,
        mode,
        streamRefs,
        setters,
      );
    },
    [mode, onAgentContextUnavailable, onMessagesChange, serviceRef],
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
    send,
    stop,
  };
}
