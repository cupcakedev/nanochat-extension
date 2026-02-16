import { useState, useCallback } from 'react';
import { Sidebar } from '@app/components/sidebar/Sidebar';
import { ChatHeader } from '@app/components/chat/ChatHeader';
import { InputDock } from '@app/components/chat/InputDock';
import { EmptyState } from '@app/components/ui/EmptyState';
import { MessageList } from '@app/components/chat/MessageList';
import { TokenStats } from '@app/components/chat/TokenStats';
import { ContextBar } from '@app/components/chat/ContextBar';
import { DevTracePanel } from '@app/components/chat/DevTracePanel';
import { OnboardingScreen } from '@app/components/status/OnboardingScreen';
import { usePromptSession } from '@app/hooks/usePromptSession';
import { useChat } from '@app/hooks/useChat';
import { useChatContext } from '@app/hooks/useChatContext';
import { useAgentMode } from '@app/hooks/useAgentMode';
import { requiresPageContext } from '@app/types/mode';
import type { ChatContextSendMode } from '@app/types/mode';
import type { PageSource } from '@shared/types';

const NOOP = () => {};

const DEFAULT_CONTEXT_MODE: ChatContextSendMode = 'without-page-context';

function resolveChatPageSource(
  persistedPageSource: PageSource | null | undefined,
  override: PageSource | null | undefined,
): PageSource | undefined {
  if (override === undefined) return persistedPageSource ?? undefined;
  return override ?? undefined;
}

function resolveMessageListPageSource(
  mode: 'chat' | 'agent',
  persistedPageSource: PageSource | null | undefined,
  chatPageSource?: PageSource,
): PageSource | undefined {
  if (mode !== 'chat') return undefined;
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

export const MainPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [contextMode, setContextMode] = useState<ChatContextSendMode>(DEFAULT_CONTEXT_MODE);

  const { status, progress, error, retry, download, serviceRef } = usePromptSession();

  const {
    chatSummaries, activeChatId, activeChat, loaded,
    createChat, selectChat, deleteChat, updateActiveChat,
  } = useChatContext();

  const initialMessages = activeChat?.messages ?? [];
  const hasInitialMessages = initialMessages.length > 0;

  const {
    mode, agentContextChip, agentContextChipVisible,
    agentNotice, agentChipAnimationKey,
    handleModeChange, showAgentUnavailable, resetAgentState, inputDockRef,
  } = useAgentMode(serviceRef, hasInitialMessages);

  const activePageSource: PageSource | null = requiresPageContext(mode) && agentContextChip
    ? { url: agentContextChip.url, title: agentContextChip.title, faviconUrl: agentContextChip.faviconUrl }
    : null;

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
    serviceRef, activeChatId, initialMessages,
    activeChat?.contextUsage ?? null, updateActiveChat, mode, activePageSource, showAgentUnavailable,
  );

  const chatPageSource = resolveChatPageSource(activeChat?.pageSource, chatContextChipSourceOverride);
  const messageListPageSource = resolveMessageListPageSource(mode, activeChat?.pageSource, chatPageSource);
  const chatContextAnimationKey = resolveChatContextAnimationKey(chatPageSource, activeChat?.updatedAt, messages.length);

  const hasMessages = messages.length > 0;
  const isSessionLoading = status === 'loading';
  const isShowingOnboardingFlow = status === 'needs-download' || (isSessionLoading && !hasMessages);
  const shouldShowDevTokenStats = import.meta.env.DEV && tokenStats !== null && !streaming;
  const isReady = loaded && !isShowingOnboardingFlow;

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const handleNewChat = useCallback(() => {
    serviceRef.current.destroySession();
    createChat();
    resetAgentState();
    setContextMode(DEFAULT_CONTEXT_MODE);
  }, [createChat, resetAgentState, serviceRef]);

  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    if (streaming) stop();
    serviceRef.current.destroySession();
    const chatIdToDelete = activeChatId;
    createChat();
    deleteChat(chatIdToDelete);
    resetAgentState();
    setContextMode(DEFAULT_CONTEXT_MODE);
  }, [activeChatId, createChat, deleteChat, resetAgentState, serviceRef, stop, streaming]);

  return (
    <div className="relative h-screen flex flex-row bg-neutral-bg overflow-hidden">
      <Sidebar
        chatSummaries={isReady ? chatSummaries : []}
        activeChatId={isReady ? activeChatId : null}
        isOpen={isReady && isSidebarOpen}
        onSelectChat={isReady ? selectChat : NOOP}
        onDeleteChat={isReady ? deleteChat : NOOP}
        onNewChat={isReady ? handleNewChat : NOOP}
        onClose={isReady ? closeSidebar : NOOP}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        {isReady ? (
          <>
            {contextUsage && <ContextBar usage={contextUsage} />}
            <ChatHeader
              onToggleSidebar={toggleSidebar}
              onNewChat={handleNewChat}
              onClearChat={handleClearChat}
              activeChatId={activeChatId}
              status={status}
              progress={progress}
              error={error}
              onRetry={retry}
              mode={mode}
              modeLocked={hasMessages}
              onModeChange={handleModeChange}
            />

            <div className="flex-1 overflow-y-auto pb-48">
              {hasMessages ? (
                <div className="max-w-3xl mx-auto w-full pt-14 px-4">
                  <MessageList
                    messages={messages}
                    streaming={streaming}
                    pageSource={messageListPageSource}
                  />
                  {devTraceEnabled && <DevTracePanel items={devTraceItems} streaming={streaming} />}
                  {shouldShowDevTokenStats && <TokenStats stats={tokenStats!} />}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <EmptyState
                    title="Welcome to NanoChat"
                    description="Start a conversation by typing a message below"
                  />
                </div>
              )}
            </div>

            <InputDock
              dockRef={inputDockRef}
              mode={mode}
              agentContextChip={agentContextChip}
              agentContextChipVisible={agentContextChipVisible}
              agentChipAnimationKey={agentChipAnimationKey}
              chatPageSource={chatPageSource}
              chatContextAnimationKey={chatContextAnimationKey}
              agentNotice={agentNotice}
              onSend={send}
              onStop={stop}
              streaming={streaming}
              disabled={status !== 'ready'}
              contextMode={contextMode}
              onContextModeChange={setContextMode}
            />
          </>
        ) : (
          isShowingOnboardingFlow && (
            <div className="h-full flex items-center justify-center">
              <OnboardingScreen onDownload={download} loading={isSessionLoading} progress={progress} />
            </div>
          )
        )}
      </main>
    </div>
  );
};
