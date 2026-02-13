import { memo } from 'react';

interface AgentContextChipProps {
  title: string;
  faviconUrl: string;
  animationKey: number;
}

export const AgentContextChip = memo(({ title, faviconUrl, animationKey }: AgentContextChipProps) => (
  <div className="mx-auto mb-4 w-full max-w-3xl">
    <div
      key={animationKey}
      className="nano-context-chip-enter inline-flex max-w-full items-center gap-2 rounded-[16px] border border-white/10 bg-neutral-100/80 px-3.5 py-2 text-xs text-neutral-700 backdrop-blur-md"
    >
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="h-4 w-4 rounded-[4px] shrink-0"
        />
      ) : (
        <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-neutral-200/30 text-[10px] leading-none text-neutral-600 shrink-0">
          •
        </span>
      )}
      <span className="text-neutral-500 shrink-0">In context:</span>
      <span className="truncate text-neutral-800">{title}</span>
    </div>
  </div>
));

AgentContextChip.displayName = 'AgentContextChip';
