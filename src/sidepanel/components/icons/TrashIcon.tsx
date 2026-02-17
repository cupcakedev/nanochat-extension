import { memo } from 'react';

interface TrashIconProps {
  size?: number;
}

export const TrashIcon = memo(({ size = 12 }: TrashIconProps) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
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
