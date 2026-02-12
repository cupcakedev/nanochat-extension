import {memo} from 'react';
import type {TokenStats as TokenStatsType} from '@shared/types';

interface TokenStatsProps {
	stats: TokenStatsType;
}

export const TokenStats = memo(({stats}: TokenStatsProps) => (
	<div className="flex items-center gap-2 px-4 pb-1">
		<span className="text-[11px] text-gray-400">
			{stats.tokenCount} chunks &middot; {stats.duration.toFixed(1)}s &middot;{' '}
			{stats.tokensPerSecond.toFixed(1)} chunks/s
		</span>
	</div>
));

TokenStats.displayName = 'TokenStats';
