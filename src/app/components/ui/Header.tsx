import { memo } from 'react';
import { EXTENSION_NAME } from '@shared/constants';
import { Logo } from './Logo';

interface HeaderProps {
  onClear?: () => void;
  showClear?: boolean;
}

export const Header = memo(({ onClear, showClear = false }: HeaderProps) => (
  <header className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-200">
    <Logo size={28} />
    <h1 className="flex-1 text-base font-semibold text-neutral-800">{EXTENSION_NAME}</h1>
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
  </header>
));

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
