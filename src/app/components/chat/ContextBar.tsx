import { memo, useState } from 'react';
import type { ContextUsage } from '@app/hooks/useChat';

interface ContextBarProps {
  usage: ContextUsage;
}

export const ContextBar = memo(({ usage }: ContextBarProps) => {
  const [dismissed, setDismissed] = useState(false);
  const remaining = 100 - usage.percent;
  const isLow = remaining < 20;

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-30 h-0.5 bg-white/5">
        <div
          className={`h-full transition-all duration-500 ${
            isLow ? 'bg-red-500' : 'bg-brand-500'
          }`}
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      {isLow && !dismissed && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 pl-3 pr-1.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur-md">
          <span className="text-[11px] text-red-400 font-medium whitespace-nowrap">
            {remaining}% context remaining
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="flex items-center justify-center w-4 h-4 rounded-full text-red-400 transition-colors"
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
});

ContextBar.displayName = 'ContextBar';
