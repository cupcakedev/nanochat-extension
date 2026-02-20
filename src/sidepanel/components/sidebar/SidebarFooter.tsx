import { memo } from 'react';
import { InfoIcon } from '@sidepanel/components/icons/InfoIcon';
import { SettingsIcon } from '@sidepanel/components/icons/SettingsIcon';

interface SidebarFooterProps {
  onSettingsClick: () => void;
  onAboutClick: () => void;
}

const FOOTER_BTN = `flex items-center gap-2 px-3 py-2 w-full rounded-[10px] text-xs
  text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/20
  transition-all duration-200`;

export const SidebarFooter = memo(({ onSettingsClick, onAboutClick }: SidebarFooterProps) => (
  <div className="px-4 pt-2 pb-4">
    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent mb-3" />
    <button onClick={onSettingsClick} className={FOOTER_BTN}>
      <SettingsIcon />
      <span>Settings</span>
    </button>
    <button onClick={onAboutClick} className={FOOTER_BTN}>
      <InfoIcon />
      <span>About</span>
    </button>
  </div>
));

SidebarFooter.displayName = 'SidebarFooter';
