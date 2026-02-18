import { memo } from 'react';
import { MenuIcon } from '@sidepanel/components/icons/MenuIcon';
import { PlusIcon } from '@sidepanel/components/icons/PlusIcon';
import { ExpandIcon } from '@sidepanel/components/icons/ExpandIcon';
import { ModelStatusBar } from '@sidepanel/components/status/ModelStatusBar';
import { ModeDropdown } from '@sidepanel/components/ui/ModeDropdown';
import type { ChatMode } from '@sidepanel/types/mode';
import type { LoadingProgress, SessionStatus } from '@shared/types';

function openFullScreen() {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/sidepanel.html') });
  window.close();
}

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
  isFullScreen?: boolean;
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
    isFullScreen,
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
        {isFullScreen ? (
          <div className="flex flex-col justify-center gap-0.5">
            <span className="text-lg text-white/80 px-3 leading-none">Chat</span>
            <span className="text-[11px] text-neutral-500 px-3 leading-none">
              Full screen — agent unavailable
            </span>
          </div>
        ) : (
          <ModeDropdown mode={mode} modeLocked={modeLocked} onModeChange={onModeChange} />
        )}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onNewChat} className={HEADER_NEW_CHAT_BUTTON}>
          <PlusIcon />
          <span>New Chat</span>
        </button>
        {!isFullScreen && (
          <button
            onClick={openFullScreen}
            className={HEADER_ICON_BUTTON}
            title="Open in full screen"
          >
            <ExpandIcon />
          </button>
        )}
        <ModelStatusBar status={status} progress={progress} error={error} onRetry={onRetry} />
      </div>
    </div>
  ),
);

ChatHeader.displayName = 'ChatHeader';
