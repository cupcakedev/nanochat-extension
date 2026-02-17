import { memo } from 'react';
import type { ChatSummary } from '@shared/types';
import { TrashIcon } from '@app/components/icons/TrashIcon';

interface ChatListItemProps {
  summary: ChatSummary;
  isActive: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const ChatListItem = memo(({ summary, isActive, onSelect, onDelete }: ChatListItemProps) => (
  <div
    role="button"
    tabIndex={0}
    onClick={() => onSelect(summary.id)}
    onKeyDown={(e) => e.key === 'Enter' && onSelect(summary.id)}
    className={`group relative flex items-center gap-3 pl-5 pr-3 py-2.5 rounded-[12px] cursor-pointer
      transition-all duration-200
      ${
        isActive
          ? 'bg-neutral-200/50 text-neutral-800'
          : 'text-neutral-500 hover:bg-neutral-200/30 hover:text-neutral-700'
      }`}
  >
    {isActive && (
      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-3 bg-brand-500 rounded-full" />
    )}
    <span className="flex-1 text-sm truncate font-medium">{summary.title}</span>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onDelete(summary.id);
      }}
      className="opacity-0 group-hover:opacity-100 flex items-center justify-center w-7 h-7 rounded-[8px]
        text-neutral-400 hover:text-red-400 hover:bg-red-400/10 transition-all duration-200 shrink-0
        transform translate-x-2 group-hover:translate-x-0"
      title="Delete chat"
    >
      <TrashIcon />
    </button>
  </div>
));

ChatListItem.displayName = 'ChatListItem';
