import { memo } from 'react';
import { ProgressRingSvg } from '@app/components/icons/ProgressRingSvg';

const CIRCUMFERENCE = 2 * Math.PI * 44;

interface ProgressRingProps {
  progress: number;
}

export const ProgressRing = memo(({ progress }: ProgressRingProps) => {
  const offset = CIRCUMFERENCE * (1 - progress);
  const percentage = Math.round(progress * 100);
  const hasProgress = progress > 0;

  return (
    <div className="relative w-28 h-28">
      <ProgressRingSvg circumference={CIRCUMFERENCE} offset={offset} />
      <div className="absolute inset-0 flex items-center justify-center">
        {hasProgress ? (
          <span className="text-2xl font-semibold text-neutral-800 tabular-nums">
            {percentage}%
          </span>
        ) : (
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
});

ProgressRing.displayName = 'ProgressRing';
