import { memo, type ReactNode } from 'react';

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}

export const ActionButton = memo(({ onClick, disabled, children }: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`group flex items-center justify-center w-12 h-12 rounded-[12px] transition-all duration-200 [&_svg]:w-5 [&_svg]:h-5 bg-transparent text-neutral-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed`}
  >
    {children}
  </button>
));

ActionButton.displayName = 'ActionButton';
