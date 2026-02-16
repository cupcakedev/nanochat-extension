export enum MessageRole {
  User = 'user',
  Assistant = 'assistant',
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  images?: string[];
  timestamp: number;
}

export interface LoadingProgress {
  progress: number;
  text: string;
}

export enum SessionStatus {
  Idle = 'idle',
  NeedsDownload = 'needs-download',
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

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
