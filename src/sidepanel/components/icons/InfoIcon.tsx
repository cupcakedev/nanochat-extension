import { memo } from 'react';

export const InfoIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <g clipPath="url(#info-clip)">
      <path
        d="M7.99992 14.6666C11.6818 14.6666 14.6666 11.6819 14.6666 7.99998C14.6666 4.31808 11.6818 1.33331 7.99992 1.33331C4.31802 1.33331 1.33325 4.31808 1.33325 7.99998C1.33325 11.6819 4.31802 14.6666 7.99992 14.6666Z"
        stroke="currentColor"
      />
      <path d="M8 11.3333V7.33331" stroke="currentColor" strokeLinecap="round" />
      <path
        d="M7.99992 4.66667C8.36811 4.66667 8.66659 4.96514 8.66659 5.33333C8.66659 5.70152 8.36811 6 7.99992 6C7.63173 6 7.33325 5.70152 7.33325 5.33333C7.33325 4.96514 7.63173 4.66667 7.99992 4.66667Z"
        fill="currentColor"
      />
    </g>
    <defs>
      <clipPath id="info-clip">
        <rect width="16" height="16" fill="white" />
      </clipPath>
    </defs>
  </svg>
));

InfoIcon.displayName = 'InfoIcon';
