import { useCallback } from 'react';
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
} from '@sidepanel/services/chat';
import type {
  ChatStreamRefs,
  ChatStreamSetters,
  InteractiveRefs,
  InteractiveSetters,
} from '@sidepanel/types/execution';
import { ChatContextSendMode, ChatMode } from '@sidepanel/types/mode';
import type { ChatSendOptions } from '@sidepanel/types/mode';
import type { OnMessagesChange, PerChatPageContext } from '@sidepanel/types/chat-hook';
import { createLogger } from '@shared/utils';
import { MessageRole } from '@shared/types';
import type { ChatMessage, PageSource } from '@shared/types';

const logger = createLogger('useChat');

interface UseChatSendParams {
  mode: ChatMode;
  serviceRef: RefObject<PromptAPIService>;
  messagesRef: RefObject<ChatMessage[]>;
  pageSourceRef: RefObject<PageSource | null | undefined>;
  chatIdRef: RefObject<string | null>;
  abortRef: RefObject<AbortController | null>;
  lockedContextByChatIdRef: RefObject<Map<string, PerChatPageContext>>;
  setMessages: ChatStreamSetters['setMessages'];
  setStreaming: ChatStreamSetters['setStreaming'];
  setTokenStats: ChatStreamSetters['setTokenStats'];
  setContextUsage: ChatStreamSetters['setContextUsage'];
  setDevTraceItems: InteractiveSetters['setDevTraceItems'];
  setChatContextChipSourceOverride: InteractiveSetters['setChatContextChipSourceOverride'];
  onMessagesChange?: OnMessagesChange;
  onMultimodalInputUnsupported: (message: string) => void;
  onAgentContextUnavailable?: (message: string) => void;
}

export function useChatSend({
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
  onMultimodalInputUnsupported,
  onAgentContextUnavailable,
}: UseChatSendParams) {
  const fetchPageContext = useCallback(
    async (
      options: ChatSendOptions | undefined,
      currentChatId: string | null,
    ): Promise<PerChatPageContext | null> => {
      if (resolveChatContextSendMode(options) !== ChatContextSendMode.WithPageContext) {
        setChatContextChipSourceOverride(null);
        return null;
      }

      const locked = currentChatId ? lockedContextByChatIdRef.current.get(currentChatId) : undefined;
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
    [lockedContextByChatIdRef, setChatContextChipSourceOverride],
  );

  return useCallback(
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
          onMultimodalInputUnsupported,
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
        onMultimodalInputUnsupported,
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
      abortRef,
      chatIdRef,
      fetchPageContext,
      messagesRef,
      mode,
      onAgentContextUnavailable,
      onMessagesChange,
      onMultimodalInputUnsupported,
      pageSourceRef,
      serviceRef,
      setChatContextChipSourceOverride,
      setContextUsage,
      setDevTraceItems,
      setMessages,
      setStreaming,
      setTokenStats,
    ],
  );
}
