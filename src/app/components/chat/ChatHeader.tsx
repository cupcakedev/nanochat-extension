import { memo } from 'react';
import { MenuIcon } from '@app/components/icons/MenuIcon';
import { PlusIcon } from '@app/components/icons/PlusIcon';
import { TrashIcon } from '@app/components/icons/TrashIcon';
import { ModelStatusBar } from '@app/components/status/ModelStatusBar';
import { ModeDropdown } from '@app/components/ui/ModeDropdown';
import type { ChatMode } from '@app/types/mode';
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
  mode: ChatMode;
  modeLocked: boolean;
  onModeChange: (mode: ChatMode) => void;
}

const HEADER_BUTTON_CLASS =
  `flex items-center justify-center h-[38px] w-[38px] rounded-[12px]
  bg-neutral-100/80 text-neutral-400 hover:text-white hover:bg-neutral-100
  border border-white/5 backdrop-blur-xl transition-all duration-200`;

const HEADER_BUTTON_DISABLED_CLASS =
  `${HEADER_BUTTON_CLASS} disabled:opacity-40 disabled:cursor-not-allowed`;

export const ChatHeader = memo(({
  onToggleSidebar,
  onNewChat,
  onClearChat,
  activeChatId,
  status,
  progress,
  error,
  onRetry,
  mode,
  modeLocked,
  onModeChange,
}: ChatHeaderProps) => (
  <>
    <div className="absolute top-4 left-4 z-20 flex gap-6">
      <div className="flex flex-col gap-2">
        <button onClick={onToggleSidebar} className={HEADER_BUTTON_CLASS}>
          <MenuIcon />
        </button>
        <button onClick={onNewChat} className={HEADER_BUTTON_CLASS}>
          <PlusIcon />
        </button>
      </div>
      <ModeDropdown mode={mode} modeLocked={modeLocked} onModeChange={onModeChange} />
    </div>
    <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
      <button
        onClick={onClearChat}
        disabled={!activeChatId}
        className={HEADER_BUTTON_DISABLED_CLASS}
        title="Clear current chat"
      >
        <TrashIcon />
      </button>
      <ModelStatusBar status={status} progress={progress} error={error} onRetry={onRetry} />
    </div>
  </>
));

ChatHeader.displayName = 'ChatHeader';
