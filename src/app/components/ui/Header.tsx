import { memo, useCallback, useRef, useState } from 'react';
import { EXTENSION_NAME } from '@shared/constants';
import { Logo } from './Logo';
import type { ChatSummary } from '@shared/types';
import { PlusIcon } from '@app/components/icons/PlusIcon';
import { ChatListItem } from '@app/components/sidebar/ChatListItem';

interface HeaderProps {
  onClear?: () => void;
  showClear?: boolean;
  chatSummaries?: ChatSummary[];
  activeChatId?: string | null;
  onSelectChat?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  onNewChat?: () => void;
}

export const Header = memo(
  ({
    onClear,
    showClear = false,
    chatSummaries,
    activeChatId,
    onSelectChat,
    onDeleteChat,
    onNewChat,
  }: HeaderProps) => {
    const [historyOpen, setHistoryOpen] = useState(false);
    const listRef = useRef<HTMLDivElement>(null);
    const hasHistory = chatSummaries && onSelectChat;

    const toggleHistory = useCallback(() => setHistoryOpen((v) => !v), []);

    const handleSelect = useCallback(
      (id: string) => {
        onSelectChat?.(id);
        setHistoryOpen(false);
      },
      [onSelectChat],
    );

    const handleNew = useCallback(() => {
      onNewChat?.();
      setHistoryOpen(false);
    }, [onNewChat]);

    return (
      <header
        className="absolute top-0 left-0 right-0 z-20 m-4 rounded-xl
          bg-neutral-100 shadow-md shadow-black/10 overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 py-3">
          <Logo size={28} />
          <h1 className="flex-1 text-base font-semibold text-neutral-800">{EXTENSION_NAME}</h1>
          {hasHistory && (
            <button
              onClick={toggleHistory}
              className="flex items-center justify-center w-7 h-7 rounded-md
                text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
              title={historyOpen ? 'Close history' : 'Chat history'}
            >
              {historyOpen ? <ChevronUpIcon /> : <HistoryIcon />}
            </button>
          )}
          {hasHistory && (
            <button
              onClick={handleNew}
              className="flex items-center justify-center w-7 h-7 rounded-md
                text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
              title="New chat"
            >
              <PlusIcon />
            </button>
          )}
          {showClear && onClear && (
            <button
              onClick={onClear}
              className="flex items-center justify-center w-7 h-7 rounded-md
                text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200 transition-colors"
              title="Clear chat"
            >
              <TrashIcon />
            </button>
          )}
        </div>
        <div
          ref={listRef}
          className="transition-[max-height] duration-200 ease-in-out overflow-y-auto"
          style={{ maxHeight: historyOpen ? '60vh' : '0px' }}
        >
          <div className="px-2 pb-2 space-y-0.5">
            {chatSummaries?.map((s) => (
              <ChatListItem
                key={s.id}
                summary={s}
                isActive={s.id === activeChatId}
                onSelect={handleSelect}
                onDelete={onDeleteChat!}
              />
            ))}
          </div>
        </div>
      </header>
    );
  },
);

Header.displayName = 'Header';

const TrashIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v9a1 1 0 001 1h4a1 1 0 001-1V4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

TrashIcon.displayName = 'TrashIcon';

const HistoryIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M2 3v4h4M2.5 7A5.5 5.5 0 108 2.5 5.48 5.48 0 002.5 7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 5v3l2 1.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

HistoryIcon.displayName = 'HistoryIcon';

const ChevronUpIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M4 10l4-4 4 4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

ChevronUpIcon.displayName = 'ChevronUpIcon';
