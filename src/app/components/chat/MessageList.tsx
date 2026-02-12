import {memo, useEffect, useRef} from 'react';
import type {ChatMessage} from '@shared/types';
import {MessageBubble} from './MessageBubble';

interface MessageListProps {
	messages: ChatMessage[];
	streaming: boolean;
}

export const MessageList = memo(({messages, streaming}: MessageListProps) => {
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({behavior: 'smooth'});
	}, [messages]);

	return (
		<div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
			{messages.map((message, index) => (
				<MessageBubble
					key={message.id}
					message={message}
					streaming={streaming && index === messages.length - 1 && message.role === 'assistant'}
				/>
			))}
			<div ref={bottomRef} />
		</div>
	);
});

MessageList.displayName = 'MessageList';
