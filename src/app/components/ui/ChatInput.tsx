import { memo, useCallback, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { useImageAttachments } from '@app/hooks/useImageAttachments';
import { useTextareaAutoResize } from '@app/hooks/useTextareaAutoResize';
import type { ChatContextSendMode, ChatMode, ChatSendOptions } from '@app/types/mode';
import { toSendOptions } from '@app/services/chat-send-options';
import { ImagePreviewList } from './ImagePreviewList';
import { ChatInputFooter } from './ChatInputFooter';

interface ChatInputProps {
  onSend: (message: string, images?: string[], options?: ChatSendOptions) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  mode: ChatMode;
  contextMode: ChatContextSendMode;
  onContextModeChange: (mode: ChatContextSendMode) => void;
  showContextToggle: boolean;
}

export const ChatInput = memo(
  ({
    onSend,
    onStop,
    disabled = false,
    streaming = false,
    placeholder = 'Type a message...',
    mode,
    contextMode,
    onContextModeChange,
    showContextToggle,
  }: ChatInputProps) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { images, addImages, removeImage, clearImages } = useImageAttachments();
    const composerDisabled = disabled || streaming;

    useTextareaAutoResize(value, textareaRef);

    const clearComposer = useCallback(() => {
      setValue('');
      clearImages();
    }, [clearImages]);

    const handleSendIntent = useCallback(() => {
      const text = value.trim();
      if (!text && !images.length) return;
      const imgs = images.length ? [...images] : undefined;
      onSend(text, imgs, toSendOptions(mode, contextMode));
      clearComposer();
    }, [clearComposer, contextMode, images, mode, onSend, value]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        handleSendIntent();
      },
      [handleSendIntent],
    );

    const handlePaste = useCallback(
      (e: ClipboardEvent<HTMLTextAreaElement>) => {
        const files = Array.from(e.clipboardData.files);
        if (files.length) addImages(files);
      },
      [addImages],
    );

    const handleFileChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length) addImages(files);
        e.target.value = '';
      },
      [addImages],
    );

    const canSend = Boolean(value.trim() || images.length);

    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-[24px] bg-neutral-100/80 backdrop-blur-xl border border-white/5 transition-all duration-300">
          {images.length > 0 && (
            <ImagePreviewList images={images} onRemove={removeImage} />
          )}
          <div className="px-5 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={composerDisabled}
              placeholder={placeholder}
              rows={1}
              className="w-full resize-none border-none bg-transparent px-0 py-0 text-base leading-snug
                text-neutral-800 placeholder-neutral-500 outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                h-auto"
            />
          </div>
          <ChatInputFooter
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            composerDisabled={composerDisabled}
            contextMode={contextMode}
            onContextModeChange={onContextModeChange}
            showContextToggle={showContextToggle}
            streaming={streaming}
            onStop={onStop}
            onSendIntent={handleSendIntent}
            canSend={canSend}
          />
        </div>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';
