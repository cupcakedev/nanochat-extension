import { memo } from 'react';

interface ErrorBannerProps {
  message: string;
  onRetry: () => void;
}

export const ErrorBanner = memo(({ message, onRetry }: ErrorBannerProps) => (
  <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-[12px] bg-red-500/10 border border-red-500/15 backdrop-blur-md">
    <span className="flex-1 text-xs text-red-400 truncate">{message}</span>
    <button
      onClick={onRetry}
      className="shrink-0 text-xs font-medium text-red-400 hover:text-red-300
        px-2.5 py-1 rounded-[8px] border border-red-500/20 hover:bg-red-500/10 transition-all duration-200"
    >
      Retry
    </button>
  </div>
));

ErrorBanner.displayName = 'ErrorBanner';
