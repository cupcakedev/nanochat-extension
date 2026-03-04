import type { ChatMessage, PageSource } from '@shared/types';

export interface ContextUsageSnapshot {
  used: number;
  total: number;
}

export type OnMessagesChange = (
  messages: ChatMessage[],
  contextUsage?: ContextUsageSnapshot,
  pageSource?: PageSource | null,
) => void;

export interface PerChatPageContext {
  systemPrompt: string;
  pageSource: PageSource;
}
