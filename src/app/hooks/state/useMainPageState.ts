import { useState, useCallback, useEffect } from 'react';
import { usePromptSession } from '@app/hooks/prompt';
import { useChat } from '@app/hooks/chat';
import { useChatContext } from '@app/hooks/chat';
import { useAgentMode } from '@app/hooks/agent';
import { fetchPageContextSource } from '@app/services/page';
import { ChatContextSendMode, ChatMode, requiresPageContext } from '@app/types/mode';
import { SessionStatus } from '@shared/types';
import type { PageSource } from '@shared/types';

const NOOP = () => {};

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

export function useMainPageState() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatContextSource, setChatContextSource] = useState<PageSource | null>(null);
  const contextMode = chatContextSource
    ? ChatContextSendMode.WithPageContext
    : ChatContextSendMode.WithoutPageContext;

  const { status, progress, error, retry, download, serviceRef } = usePromptSession();

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

  useEffect(() => {
    if (hasInitialMessages) return;
    fetchPageContextSource().then(setChatContextSource);
  }, [activeChatId, hasInitialMessages]);

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
  } = useAgentMode(serviceRef, hasInitialMessages);

  const activePageSource = toActivePageSource(mode, agentContextChip);

  const {
    messages,
    streaming,
    tokenStats,
    contextUsage,
    devTraceItems,
    devTraceEnabled,
    chatContextChipSourceOverride,
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

  const hasMessages = messages.length > 0;
  const isSessionLoading = status === SessionStatus.Loading;
  const isShowingOnboardingFlow =
    status === SessionStatus.NeedsDownload || (isSessionLoading && !hasMessages);
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

  const addChatContext = useCallback(() => {
    fetchPageContextSource().then(setChatContextSource);
  }, []);

  return {
    NOOP,
    isSidebarOpen,
    isReady,
    isShowingOnboardingFlow,
    isSessionLoading,
    hasMessages,
    shouldShowDevTokenStats,
    chatSummaries,
    activeChatId,
    messages,
    streaming,
    tokenStats,
    contextUsage,
    devTraceItems,
    devTraceEnabled,
    status,
    progress,
    error,
    mode,
    agentContextChip,
    agentContextChipVisible,
    agentChipAnimationKey,
    chatPageSource,
    chatContextAnimationKey,
    chatContextSource,
    messageListPageSource,
    agentNotice,
    contextMode,
    inputDockRef,
    toggleSidebar,
    closeSidebar,
    handleNewChat,
    handleClearChat,
    dismissChatContext,
    addChatContext,
    setChatContextSource,
    selectChat,
    deleteChat,
    send,
    stop,
    retry,
    download,
    handleModeChange,
  };
}
