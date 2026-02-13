import { useState, useCallback } from 'react';
import { Sidebar } from '@app/components/sidebar/Sidebar';
import { MenuIcon } from '@app/components/icons/MenuIcon';
import { PlusIcon } from '@app/components/icons/PlusIcon';
import { TrashIcon } from '@app/components/icons/TrashIcon';
import { EmptyState } from '@app/components/ui/EmptyState';
import { ChatInput } from '@app/components/ui/ChatInput';
import { MessageList } from '@app/components/chat/MessageList';
import { TokenStats } from '@app/components/chat/TokenStats';
import { ContextBar } from '@app/components/chat/ContextBar';
import { ModelStatusBar } from '@app/components/status/ModelStatusBar';
import { OnboardingScreen } from '@app/components/status/OnboardingScreen';
import { usePromptSession } from '@app/hooks/usePromptSession';
import { useChat } from '@app/hooks/useChat';
import { useChatContext } from '@app/hooks/useChatContext';

const NOOP = () => {};

export const MainPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');

  const { status, progress, error, retry, download, serviceRef } =
    usePromptSession();

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

  const { messages, streaming, tokenStats, contextUsage, send, stop } = useChat(
    serviceRef,
    activeChatId,
    activeChat?.messages ?? [],
    activeChat?.contextUsage ?? null,
    updateActiveChat,
    mode,
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
    setMode('chat');
  }, [createChat, serviceRef]);
  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    if (streaming) stop();
    serviceRef.current.destroySession();
    const chatIdToDelete = activeChatId;
    createChat();
    deleteChat(chatIdToDelete);
    setMode('chat');
  }, [activeChatId, createChat, deleteChat, serviceRef, stop, streaming]);

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
            <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
              <button
                onClick={toggleSidebar}
                className="p-2 rounded-lg bg-neutral-100/50 hover:bg-neutral-100/80 text-neutral-400 hover:text-white transition-colors border border-white/5 backdrop-blur-md"
              >
                <MenuIcon />
              </button>
              <button
                onClick={handleNewChat}
                className="flex h-[38px] items-center gap-2 px-3 rounded-lg text-xs font-medium
                  bg-neutral-100/50 text-neutral-400 hover:text-white hover:bg-neutral-100/80
                  border border-white/5 transition-all duration-200 backdrop-blur-md"
              >
                <PlusIcon />
                <span>New Chat</span>
              </button>
            </div>

            <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
              <button
                onClick={handleClearChat}
                disabled={!activeChatId}
                className="flex h-[38px] items-center gap-2 px-3 rounded-lg text-xs font-medium
                  bg-neutral-100/50 text-neutral-400 hover:text-white hover:bg-neutral-100/80
                  border border-white/5 transition-all duration-200 backdrop-blur-md
                  disabled:opacity-50 disabled:cursor-not-allowed"
                title="Clear current chat"
              >
                <TrashIcon />
                <span>Clear Chat</span>
              </button>
              <ModelStatusBar status={status} progress={progress} error={error} onRetry={retry} />
            </div>

            <div className="flex-1 overflow-y-auto pb-36">
              {hasMessages ? (
                <div className="max-w-3xl mx-auto w-full pt-10 px-4">
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

            <div className="absolute bottom-0 left-0 right-0 z-20 px-6 pt-3 pb-4">
              <ChatInput
                onSend={send}
                onStop={stop}
                streaming={streaming}
                disabled={status !== 'ready'}
                placeholder="Ask anything..."
                mode={mode}
                modeLocked={hasMessages}
                onModeChange={setMode}
              />
            </div>
          </>
        ) : (
          isShowingOnboardingFlow && (
            <div className="h-full flex items-center justify-center">
              <OnboardingScreen
                onDownload={download}
                loading={isSessionLoading}
                progress={progress}
              />
            </div>
          )
        )}
      </main>
    </div>
  );
};
