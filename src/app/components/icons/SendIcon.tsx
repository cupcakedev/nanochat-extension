import { memo } from 'react';

export const SendIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

SendIcon.displayName = 'SendIcon';
