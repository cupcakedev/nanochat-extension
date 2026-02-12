import { memo } from 'react';
import type { ChatMessage } from '@shared/types';
import { TypingIndicator } from '@app/components/ui/TypingIndicator';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

export const MessageBubble = memo(({ message, streaming = false }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const isEmpty = !message.content;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl bg-brand-500 text-white px-3.5 py-2 text-sm leading-relaxed">
          <span className="whitespace-pre-wrap break-words">{message.content}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="text-neutral-800 text-sm leading-relaxed">
      {isEmpty && streaming ? <TypingIndicator /> : <MarkdownContent content={message.content} />}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
