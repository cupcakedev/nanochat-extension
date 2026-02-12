import { memo } from 'react';

interface ErrorBannerProps {
	message: string;
	onRetry: () => void;
}

export const ErrorBanner = memo(({ message, onRetry }: ErrorBannerProps) => (
	<div className="flex items-center gap-2 px-4 py-2 bg-red-950/30 border-b border-red-900/40">
		<span className="flex-1 text-xs text-red-400 truncate">{message}</span>
		<button
			onClick={onRetry}
			className="shrink-0 text-xs font-medium text-red-400 hover:text-red-300
				px-2 py-0.5 rounded border border-red-800 hover:bg-red-900/40 transition-colors"
		>
			Retry
		</button>
	</div>
));

ErrorBanner.displayName = 'ErrorBanner';
