import { createLogger } from '@shared/utils';
import type { ChatMessage, LoadingProgress } from '@shared/types';

const logger = createLogger('prompt-api');

const LANGUAGE_OPTIONS = {
	expectedInputs: [{ type: 'text' as const, languages: ['en'] }],
	expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

export class PromptAPIService {
	private session: LanguageModel | null = null;

	async checkAvailability(): Promise<string> {
		const availability = await LanguageModel.availability(LANGUAGE_OPTIONS);
		logger.info('Model availability:', availability);
		return availability;
	}

	async createSession(onProgress?: (progress: LoadingProgress) => void): Promise<void> {
		this.destroySession();

		logger.info('Creating LanguageModel session...');
		this.session = await LanguageModel.create({
			...LANGUAGE_OPTIONS,
			monitor: (monitor) => {
				monitor.addEventListener('downloadprogress', (e) => {
					const progress = e.loaded / e.total;
					onProgress?.({
						progress,
						text: `Downloading model: ${Math.round(progress * 100)}%`,
					});
				});
			},
		});
		logger.info('Session created successfully');
	}

	async streamChat(
		messages: ChatMessage[],
		onToken: (token: string) => void,
		signal: AbortSignal,
	): Promise<void> {
		if (!this.session) {
			throw new Error('Session not initialized');
		}

		const prompt = messages.map((m) => ({
			role: m.role as 'user' | 'assistant',
			content: [{ type: 'text' as const, value: m.content }],
		}));

		const stream = this.session.promptStreaming(prompt, { signal });

		const reader = stream.getReader();
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done || signal.aborted) break;
				if (value) onToken(value);
			}
		} finally {
			reader.releaseLock();
		}
	}

	destroySession(): void {
		if (this.session) {
			this.session.destroy();
			this.session = null;
			logger.info('Session destroyed');
		}
	}
}
