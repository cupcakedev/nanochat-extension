import { memo } from 'react';
import type { ChatMessage } from '@shared/types';
import { TypingIndicator } from '@app/components/ui/TypingIndicator';

interface MessageBubbleProps {
	message: ChatMessage;
	streaming?: boolean;
}

export const MessageBubble = memo(({ message, streaming = false }: MessageBubbleProps) => {
	const isUser = message.role === 'user';
	const isEmpty = !message.content;

	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
					isUser ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-900'
				}`}
			>
				{isEmpty && streaming ? (
					<TypingIndicator />
				) : (
					<span className="whitespace-pre-wrap break-words">{message.content}</span>
				)}
			</div>
		</div>
	);
});

MessageBubble.displayName = 'MessageBubble';
