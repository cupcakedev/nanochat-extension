import { memo } from 'react';
import type { RefObject } from 'react';
import { AgentContextChip } from './AgentContextChip';
import { AgentNotice } from './AgentNotice';
import { ChatInput } from '@app/components/ui/ChatInput';
import type { AgentContextChip as AgentContextChipType } from '@app/hooks/useAgentMode';
import type { ChatContextSendMode, ChatMode, ChatSendOptions } from '@app/types/mode';
import { requiresPageContext } from '@app/types/mode';
import type { PageSource } from '@shared/types';

interface InputDockProps {
  dockRef: RefObject<HTMLDivElement | null>;
  mode: ChatMode;
  agentContextChip: AgentContextChipType | null;
  agentContextChipVisible: boolean;
  agentChipAnimationKey: number;
  chatPageSource?: PageSource;
  chatContextAnimationKey: number;
  agentNotice: string | null;
  onSend: (message: string, images?: string[], options?: ChatSendOptions) => void;
  onStop: () => void;
  streaming: boolean;
  disabled: boolean;
  contextMode: ChatContextSendMode;
  onContextModeChange: (mode: ChatContextSendMode) => void;
}

const shouldShowContextChip = (
  mode: ChatMode,
  chip: AgentContextChipType | null,
  visible: boolean,
  chatPageSource?: PageSource,
): boolean => {
  if (mode === 'chat') return Boolean(chatPageSource);
  return requiresPageContext(mode) && chip !== null && visible;
};

export const InputDock = memo(({
  dockRef,
  mode,
  agentContextChip,
  agentContextChipVisible,
  agentChipAnimationKey,
  chatPageSource,
  chatContextAnimationKey,
  agentNotice,
  onSend,
  onStop,
  streaming,
  disabled,
  contextMode,
  onContextModeChange,
}: InputDockProps) => {
  const showContextChip = shouldShowContextChip(mode, agentContextChip, agentContextChipVisible, chatPageSource);
  const contextTitle = mode === 'chat' ? (chatPageSource?.title ?? '') : (agentContextChip?.title ?? '');
  const contextFavicon = mode === 'chat' ? (chatPageSource?.faviconUrl ?? '') : (agentContextChip?.faviconUrl ?? '');
  const contextAnimationKey = mode === 'chat' ? chatContextAnimationKey : agentChipAnimationKey;
  const showContextToggle = mode !== 'agent';

  return (
    <div ref={dockRef} className="absolute bottom-0 left-0 right-0 z-20 px-6 pt-3 pb-4">
      {showContextChip && (
        <AgentContextChip
          title={contextTitle}
          faviconUrl={contextFavicon}
          animationKey={contextAnimationKey}
        />
      )}
      {agentNotice && <AgentNotice message={agentNotice} />}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        streaming={streaming}
        disabled={disabled}
        placeholder="Ask anything..."
        mode={mode}
        contextMode={contextMode}
        onContextModeChange={onContextModeChange}
        showContextToggle={showContextToggle}
      />
    </div>
  );
});

InputDock.displayName = 'InputDock';
