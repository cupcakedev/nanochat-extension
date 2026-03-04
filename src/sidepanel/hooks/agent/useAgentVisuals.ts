import { useCallback, useEffect, useRef, useState } from 'react';
import { clearTimerRef, resolveSiteTitle } from '@sidepanel/services/agent';
import type { AgentContextChip } from '@sidepanel/services/agent';

const AGENT_NOTICE_DURATION_MS = 5000;
const CONTEXT_CHIP_REVEAL_DELAY_MS = 500;

export function useAgentVisuals() {
  const [agentContextChip, setAgentContextChip] = useState<AgentContextChip | null>(null);
  const [agentContextChipVisible, setAgentContextChipVisible] = useState(false);
  const [agentNotice, setAgentNotice] = useState<string | null>(null);
  const [agentChipAnimationKey, setAgentChipAnimationKey] = useState(0);
  const noticeTimerRef = useRef<number | null>(null);
  const chipRevealTimerRef = useRef<number | null>(null);
  const inputDockRef = useRef<HTMLDivElement | null>(null);

  useEffect(
    () => () => {
      clearTimerRef(noticeTimerRef);
      clearTimerRef(chipRevealTimerRef);
    },
    [],
  );

  const clearNotice = useCallback(() => {
    clearTimerRef(noticeTimerRef);
    setAgentNotice(null);
  }, []);

  const showNotice = useCallback((message: string) => {
    clearTimerRef(noticeTimerRef);
    setAgentNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setAgentNotice(null);
      noticeTimerRef.current = null;
    }, AGENT_NOTICE_DURATION_MS);
  }, []);

  const clearAgentVisuals = useCallback(() => {
    clearNotice();
    clearTimerRef(chipRevealTimerRef);
    setAgentContextChipVisible(false);
    setAgentContextChip(null);
  }, [clearNotice]);

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

  return {
    agentContextChip,
    agentContextChipVisible,
    agentNotice,
    agentChipAnimationKey,
    inputDockRef,
    clearNotice,
    showNotice,
    clearAgentVisuals,
    applyContextChip,
  };
}
