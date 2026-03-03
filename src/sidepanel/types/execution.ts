import type { RefObject } from 'react';
import type { PromptAPIService } from '@sidepanel/services/prompt/api';
import type { DevTraceItem } from '@sidepanel/types/dev-trace';
import type { ContextUsage } from '@sidepanel/types/chat';
import type { ChatMessage, PageSource, TokenStats } from '@shared/types';

export interface InteractiveRefs {
  messagesRef: RefObject<ChatMessage[]>;
  pageSourceRef: RefObject<PageSource | null | undefined>;
}

export interface InteractiveSetters {
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setStreaming: (v: boolean) => void;
  setDevTraceItems: (updater: DevTraceItem[] | ((prev: DevTraceItem[]) => DevTraceItem[])) => void;
  setContextUsage: (v: ContextUsage | null) => void;
  setChatContextChipSourceOverride: (v: PageSource | null | undefined) => void;
  onMessagesChange?: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource | null,
  ) => void;
  onMultimodalInputUnsupported?: (message: string) => void;
}

export interface ChatStreamRefs {
  serviceRef: RefObject<PromptAPIService>;
  messagesRef: RefObject<ChatMessage[]>;
  pageSourceRef: RefObject<PageSource | null | undefined>;
  abortRef: RefObject<AbortController | null>;
}

export interface ChatStreamSetters {
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setStreaming: (v: boolean) => void;
  setTokenStats: (v: TokenStats | null) => void;
  setContextUsage: (v: ContextUsage | null) => void;
  onMessagesChange?: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource | null,
  ) => void;
  onMultimodalInputUnsupported?: (message: string) => void;
}
