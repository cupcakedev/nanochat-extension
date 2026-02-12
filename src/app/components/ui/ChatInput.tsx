import {memo, useCallback, useState, type KeyboardEvent} from 'react';

interface ChatInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	placeholder?: string;
}

export const ChatInput = memo(({onSend, disabled = false, placeholder = 'Type a message...'}: ChatInputProps) => {
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
		<div className="flex items-end gap-2 px-4 py-3 border-t border-gray-100">
			<textarea
				value={value}
				onChange={(e) => setValue(e.target.value)}
				onKeyDown={handleKeyDown}
				disabled={disabled}
				placeholder={placeholder}
				rows={1}
				className="flex-1 resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm
					text-gray-900 placeholder-gray-400 outline-none
					focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
					disabled:opacity-50 disabled:cursor-not-allowed"
			/>
			<button
				onClick={handleSend}
				disabled={disabled || !value.trim()}
				className="flex items-center justify-center w-9 h-9 rounded-lg
					bg-indigo-500 text-white transition-colors
					hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed"
			>
				<SendIcon />
			</button>
		</div>
	);
});

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
