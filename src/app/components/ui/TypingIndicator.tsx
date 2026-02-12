import {memo} from 'react';

export const TypingIndicator = memo(() => (
	<div className="flex items-center gap-1 px-1 py-0.5">
		<span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
		<span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
		<span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
	</div>
));

TypingIndicator.displayName = 'TypingIndicator';
