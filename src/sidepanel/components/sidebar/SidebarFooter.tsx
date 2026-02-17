import { memo } from 'react';
import { InfoIcon } from '@sidepanel/components/icons/InfoIcon';

interface SidebarFooterProps {
  onAboutClick: () => void;
}

export const SidebarFooter = memo(({ onAboutClick }: SidebarFooterProps) => (
  <div className="px-4 pt-2 pb-4">
    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-3" />
    <button
      onClick={onAboutClick}
      className="flex items-center gap-2 px-3 py-2 w-full rounded-[10px] text-xs
        text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/20
        transition-all duration-200"
    >
      <InfoIcon />
      <span>About</span>
    </button>
  </div>
));

SidebarFooter.displayName = 'SidebarFooter';
