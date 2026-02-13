import { memo, type ReactNode } from 'react';

const variantStyles = {
  stop: 'bg-neutral-300/50 text-neutral-600 hover:bg-neutral-300 hover:text-neutral-800',
  send: 'bg-brand-500 text-white shadow-lg shadow-brand-500/20 hover:bg-brand-600 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none',
} as const;

interface ActionButtonProps {
  onClick?: () => void;
  disabled?: boolean;
  variant: keyof typeof variantStyles;
  children: ReactNode;
}

export const ActionButton = memo(({ onClick, disabled, variant, children }: ActionButtonProps) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`group flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 mb-1 ${variantStyles[variant]}`}
  >
    {children}
  </button>
));

ActionButton.displayName = 'ActionButton';
