import { memo } from 'react';
import type { ChatSummary } from '@shared/types';

interface ChatListItemProps {
  summary: ChatSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ChatListItem = memo(
  ({ summary, isActive, onSelect, onDelete }: ChatListItemProps) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(summary.id)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(summary.id)}
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200 border border-transparent
        ${isActive
          ? 'bg-neutral-200/40 border-white/5 shadow-inner shadow-black/20'
          : 'hover:bg-neutral-200/20 hover:border-white/5 hover:scale-[1.01] active:scale-[0.99]'
        }`}
    >
      {isActive && (
        <div className="absolute left-0.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-brand-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
      )}
      <span
        className={`flex-1 text-sm truncate transition-all duration-200 ${isActive
          ? 'text-neutral-800 font-medium translate-x-1.5'
          : 'text-neutral-500 group-hover:text-neutral-700'
          }`}
      >
        {summary.title}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(summary.id);
        }}
        className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-6 h-6 rounded-lg
          text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 shrink-0 transform translate-x-2 group-hover:translate-x-0"
        title="Delete chat"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  ),
);

ChatListItem.displayName = 'ChatListItem';
