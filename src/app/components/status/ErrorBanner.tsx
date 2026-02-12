import { memo } from 'react';

interface ErrorBannerProps {
	message: string;
	onRetry: () => void;
}

export const ErrorBanner = memo(({ message, onRetry }: ErrorBannerProps) => (
	<div className="flex items-center gap-2 px-4 py-2 bg-red-50 border-b border-red-100">
		<span className="flex-1 text-xs text-red-600 truncate">{message}</span>
		<button
			onClick={onRetry}
			className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700
				px-2 py-0.5 rounded border border-red-200 hover:bg-red-100 transition-colors"
		>
			Retry
		</button>
	</div>
));

ErrorBanner.displayName = 'ErrorBanner';
