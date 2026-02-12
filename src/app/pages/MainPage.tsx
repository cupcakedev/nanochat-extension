import { useState, useCallback } from 'react';
import { Sidebar } from '@app/components/sidebar/Sidebar';
import { MenuIcon } from '@app/components/icons/MenuIcon';
import { EmptyState } from '@app/components/ui/EmptyState';
import { ChatInput } from '@app/components/ui/ChatInput';
import { MessageList } from '@app/components/chat/MessageList';
import { TokenStats } from '@app/components/chat/TokenStats';
import { ModelStatusBar } from '@app/components/status/ModelStatusBar';
import { OnboardingScreen } from '@app/components/status/OnboardingScreen';
import { usePromptSession } from '@app/hooks/usePromptSession';
import { useChat } from '@app/hooks/useChat';
import { useChatHistory } from '@app/hooks/useChatHistory';

export const MainPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');

  const { status, progress, error, retry, download, cancelDownload, serviceRef } =
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
  } = useChatHistory();

  const { messages, streaming, tokenStats, send, stop } = useChat(
    serviceRef,
    activeChatId,
    activeChat?.messages ?? [],
    updateActiveChat,
  );

  const hasMessages = messages.length > 0;
  const isSessionLoading = status === 'loading';
  const isShowingOnboardingFlow = status === 'needs-download' || (isSessionLoading && !hasMessages);
  const shouldShowDevTokenStats = import.meta.env.DEV && tokenStats !== null && !streaming;

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);

  if (!loaded || isShowingOnboardingFlow) {
    return (
      <div className="relative h-screen flex bg-neutral-bg">
        {/* Placeholder Sidebar for loading state if needed, or just center content */}
        <Sidebar
          chatSummaries={[]}
          activeChatId={null}
          isOpen={false}
          onSelectChat={() => {}}
          onDeleteChat={() => {}}
          onNewChat={() => {}}
          onClose={() => {}}
        />
        <div className="flex-1 relative">
          {isShowingOnboardingFlow && (
            <div className="h-full flex items-center justify-center">
              <OnboardingScreen
                onDownload={download}
                onCancel={cancelDownload}
                loading={isSessionLoading}
                progress={progress}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-row bg-neutral-bg overflow-hidden">
      <Sidebar
        chatSummaries={chatSummaries}
        activeChatId={activeChatId}
        isOpen={isSidebarOpen}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onNewChat={createChat}
        onClose={closeSidebar}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Menu Button */}
        <div className="absolute top-4 left-4 z-20">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg bg-neutral-100/50 hover:bg-neutral-100/80 text-neutral-400 hover:text-white transition-colors border border-white/5 backdrop-blur-md"
          >
            <MenuIcon />
          </button>
        </div>

        <div className="absolute top-4 right-4 z-10">
          <ModelStatusBar status={status} progress={progress} error={error} onRetry={retry} />
        </div>

        <div className="flex-1 overflow-y-auto pb-4 scrollbar-thin scrollbar-thumb-white/5">
          {hasMessages ? (
            <div className="max-w-3xl mx-auto w-full pt-10 px-4">
              <MessageList messages={messages} streaming={streaming} />
              {shouldShowDevTokenStats && <TokenStats stats={tokenStats!} />}
              <div className="h-32" /> {/* Spacer for bottom input */}
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

        <div className="p-6 shrink-0 z-20">
          <ChatInput
            onSend={send}
            onStop={stop}
            streaming={streaming}
            disabled={status !== 'ready'}
            placeholder="Ask anything..."
            mode={mode}
            onModeChange={setMode}
          />
        </div>
      </main>
    </div>
  );
};
