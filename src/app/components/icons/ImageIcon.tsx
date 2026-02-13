import { memo } from 'react';

export const ImageIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect
      x="2"
      y="3"
      width="12"
      height="10"
      rx="2"
      stroke="currentColor"
      strokeWidth="1.5"
    />
    <circle cx="5.5" cy="6.5" r="1" fill="currentColor" />
    <path
      d="M2 11l3.5-3.5a1 1 0 011.4 0L10 10.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9 9.5l1.5-1.5a1 1 0 011.4 0L14 10"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

ImageIcon.displayName = 'ImageIcon';
