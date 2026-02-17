import { memo } from 'react';

interface SuggestionChipProps {
  label: string;
  onClick: () => void;
}

export const SuggestionChip = memo(({ label, onClick }: SuggestionChipProps) => (
  <button
    onClick={onClick}
    className="inline-flex items-center px-3.5 py-2 rounded-[14px] text-xs text-neutral-600
      bg-neutral-100/60 border border-white/5 backdrop-blur-md
      hover:bg-neutral-100/90 hover:text-neutral-800 hover:border-white/10
      transition-all duration-200 text-left"
  >
    {label}
  </button>
));

SuggestionChip.displayName = 'SuggestionChip';
