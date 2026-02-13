import { memo, useEffect, useRef } from 'react';
import type { ChatMessage, PageSource } from '@shared/types';
import { MessageBubble } from './MessageBubble';
import { SourceBadge } from './SourceBadge';

interface MessageListProps {
  messages: ChatMessage[];
  streaming: boolean;
  pageSource?: PageSource;
}

function isActiveStreamingMessage(
  message: ChatMessage,
  index: number,
  totalMessages: number,
  streaming: boolean,
): boolean {
  return streaming && index === totalMessages - 1 && message.role === 'assistant';
}

function findLastAssistantIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') return i;
  }
  return -1;
}

export const MessageList = memo(({ messages, streaming, pageSource }: MessageListProps) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastAssistantIndex = pageSource ? findLastAssistantIndex(messages) : -1;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-8">
      {messages.map((message, index) => (
        <div key={message.id}>
          <MessageBubble
            message={message}
            streaming={isActiveStreamingMessage(message, index, messages.length, streaming)}
          />
          {index === lastAssistantIndex && !streaming && <SourceBadge pageSource={pageSource!} />}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
});

MessageList.displayName = 'MessageList';
