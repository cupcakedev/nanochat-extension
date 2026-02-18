import { useState, useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@sidepanel/services/prompt';
import { AGENT_CONTEXT_UNAVAILABLE_MESSAGE, getAgentPageContext } from '@sidepanel/services/agent';
import {
  clearTimerRef,
  extractAgentErrorMessage,
  resolveSiteTitle,
} from '@sidepanel/services/agent';
import type { AgentContextChip } from '@sidepanel/services/agent';
import { ChatMode, requiresPageContext } from '@sidepanel/types/mode';
import { useTabChangeListener } from '@sidepanel/hooks/state/useTabChangeListener';

export type { AgentContextChip };

const AGENT_NOTICE_DURATION_MS = 5000;
const CONTEXT_CHIP_REVEAL_DELAY_MS = 500;
const INDICATOR_BOTTOM_ADJUST_PX = -8;
const PREFERRED_MODE_KEY = 'nanochat:preferred-mode';

function readPreferredMode(): ChatMode {
  try {
    const stored = localStorage.getItem(PREFERRED_MODE_KEY);
    if (stored === ChatMode.Agent) return ChatMode.Agent;
    return ChatMode.Chat;
  } catch {
    return ChatMode.Chat;
  }
}
function writePreferredMode(mode: ChatMode): void {
  try {
    localStorage.setItem(PREFERRED_MODE_KEY, mode);
  } catch {
    //
  }
}

export function useAgentMode(serviceRef: RefObject<PromptAPIService>, hasMessages: boolean) {
  const [mode, setMode] = useState<ChatMode>(readPreferredMode);
  const [agentContextChip, setAgentContextChip] = useState<AgentContextChip | null>(null);
  const [agentContextChipVisible, setAgentContextChipVisible] = useState(false);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [agentChipAnimationKey, setAgentChipAnimationKey] = useState(0);
  const noticeTimerRef = useRef<number | null>(null);
  const chipRevealTimerRef = useRef<number | null>(null);
  const inputDockRef = useRef<HTMLDivElement | null>(null);
  const refreshingRef = useRef(false);

  useEffect(
    () => () => {
      clearTimerRef(noticeTimerRef);
      clearTimerRef(chipRevealTimerRef);
    },
    [],
  );

  const clearAgentVisuals = useCallback(() => {
    clearTimerRef(noticeTimerRef);
    clearTimerRef(chipRevealTimerRef);
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
    setAgentNotice(null);
  }, []);

  const resetAgentState = useCallback(() => {
    clearAgentVisuals();
    setMode(ChatMode.Chat);
  }, [clearAgentVisuals]);

  const showAgentUnavailable = useCallback(
    (message = AGENT_CONTEXT_UNAVAILABLE_MESSAGE) => {
      clearTimerRef(noticeTimerRef);
      clearTimerRef(chipRevealTimerRef);
      serviceRef.current.destroySession();
      setAgentContextChipVisible(false);
      setAgentContextChip(null);
      setAgentNotice(message);
      noticeTimerRef.current = window.setTimeout(() => {
        setAgentNotice(null);
        noticeTimerRef.current = null;
      }, AGENT_NOTICE_DURATION_MS);
    },
    [serviceRef],
  );

  const applyContextChip = useCallback(
    (title: string, url: string, faviconUrl: string, animate: boolean) => {
      clearTimerRef(chipRevealTimerRef);
      const chip = { url, title: resolveSiteTitle(title, url), faviconUrl };

      if (!animate) {
        setAgentContextChip(chip);
        setAgentContextChipVisible(true);
        return;
      }

      setAgentContextChipVisible(false);
      setAgentContextChip(chip);
      chipRevealTimerRef.current = window.setTimeout(() => {
        setAgentContextChipVisible(true);
        setAgentChipAnimationKey((prev) => prev + 1);
        chipRevealTimerRef.current = null;
      }, CONTEXT_CHIP_REVEAL_DELAY_MS);
    },
    [],
  );

  const computeIndicatorOffset = useCallback((): number => {
    const dock = inputDockRef.current;
    if (!dock) return 180;
    const rect = dock.getBoundingClientRect();
    const raw = window.innerHeight - rect.top + 18 + INDICATOR_BOTTOM_ADJUST_PX;
    return Math.round(Math.min(Math.max(raw, 80), 360));
  }, []);

  const fetchAndApplyContext = useCallback(
    async (animate: boolean) => {
      const { tab } = await getAgentPageContext(
        animate
          ? { indicatorBottomOffset: computeIndicatorOffset(), showIndicator: true }
          : { showIndicator: false },
      );
      clearTimerRef(noticeTimerRef);
      setAgentNotice(null);
      applyContextChip(tab.title, tab.url, tab.favIconUrl, animate);
    },
    [applyContextChip, computeIndicatorOffset],
  );

  const initialModeAppliedRef = useRef(false);
  useEffect(() => {
    if (initialModeAppliedRef.current) return;
    initialModeAppliedRef.current = true;
    const initial = readPreferredMode();
    if (requiresPageContext(initial)) {
      void (async () => {
        try {
          await fetchAndApplyContext(false);
          setMode(initial);
        } catch (error) {
          setMode(initial);
          showAgentUnavailable(extractAgentErrorMessage(error));
        }
      })();
    }
  }, [fetchAndApplyContext, showAgentUnavailable]);

  const restorePreferredMode = useCallback(() => {
    clearAgentVisuals();
    const preferred = readPreferredMode();
    setMode(preferred);

    if (!requiresPageContext(preferred)) {
      return;
    }

    void (async () => {
      try {
        await fetchAndApplyContext(false);
      } catch (error) {
        showAgentUnavailable(extractAgentErrorMessage(error));
      }
    })();
  }, [clearAgentVisuals, fetchAndApplyContext, showAgentUnavailable]);

  const refreshAgentContext = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await fetchAndApplyContext(false);
    } catch (error) {
      showAgentUnavailable(extractAgentErrorMessage(error));
    } finally {
      refreshingRef.current = false;
    }
  }, [fetchAndApplyContext, showAgentUnavailable]);

  useTabChangeListener(requiresPageContext(mode) && !hasMessages, refreshAgentContext);

  const handleModeChange = useCallback(
    (nextMode: ChatMode) => {
      writePreferredMode(nextMode);

      if (!requiresPageContext(nextMode)) {
        resetAgentState();
        return;
      }

      setMode(nextMode);
      void (async () => {
        try {
          await fetchAndApplyContext(true);
        } catch (error) {
          showAgentUnavailable(extractAgentErrorMessage(error));
        }
      })();
    },
    [fetchAndApplyContext, resetAgentState, showAgentUnavailable],
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
    restorePreferredMode,
    inputDockRef,
  };
}
