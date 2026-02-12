import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';

interface LoadingBarProps {
	progress: LoadingProgress;
}

export const LoadingBar = memo(({ progress }: LoadingBarProps) => (
	<div className="px-4 py-2">
		<div className="flex items-center justify-between mb-1">
			<span className="text-xs text-neutral-500">{progress.text}</span>
			<span className="text-xs font-medium text-neutral-700">
				{Math.round(progress.progress * 100)}%
			</span>
		</div>
		<div className="w-full h-1.5 bg-neutral-200 rounded-full overflow-hidden">
			<div
				className="h-full bg-brand-500 rounded-full transition-all duration-300"
				style={{ width: `${progress.progress * 100}%` }}
			/>
		</div>
	</div>
));

LoadingBar.displayName = 'LoadingBar';
