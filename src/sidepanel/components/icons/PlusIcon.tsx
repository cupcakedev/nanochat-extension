import { memo } from 'react';

interface PlusIconProps {
  size?: number;
}

export const PlusIcon = memo(({ size = 14 }: PlusIconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M12 8H8M8 8H4M8 8V4M8 8V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

PlusIcon.displayName = 'PlusIcon';
