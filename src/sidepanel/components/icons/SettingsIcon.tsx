import { memo } from 'react';

export const SettingsIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M2.5 4.5H13.5M2.5 8H13.5M2.5 11.5H13.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <circle cx="10" cy="4.5" r="1.5" fill="currentColor" />
    <circle cx="6" cy="8" r="1.5" fill="currentColor" />
    <circle cx="10" cy="11.5" r="1.5" fill="currentColor" />
  </svg>
));

SettingsIcon.displayName = 'SettingsIcon';
