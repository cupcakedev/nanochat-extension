import { useState, useCallback, useEffect, useRef } from 'react';
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
import { AGENT_CONTEXT_UNAVAILABLE_MESSAGE, getAgentPageContext } from '@app/services/agent-context';
import { getActiveTab, setAgentIndicatorPosition } from '@app/services/tab-bridge';

const NOOP = () => {};
const AGENT_NOTICE_DURATION_MS = 5000;
const SIDEBAR_CONTEXT_CHIP_DELAY_MS = 500;
const AGENT_INDICATOR_BOTTOM_ADJUST_PX = -8;

interface AgentContextChip {
  title: string;
  faviconUrl: string;
}

function resolveSiteTitle(title: string, url: string): string {
  if (title.trim()) return title.trim();
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Current site';
  }
}

function toAgentContextChip(title: string, url: string, faviconUrl: string): AgentContextChip {
  return {
    title: resolveSiteTitle(title, url),
    faviconUrl,
  };
}

export const MainPage = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');
  const [agentContextChip, setAgentContextChip] = useState<AgentContextChip | null>(null);
  const [agentContextChipVisible, setAgentContextChipVisible] = useState(false);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [agentChipAnimationKey, setAgentChipAnimationKey] = useState(0);
  const agentNoticeTimeoutRef = useRef<number | null>(null);
  const agentChipRevealTimeoutRef = useRef<number | null>(null);
  const inputDockRef = useRef<HTMLDivElement | null>(null);

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

  const clearAgentNoticeTimer = useCallback(() => {
    if (agentNoticeTimeoutRef.current !== null) {
      window.clearTimeout(agentNoticeTimeoutRef.current);
      agentNoticeTimeoutRef.current = null;
    }
  }, []);

  const clearAgentChipRevealTimer = useCallback(() => {
    if (agentChipRevealTimeoutRef.current !== null) {
      window.clearTimeout(agentChipRevealTimeoutRef.current);
      agentChipRevealTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearAgentNoticeTimer();
      clearAgentChipRevealTimer();
    };
  }, [clearAgentNoticeTimer, clearAgentChipRevealTimer]);

  const showAgentUnavailable = useCallback(
    (message = AGENT_CONTEXT_UNAVAILABLE_MESSAGE) => {
      clearAgentNoticeTimer();
      clearAgentChipRevealTimer();
      serviceRef.current.destroySession();
      setMode('chat');
      setAgentContextChipVisible(false);
      setAgentContextChip(null);
      setAgentNotice(message);
      agentNoticeTimeoutRef.current = window.setTimeout(() => {
        setAgentNotice(null);
        agentNoticeTimeoutRef.current = null;
      }, AGENT_NOTICE_DURATION_MS);
    },
    [clearAgentChipRevealTimer, clearAgentNoticeTimer, serviceRef],
  );

  const applyAgentContextChip = useCallback((title: string, url: string, faviconUrl: string) => {
    clearAgentChipRevealTimer();
    setAgentContextChipVisible(false);
    setAgentContextChip(toAgentContextChip(title, url, faviconUrl));
    agentChipRevealTimeoutRef.current = window.setTimeout(() => {
      setAgentContextChipVisible(true);
      setAgentChipAnimationKey((prev) => prev + 1);
      agentChipRevealTimeoutRef.current = null;
    }, SIDEBAR_CONTEXT_CHIP_DELAY_MS);
  }, [clearAgentChipRevealTimer]);

  const calculateAgentIndicatorBottomOffset = useCallback((): number => {
    const dock = inputDockRef.current;
    if (!dock) return 180;
    const rect = dock.getBoundingClientRect();
    const rawOffset = window.innerHeight - rect.top + 18 + AGENT_INDICATOR_BOTTOM_ADJUST_PX;
    return Math.round(Math.min(Math.max(rawOffset, 80), 360));
  }, []);

  const { messages, streaming, tokenStats, contextUsage, send, stop } = useChat(
    serviceRef,
    activeChatId,
    activeChat?.messages ?? [],
    activeChat?.contextUsage ?? null,
    updateActiveChat,
    mode,
    showAgentUnavailable,
  );

  const hasMessages = messages.length > 0;
  const isSessionLoading = status === 'loading';
  const isShowingOnboardingFlow = status === 'needs-download' || (isSessionLoading && !hasMessages);
  const shouldShowDevTokenStats = import.meta.env.DEV && tokenStats !== null && !streaming;
  const isReady = loaded && !isShowingOnboardingFlow;

  const toggleSidebar = useCallback(() => setIsSidebarOpen((v) => !v), []);
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const handleNewChat = useCallback(() => {
    clearAgentNoticeTimer();
    clearAgentChipRevealTimer();
    serviceRef.current.destroySession();
    createChat();
    setMode('chat');
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
    setAgentNotice(null);
  }, [clearAgentChipRevealTimer, clearAgentNoticeTimer, createChat, serviceRef]);
  const handleClearChat = useCallback(() => {
    if (!activeChatId) return;
    if (streaming) stop();
    clearAgentNoticeTimer();
    clearAgentChipRevealTimer();
    serviceRef.current.destroySession();
    const chatIdToDelete = activeChatId;
    createChat();
    deleteChat(chatIdToDelete);
    setMode('chat');
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
    setAgentNotice(null);
  }, [activeChatId, clearAgentChipRevealTimer, clearAgentNoticeTimer, createChat, deleteChat, serviceRef, stop, streaming]);

  const handleModeChange = useCallback(
    (nextMode: 'chat' | 'agent') => {
      if (nextMode === 'chat') {
        clearAgentNoticeTimer();
        clearAgentChipRevealTimer();
        setAgentNotice(null);
        setAgentContextChipVisible(false);
        setAgentContextChip(null);
        setMode('chat');
        return;
      }

      void (async () => {
        try {
          const activeTab = await getActiveTab();
          const indicatorBottomOffset = calculateAgentIndicatorBottomOffset();
          try {
            await setAgentIndicatorPosition(activeTab.tabId, indicatorBottomOffset);
          } catch {
            //
          }

          const { tab } = await getAgentPageContext();
          clearAgentNoticeTimer();
          setAgentNotice(null);
          applyAgentContextChip(tab.title, tab.url, tab.favIconUrl);
          setMode('agent');
        } catch (err) {
          const message =
            err instanceof Error && err.message.trim()
              ? err.message
              : AGENT_CONTEXT_UNAVAILABLE_MESSAGE;
          showAgentUnavailable(message);
        }
      })();
    },
    [
      applyAgentContextChip,
      calculateAgentIndicatorBottomOffset,
      clearAgentChipRevealTimer,
      clearAgentNoticeTimer,
      showAgentUnavailable,
    ],
  );

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
              </button>
              <ModelStatusBar status={status} progress={progress} error={error} onRetry={retry} />
            </div>

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

            <div ref={inputDockRef} className="absolute bottom-0 left-0 right-0 z-20 px-6 pt-3 pb-4">
              {mode === 'agent' && agentContextChip && agentContextChipVisible && (
                <div className="mx-auto mb-4 w-full max-w-3xl">
                  <div
                    key={agentChipAnimationKey}
                    className="nano-context-chip-enter inline-flex max-w-full items-center gap-2 rounded-[16px] border border-white/10 bg-neutral-100/80 px-3.5 py-2 text-xs text-neutral-700 backdrop-blur-md"
                  >
                    {agentContextChip.faviconUrl ? (
                      <img
                        src={agentContextChip.faviconUrl}
                        alt=""
                        className="h-4 w-4 rounded-[4px] shrink-0"
                      />
                    ) : (
                      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-neutral-200/30 text-[10px] leading-none text-neutral-600 shrink-0">
                        •
                      </span>
                    )}
                    <span className="text-neutral-500 shrink-0">In context:</span>
                    <span className="truncate text-neutral-800">{agentContextChip.title}</span>
                  </div>
                </div>
              )}
              {agentNotice && (
                <div className="mx-auto mb-4 w-full max-w-3xl">
                  <div className="inline-flex max-w-full rounded-[18px] border border-amber-300/25 bg-amber-200/10 px-4 py-2.5 text-xs text-amber-100">
                    {agentNotice}
                  </div>
                </div>
              )}
              <ChatInput
                onSend={send}
                onStop={stop}
                streaming={streaming}
                disabled={status !== 'ready'}
                placeholder="Ask anything..."
                mode={mode}
                modeLocked={hasMessages}
                onModeChange={handleModeChange}
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
