import { memo, useCallback, useState, type KeyboardEvent } from 'react';
import { SendIcon } from '@app/components/icons/SendIcon';
import { StopIcon } from '@app/components/icons/StopIcon';
import { ModeTab } from './ModeTab';
import { ActionButton } from './ActionButton';

type Mode = 'chat' | 'agent';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
  mode: Mode;
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
    onModeChange,
  }: ChatInputProps) => {
    const [value, setValue] = useState('');

    const handleSend = useCallback(() => {
      const trimmed = value.trim();
      if (!trimmed) return;
      onSend(trimmed);
      setValue('');
    }, [value, onSend]);

    const handleKeyDown = useCallback(
      (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key !== 'Enter' || e.shiftKey) return;
        e.preventDefault();
        handleSend();
      },
      [handleSend],
    );

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
          <div className="flex items-end gap-2 px-3 py-3">
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled || streaming}
              placeholder={placeholder}
              rows={1}
              className="flex-1 resize-none rounded-xl border-none bg-transparent px-3 py-2 text-base
                text-neutral-200 placeholder-neutral-500 outline-none focus:ring-0
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
                disabled={disabled || !value.trim()}
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
