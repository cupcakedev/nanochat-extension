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
      className="group flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer
        transition-colors hover:bg-neutral-200/50"
    >
      <span
        className={`flex-1 text-sm truncate ${isActive ? 'text-neutral-800 font-medium' : 'text-neutral-600'}`}
      >
        {summary.title}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(summary.id);
        }}
        className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded
          text-neutral-400 hover:text-neutral-800 transition-colors shrink-0"
        title="Delete chat"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
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
