import { memo, useCallback, useState, type KeyboardEvent } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
  placeholder?: string;
}

export const ChatInput = memo(
  ({
    onSend,
    onStop,
    disabled = false,
    streaming = false,
    placeholder = 'Type a message...',
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
      <div
        className="absolute bottom-0 left-0 right-0 z-20 m-4 rounded-2xl
          bg-neutral-100/80 backdrop-blur-xl border border-white/5 transition-all duration-300"
      >
        <div className="flex items-end gap-2 px-3 py-2.5">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || streaming}
            placeholder={placeholder}
            rows={1}
            className="flex-1 resize-none rounded-xl border-none bg-transparent px-3 py-2 text-sm
						text-neutral-800 placeholder-neutral-500 outline-none focus:ring-0
						disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          />
          {streaming ? (
            <button
              onClick={onStop}
              className="group flex items-center justify-center w-10 h-10 rounded-xl
							bg-red-500/10 text-red-500 transition-all duration-200
							hover:bg-red-500 hover:text-white"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={disabled || !value.trim()}
              className="group flex items-center justify-center w-10 h-10 rounded-xl
							bg-brand-500 text-white transition-all duration-200 shadow-lg shadow-brand-500/20
							hover:bg-brand-600 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none"
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
    );
  },
);

ChatInput.displayName = 'ChatInput';

const SendIcon = memo(() => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path
      d="M14 2L7 9M14 2L9.5 14L7 9M14 2L2 6.5L7 9"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
));

SendIcon.displayName = 'SendIcon';

const StopIcon = memo(() => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
    <rect x="2" y="2" width="10" height="10" rx="1.5" fill="currentColor" />
  </svg>
));

StopIcon.displayName = 'StopIcon';
