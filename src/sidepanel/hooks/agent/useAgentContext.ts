import { useCallback, useRef } from 'react';
import type { RefObject } from 'react';
import { extractAgentErrorMessage, getAgentPageContext } from '@sidepanel/services/agent';

const INDICATOR_BOTTOM_ADJUST_PX = -8;

interface UseAgentContextParams {
  inputDockRef: RefObject<HTMLDivElement | null>;
  clearNotice: () => void;
  applyContextChip: (title: string, url: string, faviconUrl: string, animate: boolean) => void;
  showAgentUnavailable: (message: string) => void;
}

export function useAgentContext({
  inputDockRef,
  clearNotice,
  applyContextChip,
  showAgentUnavailable,
}: UseAgentContextParams) {
  const refreshingRef = useRef(false);

  const computeIndicatorOffset = useCallback((): number => {
    const dock = inputDockRef.current;
    if (!dock) return 180;
    const rect = dock.getBoundingClientRect();
    const raw = window.innerHeight - rect.top + 18 + INDICATOR_BOTTOM_ADJUST_PX;
    return Math.round(Math.min(Math.max(raw, 80), 360));
  }, [inputDockRef]);

  const fetchAndApplyContext = useCallback(
    async (animate: boolean) => {
      const { tab } = await getAgentPageContext(
        animate
          ? { indicatorBottomOffset: computeIndicatorOffset(), showIndicator: true }
          : { showIndicator: false },
      );
      clearNotice();
      applyContextChip(tab.title, tab.url, tab.favIconUrl, animate);
    },
    [applyContextChip, clearNotice, computeIndicatorOffset],
  );

  const applyAgentContext = useCallback(
    async (animate: boolean) => {
      try {
        await fetchAndApplyContext(animate);
      } catch (error) {
        showAgentUnavailable(extractAgentErrorMessage(error));
      }
    },
    [fetchAndApplyContext, showAgentUnavailable],
  );

  const refreshAgentContext = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      await applyAgentContext(false);
    } finally {
      refreshingRef.current = false;
    }
  }, [applyAgentContext]);

  return { applyAgentContext, refreshAgentContext };
}
