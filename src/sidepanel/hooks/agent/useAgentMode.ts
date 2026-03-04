import { useState, useCallback, useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@sidepanel/services/prompt';
import { AGENT_CONTEXT_UNAVAILABLE_MESSAGE } from '@sidepanel/services/agent';
import type { AgentContextChip } from '@sidepanel/services/agent';
import { ChatMode, requiresPageContext } from '@sidepanel/types/mode';
import { useTabChangeListener } from '@sidepanel/hooks/state/useTabChangeListener';
import { readPreferredMode, writePreferredMode } from './preferred-mode';
import { useAgentVisuals } from './useAgentVisuals';
import { useAgentContext } from './useAgentContext';

export function useAgentMode(
  serviceRef: RefObject<PromptAPIService>,
  hasMessages: boolean,
  isFullScreen: boolean,
) {
  const [mode, setMode] = useState<ChatMode>(isFullScreen ? ChatMode.Chat : readPreferredMode);
  const {
    agentContextChip,
    agentContextChipVisible,
    agentNotice,
    agentChipAnimationKey,
    inputDockRef,
    clearNotice,
    showNotice,
    clearAgentVisuals,
    applyContextChip,
  } = useAgentVisuals();

  const resetAgentState = useCallback(() => {
    clearAgentVisuals();
    setMode(ChatMode.Chat);
  }, [clearAgentVisuals]);

  const showAgentUnavailable = useCallback(
    (message = AGENT_CONTEXT_UNAVAILABLE_MESSAGE) => {
      serviceRef.current.destroySession();
      clearAgentVisuals();
      showNotice(message);
    },
    [clearAgentVisuals, serviceRef, showNotice],
  );
  const { applyAgentContext, refreshAgentContext } = useAgentContext({
    inputDockRef,
    clearNotice,
    applyContextChip,
    showAgentUnavailable,
  });

  const activateMode = useCallback(
    (nextMode: ChatMode, animateContext: boolean) => {
      setMode(nextMode);
      if (!requiresPageContext(nextMode)) return;
      applyAgentContext(animateContext);
    },
    [applyAgentContext],
  );

  const initialModeAppliedRef = useRef(false);
  useEffect(() => {
    if (initialModeAppliedRef.current) return;
    initialModeAppliedRef.current = true;
    if (isFullScreen) return;
    const preferred = readPreferredMode();
    if (!requiresPageContext(preferred)) return;
    queueMicrotask(() => {
      activateMode(preferred, false);
    });
  }, [activateMode, isFullScreen]);

  const restorePreferredMode = useCallback(() => {
    clearAgentVisuals();
    const preferred = readPreferredMode();
    activateMode(preferred, false);
  }, [activateMode, clearAgentVisuals]);

  useTabChangeListener(requiresPageContext(mode) && !hasMessages, refreshAgentContext);

  const handleModeChange = useCallback(
    (nextMode: ChatMode) => {
      if (isFullScreen) return;
      writePreferredMode(nextMode);

      if (!requiresPageContext(nextMode)) {
        resetAgentState();
        return;
      }

      activateMode(nextMode, true);
    },
    [activateMode, isFullScreen, resetAgentState],
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

export type { AgentContextChip };
