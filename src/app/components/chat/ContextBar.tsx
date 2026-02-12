import { memo } from 'react';
import type { ContextUsage } from '@app/hooks/useChat';

interface ContextBarProps {
  usage: ContextUsage;
}

export const ContextBar = memo(({ usage }: ContextBarProps) => {
  const remaining = 100 - usage.percent;
  const isLow = remaining < 20;

  return (
    <div className="absolute top-0 left-0 right-0 z-30 h-0.5 bg-white/5">
      <div
        className={`h-full transition-all duration-500 ${
          isLow ? 'bg-red-500' : 'bg-brand-500'
        }`}
        style={{ width: `${usage.percent}%` }}
      />
    </div>
  );
});

ContextBar.displayName = 'ContextBar';
