import { memo, useCallback, useRef, useState } from 'react';
import { useOutsideClick } from '@app/hooks/useOutsideClick';
import type { ChatMode } from '@app/types/mode';
import { ModeTab } from './ModeTab';

interface ModeSwitcherProps {
  mode: ChatMode;
  modeLocked: boolean;
  onModeChange: (mode: ChatMode) => void;
}

export const ModeSwitcher = memo(({ mode, modeLocked, onModeChange }: ModeSwitcherProps) => {
  const [showLockedPopover, setShowLockedPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closePopover = useCallback(() => setShowLockedPopover(false), []);
  const popoverVisible = showLockedPopover && modeLocked;

  useOutsideClick(containerRef, closePopover, popoverVisible);

  const handleTabClick = useCallback((nextMode: ChatMode) => {
    if (nextMode === mode) {
      setShowLockedPopover(false);
      return;
    }

    if (modeLocked) {
      setShowLockedPopover(true);
      return;
    }

    setShowLockedPopover(false);
    onModeChange(nextMode);
  }, [mode, modeLocked, onModeChange]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex items-center gap-1.5 p-1 rounded-[12px] bg-neutral-200/20 backdrop-blur-md">
        <ModeTab active={mode === 'chat'} onClick={() => handleTabClick('chat')}>
          Chat
        </ModeTab>
        <ModeTab active={mode === 'agent'} onClick={() => handleTabClick('agent')}>
          Agent
          <span className="px-1.5 py-0.5 rounded-[8px] text-[11px] leading-none bg-brand-500/20 text-brand-300">
            Beta
          </span>
        </ModeTab>
        <ModeTab active={mode === 'interactive'} onClick={() => handleTabClick('interactive')}>
          Interactive
        </ModeTab>
      </div>
      {popoverVisible && (
        <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-[12px] border border-amber-300/25 bg-neutral-100/95 px-3 py-2 text-xs text-neutral-800 shadow-lg backdrop-blur-md">
          To switch mode, start a new chat.
        </div>
      )}
    </div>
  );
});

ModeSwitcher.displayName = 'ModeSwitcher';
