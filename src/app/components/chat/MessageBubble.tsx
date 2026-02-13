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
        <div className="max-w-[85%] rounded-[20px] bg-brand-500 text-white px-4 py-2.5 text-sm leading-relaxed">
          {message.images?.length ? (
            <div className="flex gap-1.5 mb-2 flex-wrap">
              {message.images.map((src, i) => (
                <img
                  key={`${i}-${src.slice(0, 40)}`}
                  src={src}
                  alt={`Attachment ${i + 1}`}
                  className="max-w-[200px] max-h-[200px] rounded-[12px] object-cover"
                />
              ))}
            </div>
          ) : null}
          {message.content && (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-neutral-700 text-sm leading-relaxed">
      {isEmpty && streaming ? <TypingIndicator /> : <MarkdownContent content={message.content} />}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
