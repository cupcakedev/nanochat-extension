import { memo } from 'react';
import { MenuIcon } from '@app/components/icons/MenuIcon';
import { PlusIcon } from '@app/components/icons/PlusIcon';
import { ModelStatusBar } from '@app/components/status/ModelStatusBar';
import { ModeDropdown } from '@app/components/ui/ModeDropdown';
import type { ChatMode } from '@app/types/mode';
import type { LoadingProgress, SessionStatus } from '@shared/types';

interface ChatHeaderProps {
  onToggleSidebar: () => void;
  onNewChat: () => void;
  status: SessionStatus;
  progress: LoadingProgress | null;
  error: string | null;
  onRetry: () => void;
  mode: ChatMode;
  modeLocked: boolean;
  onModeChange: (mode: ChatMode) => void;
  scrolled?: boolean;
}

const HEADER_ICON_BUTTON = `flex items-center justify-center h-[38px] w-[38px] rounded-[12px]
  bg-neutral-100/80 text-neutral-400 hover:text-white hover:bg-neutral-100
  border border-white/5 backdrop-blur-xl transition-all duration-200`;

const HEADER_NEW_CHAT_BUTTON = `flex items-center gap-1.5 h-[38px] px-3.5 rounded-[12px] text-xs font-medium
  bg-neutral-100/80 text-neutral-400 hover:text-white hover:bg-neutral-100
  border border-white/5 backdrop-blur-xl transition-all duration-200`;

export const ChatHeader = memo(
  ({
    onToggleSidebar,
    onNewChat,
    status,
    progress,
    error,
    onRetry,
    mode,
    modeLocked,
    onModeChange,
    scrolled,
  }: ChatHeaderProps) => (
    <div
      className={`absolute top-0 left-0 right-0 z-20 px-4 py-4 flex items-start justify-between transition-[background-color,border-color] duration-200 ${
        scrolled ? 'bg-neutral-bg border-b border-white/[0.06]' : 'border-b border-transparent'
      }`}
    >
      <div className="flex gap-6">
        <div className="flex flex-col gap-2">
          <button onClick={onToggleSidebar} className={HEADER_ICON_BUTTON}>
            <MenuIcon />
          </button>
        </div>
        <ModeDropdown mode={mode} modeLocked={modeLocked} onModeChange={onModeChange} />
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onNewChat} className={HEADER_NEW_CHAT_BUTTON}>
          <PlusIcon />
          <span>New Chat</span>
        </button>
        <ModelStatusBar status={status} progress={progress} error={error} onRetry={onRetry} />
      </div>
    </div>
  ),
);

ChatHeader.displayName = 'ChatHeader';
