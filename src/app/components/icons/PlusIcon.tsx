import { memo } from 'react';

export const PlusIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 3v10M3 8h10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
));

PlusIcon.displayName = 'PlusIcon';
