import { memo } from 'react';
import { MenuIcon } from '@app/components/icons/MenuIcon';
import { PlusIcon } from '@app/components/icons/PlusIcon';
import { TrashIcon } from '@app/components/icons/TrashIcon';
import { ModelStatusBar } from '@app/components/status/ModelStatusBar';
import type { LoadingProgress, SessionStatus } from '@shared/types';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  activeChatId: string | null;
  status: SessionStatus;
  progress: LoadingProgress | null;
  error: string | null;
  onRetry: () => void;
}

const TOOLBAR_BUTTON_CLASS =
  'p-2 rounded-lg bg-neutral-100/50 hover:bg-neutral-100/80 text-neutral-400 hover:text-white transition-colors border border-white/5 backdrop-blur-md';

const ACTION_BUTTON_CLASS =
  `flex h-[38px] items-center gap-2 px-3 rounded-lg text-xs font-medium
  bg-neutral-100/50 text-neutral-400 hover:text-white hover:bg-neutral-100/80
  border border-white/5 transition-all duration-200 backdrop-blur-md`;

const CLEAR_BUTTON_CLASS =
  `${ACTION_BUTTON_CLASS} disabled:opacity-50 disabled:cursor-not-allowed`;

export const ChatHeader = memo(({
  onToggleSidebar,
  onNewChat,
  onClearChat,
  activeChatId,
  status,
  progress,
  error,
  onRetry,
}: ChatHeaderProps) => (
  <>
    <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
      <button onClick={onToggleSidebar} className={TOOLBAR_BUTTON_CLASS}>
        <MenuIcon />
      </button>
      <button onClick={onNewChat} className={ACTION_BUTTON_CLASS}>
        <PlusIcon />
      </button>
    </div>
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
      <button
        onClick={onClearChat}
        disabled={!activeChatId}
        className={CLEAR_BUTTON_CLASS}
        title="Clear current chat"
      >
        <TrashIcon />
      </button>
      <ModelStatusBar status={status} progress={progress} error={error} onRetry={onRetry} />
    </div>
  </>
));

ChatHeader.displayName = 'ChatHeader';
