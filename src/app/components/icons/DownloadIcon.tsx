import { memo } from 'react';

export const DownloadIcon = memo(() => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
            d="M12 2L12 16M12 16L7 11M12 16L17 11"
            stroke="#8AB4F8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M4 17V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V17"
            stroke="#8AB4F8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
));

DownloadIcon.displayName = 'DownloadIcon';
