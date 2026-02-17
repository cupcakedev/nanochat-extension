import type { Chat, ChatMessage, ChatSummary, PageSource } from '@shared/types';
import { createNewChat, deriveChatTitle, chatToSummary } from '@shared/services/chat-storage';

export interface ChatContextValue {
  chatSummaries: ChatSummary[];
  activeChatId: string | null;
  activeChat: Chat | null;
  loaded: boolean;
  createChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  updateActiveChat: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource | null,
  ) => void;
}

function sortedByRecent(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function buildSummaries(chats: Map<string, Chat>): ChatSummary[] {
  return sortedByRecent([...chats.values()])
    .filter((c) => c.messages.length > 0)
    .map(chatToSummary);
}

export function ensureActiveChat(chats: Chat[]): Chat {
  return sortedByRecent(chats)[0] ?? createNewChat();
}

export function shouldPersistChat(chat: Chat): boolean {
  return chat.messages.length > 0;
}

function applyPageSource(chat: Chat, pageSource?: PageSource | null): Chat {
  if (pageSource === null) {
    const { pageSource: _, ...rest } = chat;
    return rest;
  }
  if (pageSource) return { ...chat, pageSource };
  return chat;
}

export function buildUpdatedChat(
  existing: Chat,
  messages: ChatMessage[],
  contextUsage?: { used: number; total: number },
  pageSource?: PageSource | null,
): Chat {
  const base: Chat = {
    ...existing,
    messages,
    title: deriveChatTitle(messages),
    updatedAt: Date.now(),
    ...(contextUsage ? { contextUsage } : {}),
  };
  return applyPageSource(base, pageSource);
}
