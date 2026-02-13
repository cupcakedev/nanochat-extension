import { useState, useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import { AGENT_CONTEXT_UNAVAILABLE_MESSAGE, getAgentPageContext } from '@app/services/agent-context';
import { getActiveTab, setAgentIndicatorPosition } from '@app/services/tab-bridge';

const AGENT_NOTICE_DURATION_MS = 5000;
const CONTEXT_CHIP_REVEAL_DELAY_MS = 500;
const AGENT_INDICATOR_BOTTOM_ADJUST_PX = -8;

export interface AgentContextChip {
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
  return { title: resolveSiteTitle(title, url), faviconUrl };
}

export function useAgentMode(
  serviceRef: RefObject<PromptAPIService>,
) {
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');
  const [agentContextChip, setAgentContextChip] = useState<AgentContextChip | null>(null);
  const [agentContextChipVisible, setAgentContextChipVisible] = useState(false);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [agentChipAnimationKey, setAgentChipAnimationKey] = useState(0);
  const agentNoticeTimeoutRef = useRef<number | null>(null);
  const agentChipRevealTimeoutRef = useRef<number | null>(null);
  const inputDockRef = useRef<HTMLDivElement | null>(null);

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

  const resetAgentState = useCallback(() => {
    clearAgentNoticeTimer();
    clearAgentChipRevealTimer();
    setMode('chat');
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
    setAgentNotice(null);
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
    }, CONTEXT_CHIP_REVEAL_DELAY_MS);
  }, [clearAgentChipRevealTimer]);

  const calculateAgentIndicatorBottomOffset = useCallback((): number => {
    const dock = inputDockRef.current;
    if (!dock) return 180;
    const rect = dock.getBoundingClientRect();
    const rawOffset = window.innerHeight - rect.top + 18 + AGENT_INDICATOR_BOTTOM_ADJUST_PX;
    return Math.round(Math.min(Math.max(rawOffset, 80), 360));
  }, []);

  const handleModeChange = useCallback(
    (nextMode: 'chat' | 'agent') => {
      if (nextMode === 'chat') {
        resetAgentState();
        return;
      }

      void (async () => {
        try {
          const activeTab = await getActiveTab();
          const indicatorBottomOffset = calculateAgentIndicatorBottomOffset();
          try {
            await setAgentIndicatorPosition(activeTab.tabId, indicatorBottomOffset);
          } catch { /* noop */ }

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
      clearAgentNoticeTimer,
      resetAgentState,
      showAgentUnavailable,
    ],
  );

  return {
    mode,
    agentContextChip,
    agentContextChipVisible,
    agentNotice,
    agentChipAnimationKey,
    handleModeChange,
    showAgentUnavailable,
    resetAgentState,
    inputDockRef,
  };
}
