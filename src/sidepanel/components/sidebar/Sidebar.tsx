import { memo, useCallback, useState } from 'react';
import { Logo } from '@sidepanel/components/ui/Logo';
import type { ChatSummary } from '@shared/types';
import { PlusIcon } from '@sidepanel/components/icons/PlusIcon';
import { ChatListItem } from '@sidepanel/components/sidebar/ChatListItem';
import { SidebarFooter } from '@sidepanel/components/sidebar/SidebarFooter';
import { AboutModal } from '@sidepanel/components/sidebar/AboutModal';

interface SidebarProps {
  chatSummaries: ChatSummary[];
  activeChatId: string | null;
  isOpen: boolean;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}

export const Sidebar = memo(
  ({
    chatSummaries,
    activeChatId,
    isOpen,
    onSelectChat,
    onDeleteChat,
    onNewChat,
    onClose,
  }: SidebarProps) => {
    const [aboutOpen, setAboutOpen] = useState(false);
    const openAbout = useCallback(() => setAboutOpen(true), []);
    const closeAbout = useCallback(() => setAboutOpen(false), []);

    const handleNewChat = useCallback(() => {
      onNewChat();
      onClose();
    }, [onNewChat, onClose]);

    const handleSelectChat = useCallback(
      (id: string) => {
        onSelectChat(id);
        onClose();
      },
      [onSelectChat, onClose],
    );

    return (
      <>
        <div
          className={`absolute inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          onClick={onClose}
        />

        <aside
          className={`absolute top-0 left-0 bottom-0 z-50 w-[280px] flex flex-col border-r border-white/5 bg-neutral-100/95 backdrop-blur-xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="flex items-center justify-between px-4 py-5">
            <div className="p-1.5 bg-neutral-200/10 rounded-[12px] border border-white/5">
              <Logo size={20} />
            </div>
            <button
              onClick={handleNewChat}
              className="flex items-center gap-2 px-3 py-1.5 rounded-[12px] text-xs font-medium
                bg-neutral-200/20 text-neutral-400 hover:text-white hover:bg-neutral-200/30
                border border-white/5 backdrop-blur-md transition-all duration-200"
            >
              <PlusIcon />
              <span>New Chat</span>
            </button>
          </div>

          <div className="px-4 pb-4">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4">
            {chatSummaries.length > 0 ? (
              <div className="space-y-1.5">
                <div className="px-3 py-2 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                  Today
                </div>
                {chatSummaries.map((s) => (
                  <ChatListItem
                    key={s.id}
                    summary={s}
                    isActive={s.id === activeChatId}
                    onSelect={handleSelectChat}
                    onDelete={onDeleteChat}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <p className="text-xs text-neutral-500">No conversations yet</p>
                <p className="mt-1 text-[11px] text-neutral-400">Start a new chat to begin</p>
              </div>
            )}
          </div>

          <SidebarFooter onAboutClick={openAbout} />
        </aside>

        <AboutModal isOpen={aboutOpen} onClose={closeAbout} />
      </>
    );
  },
);

Sidebar.displayName = 'Sidebar';
