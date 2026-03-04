import { useState, useCallback, useEffect } from 'react';
import { usePromptSession } from '@sidepanel/hooks/prompt';
import { useChat } from '@sidepanel/hooks/chat';
import { useChatContext } from '@sidepanel/hooks/chat';
import { useAgentMode } from '@sidepanel/hooks/agent';
import { useFullScreenMode } from '@sidepanel/hooks/ui';
import {
  AgentContextUnavailableError,
  buildAgentSystemPromptWithContext,
} from '@sidepanel/services/agent';
import { CHAT_INPUT_TOKEN_LIMIT, estimateChatInputTokens } from '@sidepanel/services/chat';
import { ChatContextSendMode, ChatMode, requiresPageContext } from '@sidepanel/types/mode';
import { SessionStatus } from '@shared/types';
import type { PageSource } from '@shared/types';

function resolveChatPageSource(
  persistedPageSource: PageSource | null | undefined,
  override: PageSource | null | undefined,
): PageSource | undefined {
  if (override === undefined) return persistedPageSource ?? undefined;
  return override ?? undefined;
}

function resolveMessageListPageSource(
  mode: ChatMode,
  persistedPageSource: PageSource | null | undefined,
  chatPageSource?: PageSource,
): PageSource | undefined {
  if (mode !== ChatMode.Chat) return undefined;
  if (chatPageSource) return undefined;
  return persistedPageSource ?? undefined;
}

function resolveChatContextAnimationKey(
  chatPageSource: PageSource | undefined,
  activeChatUpdatedAt: number | undefined,
  messageCount: number,
): number {
  if (!chatPageSource) return 0;
  if (activeChatUpdatedAt) return activeChatUpdatedAt;
  return messageCount;
}

function toActivePageSource(
  mode: ChatMode,
  chip: { url: string; title: string; faviconUrl: string } | null,
): PageSource | null {
  if (!requiresPageContext(mode) || !chip) return null;
  return { url: chip.url, title: chip.title, faviconUrl: chip.faviconUrl };
}

function buildContextTooLargeWarning(): string {
  return 'Page context is too large for this chat. Please use a different page or enter the details manually.';
}

