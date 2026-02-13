import { useState, useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import { AGENT_CONTEXT_UNAVAILABLE_MESSAGE, getAgentPageContext } from '@app/services/agent-context';
import { useTabChangeListener } from './useTabChangeListener';

const AGENT_NOTICE_DURATION_MS = 5000;
const CONTEXT_CHIP_REVEAL_DELAY_MS = 500;
const INDICATOR_BOTTOM_ADJUST_PX = -8;

export interface AgentContextChip {
  url: string;
  title: string;
  faviconUrl: string;
}

function resolveSiteTitle(title: string, url: string): string {
  if (title.trim()) return title.trim();
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'Current site'; }
}

function extractAgentErrorMessage(err: unknown): string {
  return err instanceof Error && err.message.trim()
    ? err.message
    : AGENT_CONTEXT_UNAVAILABLE_MESSAGE;
}

export function useAgentMode(serviceRef: RefObject<PromptAPIService>, hasMessages: boolean) {
  const [mode, setMode] = useState<'chat' | 'agent'>('chat');
  const [agentContextChip, setAgentContextChip] = useState<AgentContextChip | null>(null);
  const [agentContextChipVisible, setAgentContextChipVisible] = useState(false);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [agentChipAnimationKey, setAgentChipAnimationKey] = useState(0);
  const noticeTimerRef = useRef<number | null>(null);
  const chipRevealTimerRef = useRef<number | null>(null);
  const inputDockRef = useRef<HTMLDivElement | null>(null);
  const refreshingRef = useRef(false);

  const clearNoticeTimer = useCallback(() => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
      noticeTimerRef.current = null;
    }
  }, []);

  const clearChipRevealTimer = useCallback(() => {
    if (chipRevealTimerRef.current !== null) {
      window.clearTimeout(chipRevealTimerRef.current);
      chipRevealTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => { clearNoticeTimer(); clearChipRevealTimer(); },
    [clearNoticeTimer, clearChipRevealTimer]);

  const resetAgentState = useCallback(() => {
    clearNoticeTimer();
    clearChipRevealTimer();
    setMode('chat');
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
    setAgentNotice(null);
  }, [clearNoticeTimer, clearChipRevealTimer]);

  const showAgentUnavailable = useCallback((message = AGENT_CONTEXT_UNAVAILABLE_MESSAGE) => {
    clearNoticeTimer();
    clearChipRevealTimer();
    serviceRef.current.destroySession();
    setMode('chat');
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
    setAgentNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setAgentNotice(null);
      noticeTimerRef.current = null;
    }, AGENT_NOTICE_DURATION_MS);
  }, [clearChipRevealTimer, clearNoticeTimer, serviceRef]);

  const applyContextChip = useCallback((title: string, url: string, faviconUrl: string, animate: boolean) => {
    clearChipRevealTimer();
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
  }, [clearChipRevealTimer]);

  const computeIndicatorOffset = useCallback((): number => {
    const dock = inputDockRef.current;
    if (!dock) return 180;
    const rect = dock.getBoundingClientRect();
    const raw = window.innerHeight - rect.top + 18 + INDICATOR_BOTTOM_ADJUST_PX;
    return Math.round(Math.min(Math.max(raw, 80), 360));
  }, []);

  const fetchAndApplyContext = useCallback(async (animate: boolean) => {
    const { tab } = await getAgentPageContext(
      animate
        ? { indicatorBottomOffset: computeIndicatorOffset(), showIndicator: true }
        : { showIndicator: false },
    );
    clearNoticeTimer();
    setAgentNotice(null);
    applyContextChip(tab.title, tab.url, tab.favIconUrl, animate);
    return tab;
  }, [applyContextChip, computeIndicatorOffset, clearNoticeTimer]);

  const refreshAgentContext = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try { await fetchAndApplyContext(false); }
    catch (err) { showAgentUnavailable(extractAgentErrorMessage(err)); }
    finally { refreshingRef.current = false; }
  }, [fetchAndApplyContext, showAgentUnavailable]);

  useTabChangeListener(mode === 'agent' && !hasMessages, refreshAgentContext);

  const handleModeChange = useCallback((nextMode: 'chat' | 'agent') => {
    if (nextMode === 'chat') { resetAgentState(); return; }
    void (async () => {
      try { await fetchAndApplyContext(true); setMode('agent'); }
      catch (err) { showAgentUnavailable(extractAgentErrorMessage(err)); }
    })();
  }, [fetchAndApplyContext, resetAgentState, showAgentUnavailable]);

  return {
    mode, agentContextChip, agentContextChipVisible,
    agentNotice, agentChipAnimationKey,
    handleModeChange, showAgentUnavailable, resetAgentState, inputDockRef,
  };
}
