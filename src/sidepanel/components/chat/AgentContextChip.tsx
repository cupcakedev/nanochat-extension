import { memo, useState } from 'react';
import { MuteIcon } from '@sidepanel/components/icons/MuteIcon';

interface AgentContextChipProps {
  title: string;
  faviconUrl: string;
  animationKey: number;
  onDismiss?: () => void;
  onMute?: () => void;
  url?: string;
}

export const AgentContextChip = memo(
  ({ title, faviconUrl, animationKey, onDismiss, onMute }: AgentContextChipProps) => {
    const [showMuteTooltip, setShowMuteTooltip] = useState(false);

    return (
      <div className="mx-auto mb-4 w-full max-w-3xl">
        <div
          key={animationKey}
          className="nano-context-chip-enter inline-flex max-w-full items-center gap-2 rounded-[16px] border border-white/10 bg-neutral-100/80 px-3.5 py-2 text-xs text-neutral-700 backdrop-blur-md"
        >
          {faviconUrl ? (
            <img src={faviconUrl} alt="" className="h-4 w-4 rounded-[4px] shrink-0" />
          ) : (
            <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-neutral-200/30 text-[10px] leading-none text-neutral-600 shrink-0">
              •
            </span>
          )}
          <span className="text-neutral-500 shrink-0">In context:</span>
          <span className="truncate text-neutral-800">{title}</span>
          <div className="shrink-0 flex items-center gap-1">
            {onMute && (
              <div className="relative">
                <button
                  onClick={onMute}
                  onMouseEnter={() => setShowMuteTooltip(true)}
                  onMouseLeave={() => setShowMuteTooltip(false)}
                  className="flex items-center justify-center w-4 h-4 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/40 transition-colors"
                >
                  <MuteIcon size={10} />
                </button>
                {showMuteTooltip && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-neutral-900 text-white text-[10px] rounded-[6px] whitespace-nowrap z-50">
                    Don't show on this site for 30 min
                  </div>
                )}
              </div>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="flex items-center justify-center w-4 h-4 rounded-full text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/40 transition-colors"
              >
                <svg
                  width="8"
                  height="8"
                  viewBox="0 0 8 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                >
                  <path d="M1 1l6 6M7 1L1 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  },
);

AgentContextChip.displayName = 'AgentContextChip';
