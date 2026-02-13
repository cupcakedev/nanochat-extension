import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent } from 'react';
import { SendIcon } from '@app/components/icons/SendIcon';
import { StopIcon } from '@app/components/icons/StopIcon';
import { ImageIcon } from '@app/components/icons/ImageIcon';
import { useOutsideClick } from '@app/hooks/useOutsideClick';
import { ModeTab } from './ModeTab';
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

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
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
    const [images, setImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showModeLockedPopover, setShowModeLockedPopover] = useState(false);
    const modeTabsRef = useRef<HTMLDivElement>(null);
    const closeModeLockedPopover = useCallback(() => setShowModeLockedPopover(false), []);
    useOutsideClick(modeTabsRef, closeModeLockedPopover, showModeLockedPopover);

    const valueRef = useRef(value);
    valueRef.current = value;
    const imagesRef = useRef(images);
    imagesRef.current = images;

    const addImages = useCallback(async (files: File[]) => {
      const imageFiles = files.filter((f) => f.type.startsWith('image/'));
      if (!imageFiles.length) return;
      const dataUrls = await Promise.all(imageFiles.map(fileToDataUrl));
      setImages((prev) => [...prev, ...dataUrls]);
    }, []);

    const removeImage = useCallback((index: number) => {
      setImages((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSend = useCallback(() => {
      const trimmed = valueRef.current.trim();
      const imgs = imagesRef.current;
      if (!trimmed && !imgs.length) return;
      onSend(trimmed, imgs.length ? imgs : undefined);
      setValue('');
      setImages([]);
    }, [onSend]);

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
    const handleModeTabClick = useCallback(
      (nextMode: Mode) => {
        if (nextMode === mode) {
          setShowModeLockedPopover(false);
          return;
        }

        if (modeLocked) {
          setShowModeLockedPopover(true);
          return;
        }

        setShowModeLockedPopover(false);
        onModeChange(nextMode);
      },
      [mode, modeLocked, onModeChange],
    );

    useEffect(() => {
      if (!modeLocked) setShowModeLockedPopover(false);
    }, [modeLocked]);

    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="rounded-[24px] bg-neutral-100/80 backdrop-blur-xl border border-white/5 transition-all duration-300">
          {images.length > 0 && (
            <ImagePreviewList images={images} onRemove={removeImage} />
          )}
          <div className="px-5 pt-4 pb-2">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={disabled || streaming}
              placeholder={placeholder}
              rows={2}
              className="w-full resize-none border-none bg-transparent px-0 py-0 text-base leading-snug
                text-neutral-800 placeholder-neutral-500 outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                min-h-[56px] max-h-[160px]"
            />
          </div>
          <div className="px-3 pt-1.5 pb-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-4">
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
                  className="flex items-center justify-center w-10 h-10 rounded-[12px]
                    text-neutral-400 hover:text-neutral-700 transition-colors
                    disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Attach image"
                >
                  <ImageIcon />
                </button>
                <div className="relative" ref={modeTabsRef}>
                  <div className="flex items-center gap-1 p-0.5 rounded-[12px] bg-neutral-200/20 backdrop-blur-md">
                    <ModeTab active={mode === 'chat'} onClick={() => handleModeTabClick('chat')}>
                      Chat
                    </ModeTab>
                    <ModeTab active={mode === 'agent'} onClick={() => handleModeTabClick('agent')}>
                      Agent
                      <span className="px-1 py-0.5 rounded-[8px] text-[10px] leading-none bg-brand-500/20 text-brand-300">
                        Beta
                      </span>
                    </ModeTab>
                  </div>
                  {showModeLockedPopover && (
                    <div className="absolute bottom-full left-0 mb-2 z-50 w-72 rounded-[12px] border border-amber-300/25 bg-neutral-100/95 px-3 py-2 text-xs text-neutral-800 shadow-lg backdrop-blur-md">
                      Чтобы сменить режим, создайте новый чат.
                    </div>
                  )}
                </div>
              </div>
              {streaming ? (
                <ActionButton onClick={onStop} variant="stop">
                  <StopIcon />
                </ActionButton>
              ) : (
                <ActionButton
                  onClick={handleSend}
                  disabled={disabled || !canSend}
                  variant="send"
                >
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
