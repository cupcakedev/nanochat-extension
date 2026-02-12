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
      <div className="flex items-end gap-2 px-4 py-3 border-t border-neutral-200">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || streaming}
          placeholder={placeholder}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm
					text-neutral-800 placeholder-neutral-400 outline-none
					focus:border-brand-500 focus:ring-1 focus:ring-brand-500
					disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="flex items-center justify-center w-9 h-9 rounded-lg
						bg-red-500 text-white transition-colors
						hover:bg-red-600"
          >
            <StopIcon />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={disabled || !value.trim()}
            className="flex items-center justify-center w-9 h-9 rounded-lg
						bg-brand-500 text-white transition-colors
						hover:bg-brand-600 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <SendIcon />
          </button>
        )}
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
