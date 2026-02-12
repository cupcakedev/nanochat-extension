import { useCallback, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { PromptAPIService } from '@app/services/prompt-api';
import type { ChatMessage, TokenStats } from '@shared/types';

export function useChat(serviceRef: RefObject<PromptAPIService>) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [streaming, setStreaming] = useState(false);
	const [tokenStats, setTokenStats] = useState<TokenStats | null>(null);
	const abortRef = useRef<AbortController | null>(null);

	const send = useCallback(
		async (text: string) => {
			const userMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'user',
				content: text,
				timestamp: Date.now(),
			};

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: '',
				timestamp: Date.now(),
			};

			setMessages((prev) => [...prev, userMessage, assistantMessage]);
			setStreaming(true);
			setTokenStats(null);

			const abortController = new AbortController();
			abortRef.current = abortController;

			const startTime = performance.now();
			let tokenCount = 0;

			try {
				const allMessages = [...messages, userMessage];
				await serviceRef.current.streamChat(
					allMessages,
					(token) => {
						tokenCount++;
						setMessages((prev) => {
							const updated = [...prev];
							const last = updated[updated.length - 1];
							updated[updated.length - 1] = { ...last, content: token };
							return updated;
						});
					},
					abortController.signal,
				);
			} catch (err) {
				if (abortController.signal.aborted) return;
				const errorText =
					err instanceof Error ? err.message : 'An error occurred during generation';
				setMessages((prev) => {
					const updated = [...prev];
					const last = updated[updated.length - 1];
					updated[updated.length - 1] = { ...last, content: `Error: ${errorText}` };
					return updated;
				});
			} finally {
				setStreaming(false);
				abortRef.current = null;

				if (tokenCount > 0) {
					const duration = (performance.now() - startTime) / 1000;
					setTokenStats({
						tokenCount,
						duration,
						tokensPerSecond: tokenCount / duration,
					});
				}
			}
		},
		[messages, serviceRef],
	);

	const stop = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const clear = useCallback(() => {
		abortRef.current?.abort();
		setMessages([]);
		setStreaming(false);
		setTokenStats(null);
	}, []);

	return { messages, streaming, tokenStats, send, stop, clear };
}
