import { memo } from 'react';

export const ExpandIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M9.33325 2.66669H13.3333M13.3333 2.66669V6.66669M13.3333 2.66669L9.33325 6.66669"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M6.66675 13.3334H2.66675M2.66675 13.3334V9.33337M2.66675 13.3334L6.66675 9.33337"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

ExpandIcon.displayName = 'ExpandIcon';
