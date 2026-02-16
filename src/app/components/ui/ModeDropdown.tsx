import { memo, useCallback, useRef, useState } from 'react';
import { useOutsideClick } from '@app/hooks/useOutsideClick';
import { BadgeChip } from './BadgeChip';
import { ChatMode } from '@app/types/mode';

interface ModeDropdownProps {
  mode: ChatMode;
  modeLocked: boolean;
  onModeChange: (mode: ChatMode) => void;
}

interface ModeOption {
  value: ChatMode;
  label: string;
  badge?: string;
}

const MODE_OPTIONS: ModeOption[] = [
  { value: ChatMode.Chat, label: 'Chat' },
  { value: ChatMode.Agent, label: 'Agent', badge: 'Beta' },
];

function findOption(m: ChatMode): ModeOption {
  return MODE_OPTIONS.find((o) => o.value === m) ?? MODE_OPTIONS[0];
}

export const ModeDropdown = memo(({ mode, modeLocked, onModeChange }: ModeDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [showLockedPopover, setShowLockedPopover] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setShowLockedPopover(false);
  }, []);

  useOutsideClick(containerRef, close, open || showLockedPopover);

  const handleButtonClick = useCallback(() => {
    if (modeLocked) {
      setShowLockedPopover((v) => !v);
      setOpen(false);
      return;
    }
    setShowLockedPopover(false);
    setOpen((v) => !v);
  }, [modeLocked]);

  const handleSelect = useCallback((nextMode: ChatMode) => {
    if (nextMode !== mode) onModeChange(nextMode);
    setOpen(false);
  }, [mode, onModeChange]);

  return (
    <div className="relative h-[38px]" ref={containerRef}>
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-2 h-[38px] rounded-[12px] hover:bg-neutral-100/80 px-3 transition-all duration-200 text-lg select-none"
      >
        <span className={`flex items-center gap-2 ${modeLocked ? 'opacity-60' : ''}`}>
          {findOption(mode).label}
          {findOption(mode).badge && (
            <BadgeChip>{findOption(mode).badge}</BadgeChip>
          )}
        </span>
        <svg
          width="10"
          height="6"
          viewBox="0 0 10 6"
          fill="none"
          className={`opacity-40 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        >
          <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 min-w-[160px] rounded-[14px] border border-white/10 bg-neutral-100/95 p-1.5 shadow-xl backdrop-blur-xl">
          {MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleSelect(opt.value)}
              className={`w-full flex mb-1 last:mb-0 items-center justify-between gap-3 px-3 py-2.5 text-sm rounded-[10px] transition-colors ${
                opt.value === mode
                  ? 'text-white bg-white/10'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="flex items-center gap-2">
                {opt.label}
                {opt.badge && <BadgeChip>{opt.badge}</BadgeChip>}
              </span>
            </button>
          ))}
        </div>
      )}

      {showLockedPopover && modeLocked && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 rounded-[14px] border border-amber-300/20 bg-neutral-100/95 px-3.5 py-2.5 text-xs leading-relaxed text-neutral-500 shadow-xl backdrop-blur-xl">
          Start a new chat to switch mode.
        </div>
      )}
    </div>
  );
});

ModeDropdown.displayName = 'ModeDropdown';
