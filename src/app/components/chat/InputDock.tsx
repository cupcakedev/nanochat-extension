import { memo } from 'react';
import type { RefObject } from 'react';
import { AgentContextChip } from './AgentContextChip';
import { AgentNotice } from './AgentNotice';
import { ChatInput } from '@app/components/ui/ChatInput';
import type { AgentContextChip as AgentContextChipType } from '@app/hooks/useAgentMode';
import { ChatMode, requiresPageContext } from '@app/types/mode';
import type { ChatContextSendMode, ChatSendOptions } from '@app/types/mode';
import type { PageSource } from '@shared/types';

interface InputDockProps {
  dockRef: RefObject<HTMLDivElement | null>;
  mode: ChatMode;
  agentContextChip: AgentContextChipType | null;
  agentContextChipVisible: boolean;
  agentChipAnimationKey: number;
  chatPageSource?: PageSource;
  chatContextSource: PageSource | null;
  chatContextAnimationKey: number;
  agentNotice: string | null;
  onSend: (message: string, images?: string[], options?: ChatSendOptions) => void;
  onStop: () => void;
  streaming: boolean;
  disabled: boolean;
  contextMode: ChatContextSendMode;
  onDismissChatContext: () => void;
  onAddChatContext: () => void;
}

function resolveContextChip(
  mode: ChatMode,
  agentChip: AgentContextChipType | null,
  agentVisible: boolean,
  chatContextSource: PageSource | null,
  chatPageSource?: PageSource,
): { show: boolean; title: string; favicon: string; dismissable: boolean } {
  if (mode === ChatMode.Agent) {
    const show = requiresPageContext(mode) && agentChip !== null && agentVisible;
    return { show, title: agentChip?.title ?? '', favicon: agentChip?.faviconUrl ?? '', dismissable: false };
  }
  const source = chatContextSource ?? chatPageSource;
  return { show: Boolean(source), title: source?.title ?? '', favicon: source?.faviconUrl ?? '', dismissable: Boolean(chatContextSource) };
}

export const InputDock = memo(({
  dockRef,
  mode,
  agentContextChip,
  agentContextChipVisible,
  agentChipAnimationKey,
  chatPageSource,
  chatContextSource,
  chatContextAnimationKey,
  agentNotice,
  onSend,
  onStop,
  streaming,
  disabled,
  contextMode,
  onDismissChatContext,
  onAddChatContext,
}: InputDockProps) => {
  const chip = resolveContextChip(mode, agentContextChip, agentContextChipVisible, chatContextSource, chatPageSource);
  const contextAnimationKey = mode === ChatMode.Chat ? chatContextAnimationKey : agentChipAnimationKey;
  const showAddContext = mode !== ChatMode.Agent && !chatContextSource;

  return (
    <div ref={dockRef} className="absolute bottom-0 left-0 right-0 z-20 px-6 pt-3 pb-4">
      {chip.show && (
        <AgentContextChip
          title={chip.title}
          faviconUrl={chip.favicon}
          animationKey={contextAnimationKey}
          onDismiss={chip.dismissable ? onDismissChatContext : undefined}
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
        showAddContext={showAddContext}
        onAddContext={onAddChatContext}
      />
    </div>
  );
});

InputDock.displayName = 'InputDock';
