import { memo } from 'react';

interface PlusIconProps {
  size?: number;
}

export const PlusIcon = memo(({ size = 14 }: PlusIconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
));

PlusIcon.displayName = 'PlusIcon';
