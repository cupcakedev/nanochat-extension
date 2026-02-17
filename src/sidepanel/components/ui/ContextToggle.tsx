import { memo, useCallback } from 'react';
import { ChatContextSendMode } from '@sidepanel/types/mode';
import { ModeTab } from './ModeTab';

interface ContextToggleProps {
  contextMode: ChatContextSendMode;
  onContextModeChange: (mode: ChatContextSendMode) => void;
}

export const ContextToggle = memo(({ contextMode, onContextModeChange }: ContextToggleProps) => {
  const handleWithPage = useCallback(
    () => onContextModeChange(ChatContextSendMode.WithPageContext),
    [onContextModeChange],
  );
  const handleWithoutPage = useCallback(
    () => onContextModeChange(ChatContextSendMode.WithoutPageContext),
    [onContextModeChange],
  );

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-[12px] bg-neutral-200/20 backdrop-blur-md">
      <ModeTab
        active={contextMode === ChatContextSendMode.WithPageContext}
        onClick={handleWithPage}
      >
        Page context
      </ModeTab>
      <ModeTab
        active={contextMode === ChatContextSendMode.WithoutPageContext}
        onClick={handleWithoutPage}
      >
        Plain
      </ModeTab>
    </div>
  );
});

ContextToggle.displayName = 'ContextToggle';
