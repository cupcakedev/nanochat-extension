import { memo, useCallback } from 'react';
import type { ChatContextSendMode } from '@app/types/mode';
import { ModeTab } from './ModeTab';

interface ContextToggleProps {
  contextMode: ChatContextSendMode;
  onContextModeChange: (mode: ChatContextSendMode) => void;
}

export const ContextToggle = memo(({ contextMode, onContextModeChange }: ContextToggleProps) => {
  const handleWithPage = useCallback(() => onContextModeChange('with-page-context'), [onContextModeChange]);
  const handleWithoutPage = useCallback(() => onContextModeChange('without-page-context'), [onContextModeChange]);

  return (
    <div className="flex items-center gap-1.5 p-1 rounded-[12px] bg-neutral-200/20 backdrop-blur-md">
      <ModeTab active={contextMode === 'with-page-context'} onClick={handleWithPage}>
        Page context
      </ModeTab>
      <ModeTab active={contextMode === 'without-page-context'} onClick={handleWithoutPage}>
        Plain
      </ModeTab>
    </div>
  );
});

ContextToggle.displayName = 'ContextToggle';
