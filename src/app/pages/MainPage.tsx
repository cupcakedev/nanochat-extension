import { Header } from '@app/components/ui/Header';
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

  const { messages, streaming, tokenStats, send, stop, clear } = useChat(
    serviceRef,
    activeChatId,
    activeChat?.messages ?? [],
    updateActiveChat,
  );

  const hasMessages = messages.length > 0;
  const isSessionLoading = status === 'loading';
  const isShowingOnboardingFlow = status === 'needs-download' || (isSessionLoading && !hasMessages);
  const shouldShowDevTokenStats = import.meta.env.DEV && tokenStats !== null && !streaming;

  if (!loaded || isShowingOnboardingFlow) {
    return (
      <div className="flex flex-col h-screen">
        <Header />
        {isShowingOnboardingFlow && (
          <OnboardingScreen
            onDownload={download}
            onCancel={cancelDownload}
            loading={isSessionLoading}
            progress={progress}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Header
        onClear={clear}
        showClear={hasMessages}
        chatSummaries={chatSummaries}
        activeChatId={activeChatId}
        onSelectChat={selectChat}
        onDeleteChat={deleteChat}
        onNewChat={createChat}
      />
      <ModelStatusBar status={status} progress={progress} error={error} onRetry={retry} />
      {hasMessages ? (
        <>
          <MessageList messages={messages} streaming={streaming} />
          {shouldShowDevTokenStats && <TokenStats stats={tokenStats!} />}
        </>
      ) : (
        <EmptyState
          title="Welcome to NanoChat"
          description="Start a conversation by typing a message below"
        />
      )}
      <ChatInput
        onSend={send}
        onStop={stop}
        streaming={streaming}
        disabled={status !== 'ready'}
        placeholder="Ask anything..."
      />
    </div>
  );
};
