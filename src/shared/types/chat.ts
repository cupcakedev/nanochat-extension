export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  images?: string[];
  timestamp: number;
}

export interface LoadingProgress {
  progress: number;
  text: string;
}

export type SessionStatus = 'idle' | 'needs-download' | 'loading' | 'ready' | 'error';

export interface TokenStats {
  tokenCount: number;
  duration: number;
  tokensPerSecond: number;
}

export interface PageSource {
  url: string;
  title: string;
  faviconUrl: string;
}

export interface Chat {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  contextUsage?: { used: number; total: number };
  pageSource?: PageSource;
}

export interface ChatSummary {
  id: string;
  title: string;
  updatedAt: number;
  preview: string;
}
