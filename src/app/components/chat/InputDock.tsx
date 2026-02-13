import { memo } from 'react';
import type { RefObject } from 'react';
import { AgentContextChip } from './AgentContextChip';
import { AgentNotice } from './AgentNotice';
import { ChatInput } from '@app/components/ui/ChatInput';
import type { AgentContextChip as AgentContextChipType } from '@app/hooks/useAgentMode';
import type { ChatMode } from '@app/types/mode';
import { requiresPageContext } from '@app/types/mode';

interface InputDockProps {
  dockRef: RefObject<HTMLDivElement | null>;
  mode: ChatMode;
  agentContextChip: AgentContextChipType | null;
  agentContextChipVisible: boolean;
  agentChipAnimationKey: number;
  agentNotice: string | null;
  onSend: (message: string, images?: string[]) => void;
  onStop: () => void;
  streaming: boolean;
  disabled: boolean;
  hasMessages: boolean;
  onModeChange: (mode: ChatMode) => void;
}

const shouldShowContextChip = (
  mode: ChatMode,
  chip: AgentContextChipType | null,
  visible: boolean,
): chip is AgentContextChipType => requiresPageContext(mode) && chip !== null && visible;

export const InputDock = memo(({
  dockRef,
  mode,
  agentContextChip,
  agentContextChipVisible,
  agentChipAnimationKey,
  agentNotice,
  onSend,
  onStop,
  streaming,
  disabled,
  hasMessages,
  onModeChange,
}: InputDockProps) => (
  <div ref={dockRef} className="absolute bottom-0 left-0 right-0 z-20 px-6 pt-3 pb-4">
    {shouldShowContextChip(mode, agentContextChip, agentContextChipVisible) && (
      <AgentContextChip
        title={agentContextChip.title}
        faviconUrl={agentContextChip.faviconUrl}
        animationKey={agentChipAnimationKey}
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
      modeLocked={hasMessages}
      onModeChange={onModeChange}
    />
  </div>
));

InputDock.displayName = 'InputDock';
