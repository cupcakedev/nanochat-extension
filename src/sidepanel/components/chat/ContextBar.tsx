import { memo, useState } from 'react';
import type { ContextUsage } from '@sidepanel/services/chat';

interface ContextBarProps {
  usage: ContextUsage;
}

const CONTEXT_LOW_THRESHOLD = 20;

export const ContextBar = memo(({ usage }: ContextBarProps) => {
  const [dismissed, setDismissed] = useState(false);
  const remaining = 100 - usage.percent;
  const isLow = remaining < CONTEXT_LOW_THRESHOLD;

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-30 h-0.5 bg-white/5">
        <div
          className={`h-full transition-all duration-500 ${isLow ? 'bg-red-500' : 'bg-brand-500'}`}
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      {isLow && !dismissed && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 pl-3.5 pr-2 py-1.5 rounded-[12px] bg-red-500/10 border border-red-500/15 backdrop-blur-md">
          <span className="text-[11px] text-red-400 font-medium whitespace-nowrap">
            {remaining}% context remaining
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="flex items-center justify-center w-5 h-5 rounded-[8px] text-red-400 hover:bg-red-500/10 transition-all duration-200"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path
                d="M1 1l6 6M7 1L1 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
});

ContextBar.displayName = 'ContextBar';
