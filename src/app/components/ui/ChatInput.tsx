import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ClipboardEvent,
} from 'react';
import { SendIcon } from '@app/components/icons/SendIcon';
import { StopIcon } from '@app/components/icons/StopIcon';
import { PlusIcon } from '@app/components/icons/PlusIcon';
import { ImageIcon } from '@app/components/icons/ImageIcon';
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
    onModeChange,
  }: ChatInputProps) => {
    const [value, setValue] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showAttachMenu, setShowAttachMenu] = useState(false);
    const attachMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!showAttachMenu) return;
      const handleClickOutside = (e: MouseEvent) => {
        if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
          setShowAttachMenu(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showAttachMenu]);

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
      const trimmed = value.trim();
      if (!trimmed && !images.length) return;
      onSend(trimmed, images.length ? images : undefined);
      setValue('');
      setImages([]);
    }, [value, images, onSend]);

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
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-100/50 backdrop-blur-md border border-white/5">
            <ModeTab active={mode === 'chat'} onClick={() => onModeChange('chat')}>
              Chat
            </ModeTab>
            <ModeTab active={mode === 'agent'} onClick={() => onModeChange('agent')}>
              Agent
              <span className="px-1 py-0.5 rounded text-[10px] leading-none bg-brand-500/20 text-brand-300 border border-brand-500/20">
                Beta
              </span>
            </ModeTab>
          </div>
        </div>
        <div className="rounded-2xl bg-neutral-100/80 backdrop-blur-xl border border-white/5 transition-all duration-300">
          {images.length > 0 && (
            <ImagePreviewList images={images} onRemove={removeImage} />
          )}
          <div className="flex items-end gap-2 px-3 py-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="relative" ref={attachMenuRef}>
              <button
                onClick={() => setShowAttachMenu((v) => !v)}
                disabled={disabled || streaming}
                className="flex items-center justify-center w-10 h-10 rounded-xl
                  text-neutral-400 hover:text-neutral-700 transition-colors
                  disabled:opacity-50 disabled:cursor-not-allowed mb-1"
              >
                <PlusIcon />
              </button>
              {showAttachMenu && (
                <div className="absolute bottom-full left-0 mb-2 min-w-[160px] p-1.5 rounded-xl bg-neutral-100 border border-white/10 shadow-lg backdrop-blur-xl z-50">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowAttachMenu(false);
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-200/20 rounded-lg transition-colors"
                  >
                    <ImageIcon />
                    Image
                  </button>
                </div>
              )}
            </div>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              disabled={disabled || streaming}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none rounded-xl border-none bg-transparent px-3 py-2 text-base
                text-neutral-800 placeholder-neutral-500 outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200
                min-h-[44px] max-h-[200px]"
            />
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
    );
  },
);

ChatInput.displayName = 'ChatInput';
