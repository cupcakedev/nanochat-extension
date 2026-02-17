import { memo, type ReactNode } from 'react';

interface BadgeChipProps {
  children: ReactNode;
}

export const BadgeChip = memo(({ children }: BadgeChipProps) => (
  <span className="px-1.5 py-0.5 rounded-[6px] text-[10px] leading-none font-medium bg-brand-500/20 text-brand-300">
    {children}
  </span>
));

BadgeChip.displayName = 'BadgeChip';
