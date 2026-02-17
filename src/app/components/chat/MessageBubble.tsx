import { memo } from 'react';
import { MessageRole } from '@shared/types';
import type { ChatMessage } from '@shared/types';
import { TypingIndicator } from '@app/components/ui/TypingIndicator';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: ChatMessage;
  streaming?: boolean;
}

const renderImageList = (images: string[], imageClassName: string) => (
  <div className="flex gap-1.5 mb-2 flex-wrap">
    {images.map((src, index) => (
      <img
        key={`${index}-${src.slice(0, 40)}`}
        src={src}
        alt={`Attachment ${index + 1}`}
        className={imageClassName}
      />
    ))}
  </div>
);

export const MessageBubble = memo(({ message, streaming = false }: MessageBubbleProps) => {
  const isUser = message.role === MessageRole.User;
  const isEmpty = !message.content;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-[20px] bg-brand-500 text-white px-4 py-2.5 text-sm leading-relaxed">
          {message.images?.length
            ? renderImageList(
                message.images,
                'max-w-[200px] max-h-[200px] rounded-[12px] object-cover',
              )
            : null}
          {message.content && (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-neutral-700 text-sm leading-relaxed">
      {message.images?.length
        ? renderImageList(
            message.images,
            'w-full max-w-[720px] rounded-[14px] border border-neutral-200',
          )
        : null}
      {isEmpty && streaming ? <TypingIndicator /> : <MarkdownContent content={message.content} />}
    </div>
  );
});

MessageBubble.displayName = 'MessageBubble';