export function useMainPageState() {
  const isFullScreen = useFullScreenMode();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatContextSource, setChatContextSource] = useState<PageSource | null>(null);
  const [autoContextWarning, setAutoContextWarning] = useState<string | null>(null);

  const {
    status,
    progress,
    error,
    retry,
    download,
    serviceRef,
    insufficientStorageModalOpen,
    closeInsufficientStorageModal,
  } = usePromptSession();

  const {
    chatSummaries,
    activeChatId,
    activeChat,
    loaded,
    createChat,
    selectChat,
    deleteChat,
    updateActiveChat,
  } = useChatContext();

  const initialMessages = activeChat?.messages ?? [];
  const hasInitialMessages = initialMessages.length > 0;

  const resolveContextSourceWithLimitCheck = useCallback(async () => {
    try {
      const context = await buildAgentSystemPromptWithContext();
      const source: PageSource = {
        url: context.tab.url,
        title: context.tab.title,
        faviconUrl: context.tab.favIconUrl,
      };
      const estimatedInputTokens = estimateChatInputTokens([], context.systemPrompt);
      if (estimatedInputTokens > CHAT_INPUT_TOKEN_LIMIT) {
        return {
          source: null,
          warning: buildContextTooLargeWarning(),
        };
      }
      return { source, warning: null as string | null };
    } catch (error) {
      if (error instanceof AgentContextUnavailableError) {
        return { source: null, warning: error.message };
      }
      return { source: null, warning: null as string | null };
    }
  }, []);

  useEffect(() => {
    if (hasInitialMessages) return;
    resolveContextSourceWithLimitCheck().then(({ source, warning }) => {
      setChatContextSource(source);
      setAutoContextWarning(warning);
    });
  }, [activeChatId, hasInitialMessages, resolveContextSourceWithLimitCheck]);

  const {
    mode,
    agentContextChip,
    agentContextChipVisible,
    agentNotice,
    agentChipAnimationKey,
    handleModeChange,
    showAgentUnavailable,
    restorePreferredMode,
    inputDockRef,
  } = useAgentMode(serviceRef, hasInitialMessages, isFullScreen);

  const activePageSource = toActivePageSource(mode, agentContextChip);

  const {
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
  } = useChat(
    serviceRef,
    activeChatId,
    initialMessages,
    activeChat?.contextUsage ?? null,
    updateActiveChat,
    mode,
    activePageSource,
    showAgentUnavailable,
  );

  const chatPageSource = resolveChatPageSource(
    activeChat?.pageSource,
    chatContextChipSourceOverride,
  );
  const hasMessages = messages.length > 0;
  const chatContextSourceForDock = hasMessages ? null : chatContextSource;
  const effectiveContextSource = hasMessages ? (chatPageSource ?? null) : chatContextSource;
  const contextMode = effectiveContextSource
    ? ChatContextSendMode.WithPageContext
    : ChatContextSendMode.WithoutPageContext;
  const messageListPageSource = resolveMessageListPageSource(
    mode,
    activeChat?.pageSource,
    chatPageSource,
  );
  const chatContextAnimationKey = resolveChatContextAnimationKey(
    chatPageSource,
    activeChat?.updatedAt,
    messages.length,
  );

  const isSessionLoading = status === SessionStatus.Loading;
  const isShowingOnboardingFlow =
    status === SessionStatus.NeedsDownload ||
    status === SessionStatus.Error ||
    (isSessionLoading && !hasMessages);
  const shouldShowDevTokenStats = import.meta.env.DEV && tokenStats !== null && !streaming;
  const isReady = loaded && !isShowingOnboardingFlow;

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const handleNewChat = useCallback(() => {
    serviceRef.current.destroySession();
    createChat();
    restorePreferredMode();
    setChatContextSource(null);
  }, [createChat, restorePreferredMode, serviceRef]);

  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    if (streaming) stop();
    serviceRef.current.destroySession();
    const chatIdToDelete = activeChatId;
    createChat();
    deleteChat(chatIdToDelete);
    restorePreferredMode();
    setChatContextSource(null);
  }, [activeChatId, createChat, deleteChat, restorePreferredMode, serviceRef, stop, streaming]);

  const dismissChatContext = useCallback(() => {
    setChatContextSource(null);
  }, []);

  const addChatContext = useCallback(async (): Promise<string | null> => {
    const { source, warning } = await resolveContextSourceWithLimitCheck();
    if (!source) return warning;
    setChatContextSource(source);
    return null;
  }, [resolveContextSourceWithLimitCheck]);

  const clearAutoContextWarning = useCallback(() => {
    setAutoContextWarning(null);
  }, []);

  return {
    isReady,
    isShowingOnboardingFlow,
    isSessionLoading,
    status,
    progress,
    error,
    chatSummaries,
    activeChatId,
    messages,
    streaming,
    hasMessages,
    tokenStats,
    contextUsage,
    devTraceItems,
    devTraceEnabled,
    shouldShowDevTokenStats,
    mode,
    agentContextChip,
    agentContextChipVisible,
    agentChipAnimationKey,
    agentNotice,
    chatPageSource,
    chatContextSource: chatContextSourceForDock,
    chatContextAnimationKey,
    messageListPageSource,
    contextMode,
    multimodalModalOpen,
    isFullScreen,
    isSidebarOpen,
    inputDockRef,
    send,
    stop,
    retry,
    download,
    handleModeChange,
    toggleSidebar,
    closeSidebar,
    handleNewChat,
    handleClearChat,
    dismissChatContext,
    addChatContext,
    autoContextWarning,
    clearAutoContextWarning,
    insufficientStorageModalOpen,
    closeInsufficientStorageModal,
    setChatContextSource,
    selectChat,
    deleteChat,
    closeMultimodalUnsupportedModal,
  };
}
