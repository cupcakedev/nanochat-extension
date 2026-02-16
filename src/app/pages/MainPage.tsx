import { Sidebar } from '@app/components/sidebar/Sidebar';
import { ChatHeader } from '@app/components/chat/ChatHeader';
import { InputDock } from '@app/components/chat/InputDock';
import { EmptyState } from '@app/components/ui/EmptyState';
import { MessageList } from '@app/components/chat/MessageList';
import { TokenStats } from '@app/components/chat/TokenStats';
import { ContextBar } from '@app/components/chat/ContextBar';
import { DevTracePanel } from '@app/components/chat/DevTracePanel';
import { OnboardingScreen } from '@app/components/status/OnboardingScreen';
import { useMainPageState } from '@app/hooks/useMainPageState';
import { useScrolled } from '@app/hooks/useScrolled';
import { SessionStatus } from '@shared/types';

export const MainPage = () => {
  const state = useMainPageState();
  const { scrolled, scrollRef } = useScrolled();

  return (
    <div className="relative h-screen flex flex-row bg-neutral-bg overflow-hidden">
      <Sidebar
        chatSummaries={state.isReady ? state.chatSummaries : []}
        activeChatId={state.isReady ? state.activeChatId : null}
        isOpen={state.isReady && state.isSidebarOpen}
        onSelectChat={state.isReady ? state.selectChat : state.NOOP}
        onDeleteChat={state.isReady ? state.deleteChat : state.NOOP}
        onNewChat={state.isReady ? state.handleNewChat : state.NOOP}
        onClose={state.isReady ? state.closeSidebar : state.NOOP}
      />

      <main className="flex-1 flex flex-col relative min-w-0">
        {state.isReady ? (
          <>
            {state.contextUsage && <ContextBar usage={state.contextUsage} />}
            <ChatHeader
              onToggleSidebar={state.toggleSidebar}
              onNewChat={state.handleNewChat}
              status={state.status}
              progress={state.progress}
              error={state.error}
              onRetry={state.retry}
              mode={state.mode}
              modeLocked={state.hasMessages}
              onModeChange={state.handleModeChange}
              scrolled={scrolled}
            />

            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-48">
              {state.hasMessages ? (
                <div className="max-w-3xl mx-auto w-full pt-14 px-4">
                  <MessageList
                    messages={state.messages}
                    streaming={state.streaming}
                    pageSource={state.messageListPageSource}
                  />
                  {state.devTraceEnabled && <DevTracePanel items={state.devTraceItems} streaming={state.streaming} />}
                  {state.shouldShowDevTokenStats && <TokenStats stats={state.tokenStats!} />}
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
              dockRef={state.inputDockRef}
              mode={state.mode}
              agentContextChip={state.agentContextChip}
              agentContextChipVisible={state.agentContextChipVisible}
              agentChipAnimationKey={state.agentChipAnimationKey}
              chatPageSource={state.chatPageSource}
              chatContextSource={state.chatContextSource}
              chatContextAnimationKey={state.chatContextAnimationKey}
              agentNotice={state.agentNotice}
              onSend={state.send}
              onStop={state.stop}
              streaming={state.streaming}
              disabled={state.status !== SessionStatus.Ready}
              contextMode={state.contextMode}
              onDismissChatContext={state.dismissChatContext}
              onAddChatContext={state.addChatContext}
            />
          </>
        ) : (
          state.isShowingOnboardingFlow && (
            <div className="h-full flex items-center justify-center">
              <OnboardingScreen onDownload={state.download} loading={state.isSessionLoading} progress={state.progress} />
            </div>
          )
        )}
      </main>
    </div>
  );
};
