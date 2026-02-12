export interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
}

export interface LoadingProgress {
	progress: number;
	text: string;
}

export type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface TokenStats {
	tokenCount: number;
	duration: number;
	tokensPerSecond: number;
}
