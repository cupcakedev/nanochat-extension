import { memo } from 'react';

const DOT_DELAYS = [0, 150, 300] as const;
const DOT_CLASS = 'w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce';

export const TypingIndicator = memo(() => (
  <div className="flex items-center gap-1 px-1 py-0.5">
    {DOT_DELAYS.map((delay) => (
      <span key={delay} className={DOT_CLASS} style={{ animationDelay: `${delay}ms` }} />
    ))}
  </div>
));

TypingIndicator.displayName = 'TypingIndicator';
