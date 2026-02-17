import { useCallback } from 'react';
import { Sidebar } from '@app/components/sidebar/Sidebar';
import { ChatHeader } from '@app/components/chat/ChatHeader';
import { InputDock } from '@app/components/chat/InputDock';
import { WelcomeScreen } from '@app/components/chat/WelcomeScreen';
import { MessageList } from '@app/components/chat/MessageList';
import { TokenStats } from '@app/components/chat/TokenStats';
import { ContextBar } from '@app/components/chat/ContextBar';
import { DevTracePanel } from '@app/components/chat/DevTracePanel';
import { OnboardingScreen } from '@app/components/status/OnboardingScreen';
import { useMainPageState } from '@app/hooks/useMainPageState';
import { useScrolled } from '@app/hooks/useScrolled';
import { useTemporaryNotice } from '@app/hooks/useTemporaryNotice';
import { toSendOptions } from '@app/services/chat-send-options';
import { SessionStatus } from '@shared/types';

export const MainPage = () => {
  const state = useMainPageState();
  const { scrolled, scrollRef } = useScrolled();
  const { notice: contextNotice, showNotice: showContextNotice } = useTemporaryNotice();

  const hasPageContext = Boolean(state.chatContextSource ?? state.chatPageSource);

  const handleSuggestionClick = useCallback(
    (prompt: string) => state.send(prompt, undefined, toSendOptions(state.mode, state.contextMode)),
    [state.send, state.mode, state.contextMode],
  );

  const handleContextRequired = useCallback(
    () => showContextNotice('This feature requires a webpage. Open a website and try again.'),
    [showContextNotice],
  );

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
                  <WelcomeScreen
                    mode={state.mode}
                    hasPageContext={hasPageContext}
                    onSuggestionClick={handleSuggestionClick}
                    onContextRequired={handleContextRequired}
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
              contextNotice={contextNotice}
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
