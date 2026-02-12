import { memo, type ReactNode } from 'react';

interface ModeTabProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

export const ModeTab = memo(({ active, onClick, children }: ModeTabProps) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none ${
      active
        ? 'bg-white/10 text-white shadow-sm border border-white/5'
        : 'text-neutral-400 hover:text-white'
    }`}
  >
    {children}
  </button>
));

ModeTab.displayName = 'ModeTab';
