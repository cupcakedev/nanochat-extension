import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';

interface LoadingBarProps {
  progress: LoadingProgress;
}

export const LoadingBar = memo(({ progress }: LoadingBarProps) => (
  <div className="px-3.5 py-2.5 rounded-[12px] bg-neutral-100/80 border border-white/5 backdrop-blur-md">
    <div className="flex items-center justify-between mb-1.5">
      <span className="text-xs text-neutral-500">{progress.text}</span>
      <span className="text-xs font-medium text-neutral-700 tabular-nums">
        {Math.round(progress.progress * 100)}%
      </span>
    </div>
    <div className="w-full h-1 bg-neutral-200/30 rounded-full overflow-hidden">
      <div
        className="h-full bg-brand-500 rounded-full transition-all duration-300"
        style={{ width: `${progress.progress * 100}%` }}
      />
    </div>
  </div>
));

LoadingBar.displayName = 'LoadingBar';
