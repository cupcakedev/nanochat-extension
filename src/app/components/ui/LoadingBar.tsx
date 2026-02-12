import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';

interface LoadingBarProps {
	progress: LoadingProgress;
}

export const LoadingBar = memo(({ progress }: LoadingBarProps) => (
	<div className="px-4 py-2">
		<div className="flex items-center justify-between mb-1">
			<span className="text-xs text-gray-500">{progress.text}</span>
			<span className="text-xs font-medium text-gray-700">
				{Math.round(progress.progress * 100)}%
			</span>
		</div>
		<div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
			<div
				className="h-full bg-indigo-500 rounded-full transition-all duration-300"
				style={{ width: `${progress.progress * 100}%` }}
			/>
		</div>
	</div>
));

LoadingBar.displayName = 'LoadingBar';
