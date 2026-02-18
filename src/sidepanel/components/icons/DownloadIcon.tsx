import { memo } from 'react';

interface DownloadIconProps {
  size?: number;
  className?: string;
}

export const DownloadIcon = memo(
  ({ size = 28, className = 'text-brand-400' }: DownloadIconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 2L12 16M12 16L7 11M12 16L17 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
);

DownloadIcon.displayName = 'DownloadIcon';
