import { useState, useCallback } from 'react';
import { Sidebar } from '@app/components/sidebar/Sidebar';
import { ChatHeader } from '@app/components/chat/ChatHeader';
import { InputDock } from '@app/components/chat/InputDock';
import { EmptyState } from '@app/components/ui/EmptyState';
import { MessageList } from '@app/components/chat/MessageList';
import { TokenStats } from '@app/components/chat/TokenStats';
import { ContextBar } from '@app/components/chat/ContextBar';
import { OnboardingScreen } from '@app/components/status/OnboardingScreen';
import { usePromptSession } from '@app/hooks/usePromptSession';
import { useChat } from '@app/hooks/useChat';
import { useChatContext } from '@app/hooks/useChatContext';
import { useAgentMode } from '@app/hooks/useAgentMode';

const NOOP = () => {};

export const MainPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { status, progress, error, retry, download, serviceRef } = usePromptSession();

  const {
    chatSummaries, activeChatId, activeChat, loaded,
    createChat, selectChat, deleteChat, updateActiveChat,
  } = useChatContext();

  const {
    mode, agentContextChip, agentContextChipVisible,
    agentNotice, agentChipAnimationKey,
    handleModeChange, showAgentUnavailable, resetAgentState, inputDockRef,
  } = useAgentMode(serviceRef);

  const { messages, streaming, tokenStats, contextUsage, send, stop } = useChat(
    serviceRef, activeChatId, activeChat?.messages ?? [],
    activeChat?.contextUsage ?? null, updateActiveChat, mode, showAgentUnavailable,
  );

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
  }, [createChat, resetAgentState, serviceRef]);

  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    if (streaming) stop();
    serviceRef.current.destroySession();
    const chatIdToDelete = activeChatId;
    createChat();
    deleteChat(chatIdToDelete);
    resetAgentState();
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
            />

            <div className="flex-1 overflow-y-auto pb-36">
              {hasMessages ? (
                <div className="max-w-3xl mx-auto w-full pt-14 px-4">
                  <MessageList messages={messages} streaming={streaming} />
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
              agentNotice={agentNotice}
              onSend={send}
              onStop={stop}
              streaming={streaming}
              disabled={status !== 'ready'}
              hasMessages={hasMessages}
              onModeChange={handleModeChange}
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
