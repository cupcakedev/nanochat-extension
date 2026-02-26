import { useCallback } from 'react';
import { Sidebar } from '@sidepanel/components/sidebar/Sidebar';
import { ChatHeader } from '@sidepanel/components/chat/ChatHeader';
import { InputDock } from '@sidepanel/components/chat/InputDock';
import { WelcomeScreen } from '@sidepanel/components/chat/WelcomeScreen';
import { MessageList } from '@sidepanel/components/chat/MessageList';
import { TokenStats } from '@sidepanel/components/chat/TokenStats';
import { ContextBar } from '@sidepanel/components/chat/ContextBar';
import { DevTracePanel } from '@sidepanel/components/chat/DevTracePanel';
import { OnboardingScreen } from '@sidepanel/components/status/OnboardingScreen';
import { MultimodalSupportModal } from '@sidepanel/components/status/MultimodalSupportModal';
import { useMainPageState } from '@sidepanel/hooks/state';
import { useScrolled } from '@sidepanel/hooks/ui';
import { useTemporaryNotice } from '@sidepanel/hooks/ui';
import { toSendOptions } from '@sidepanel/services/chat';
import { fetchPageContextSource } from '@sidepanel/services/page';
import { ChatContextSendMode } from '@sidepanel/types/mode';
import { SessionStatus } from '@shared/types';

export const MainPage = () => {
  const state = useMainPageState();
  const { scrolled, scrollRef } = useScrolled();
  const { notice: contextNotice, showNotice: showContextNotice } = useTemporaryNotice();
  const { send, mode, contextMode, setChatContextSource } = state;

  const handleSuggestionClick = useCallback(
    async (prompt: string, requiresContext: boolean) => {
      const resolvedContextMode = requiresContext
        ? ChatContextSendMode.WithPageContext
        : contextMode;
      if (requiresContext) {
        const source = await fetchPageContextSource();
        if (!source) {
          showContextNotice('This feature requires a webpage. Open a website and try again.');
          return;
        }
        setChatContextSource(source);
      }
      send(prompt, undefined, toSendOptions(mode, resolvedContextMode));
    },
    [send, mode, contextMode, setChatContextSource, showContextNotice],
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
              isFullScreen={state.isFullScreen}
              scrolled={scrolled}
            />

            <div ref={scrollRef} className="flex-1 overflow-y-auto pb-48">
              {state.hasMessages ? (
                <div
                  className={`max-w-3xl mx-auto w-full px-4 ${state.isFullScreen ? 'pt-20' : 'pt-14'}`}
                >
                  <MessageList
                    messages={state.messages}
                    streaming={state.streaming}
                    pageSource={state.messageListPageSource}
                  />
                  {state.devTraceEnabled && (
                    <DevTracePanel items={state.devTraceItems} streaming={state.streaming} />
                  )}
                  {state.shouldShowDevTokenStats && <TokenStats stats={state.tokenStats!} />}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <WelcomeScreen mode={state.mode} onSuggestionClick={handleSuggestionClick} />
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
              isFullScreen={state.isFullScreen}
            />
          </>
        ) : (
          state.isShowingOnboardingFlow && (
            <div className="h-full flex items-center justify-center">
              <OnboardingScreen
                onDownload={state.download}
                loading={state.isSessionLoading}
                progress={state.progress}
              />
            </div>
          )
        )}
      </main>

      <MultimodalSupportModal
        isOpen={state.multimodalModalOpen}
        onClose={state.closeMultimodalUnsupportedModal}
      />
    </div>
  );
};
