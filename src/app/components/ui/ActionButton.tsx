import { memo, type ReactNode } from 'react';

const variantStyles = {
  stop: 'bg-neutral-300/50 text-neutral-600 hover:bg-neutral-300 hover:text-neutral-800',
  send: 'bg-transparent text-neutral-500 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed',
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
    className={`group flex items-center justify-center w-12 h-12 rounded-[12px] transition-all duration-200 [&_svg]:w-5 [&_svg]:h-5 ${variantStyles[variant]}`}
  >
    {children}
  </button>
));

ActionButton.displayName = 'ActionButton';
