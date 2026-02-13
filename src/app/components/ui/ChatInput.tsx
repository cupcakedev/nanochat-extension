import { memo, useCallback, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { SendIcon } from '@app/components/icons/SendIcon';
import { StopIcon } from '@app/components/icons/StopIcon';
import { ImageIcon } from '@app/components/icons/ImageIcon';
import { useImageAttachments } from '@app/hooks/useImageAttachments';
import { useTextareaAutoResize } from '@app/hooks/useTextareaAutoResize';
import { ModeSwitcher } from './ModeSwitcher';
import { ActionButton } from './ActionButton';
import { ImagePreviewList } from './ImagePreviewList';

type Mode = 'chat' | 'agent';

interface ChatInputProps {
  onSend: (message: string, images?: string[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  mode: Mode;
  modeLocked?: boolean;
  onModeChange: (mode: Mode) => void;
}

export const ChatInput = memo(
  ({
    onSend,
    onStop,
    disabled = false,
    streaming = false,
    placeholder = 'Type a message...',
    mode,
    modeLocked = false,
    onModeChange,
  }: ChatInputProps) => {
    const [value, setValue] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { images, imagesRef, addImages, removeImage, clearImages } = useImageAttachments();

    const valueRef = useRef(value);
    valueRef.current = value;

    useTextareaAutoResize(value, textareaRef);

    const handleSend = useCallback(() => {
      const trimmed = valueRef.current.trim();
      const imgs = imagesRef.current;
      if (!trimmed && !imgs.length) return;
      onSend(trimmed, imgs.length ? imgs : undefined);
      setValue('');
      clearImages();
    }, [onSend, imagesRef, clearImages]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        handleSend();
      },
      [handleSend],
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

    const canSend = value.trim() || images.length;

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
              disabled={disabled || streaming}
              placeholder={placeholder}
              rows={1}
              className="w-full resize-none border-none bg-transparent px-0 py-0 text-base leading-snug
                text-neutral-800 placeholder-neutral-500 outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                h-auto"
            />
          </div>
          <div className="px-3 pt-1.5 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || streaming}
                  className="flex items-center justify-center w-12 h-12 rounded-[12px] [&_svg]:w-5 [&_svg]:h-5
                    text-neutral-400 hover:text-neutral-700 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach image"
                >
                  <ImageIcon />
                </button>
                <ModeSwitcher mode={mode} modeLocked={modeLocked} onModeChange={onModeChange} />
              </div>
              {streaming ? (
                <ActionButton onClick={onStop} variant="stop">
                  <StopIcon />
                </ActionButton>
              ) : (
                <ActionButton onClick={handleSend} disabled={disabled || !canSend} variant="send">
                  <SendIcon />
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';
