import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Chat, ChatMessage, ChatSummary, PageSource } from '@shared/types';
import {
  loadAllChats,
  saveChat,
  deleteChat as deleteChatFromStorage,
  createNewChat,
  deriveChatTitle,
  chatToSummary,
} from '@shared/services/chat-storage';
import { useStorageSync } from '@app/hooks/useStorageSync';

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

export const ChatContext = createContext<ChatContextValue | null>(null);

function sortedByRecent(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
}

function buildSummaries(chats: Map<string, Chat>): ChatSummary[] {
  return sortedByRecent([...chats.values()])
    .filter((c) => c.messages.length > 0)
    .map(chatToSummary);
}

function ensureActiveChat(chats: Chat[]): Chat {
  return sortedByRecent(chats)[0] ?? createNewChat();
}

function shouldPersistChat(chat: Chat): boolean {
  return chat.messages.length > 0;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [loaded, setLoaded] = useState(false);
  const chatsRef = useRef<Map<string, Chat>>(new Map());
  const skipCountRef = useRef(0);

  const rebuildSummaries = useCallback(() => {
    setChatSummaries(buildSummaries(chatsRef.current));
  }, []);

  useEffect(() => {
    loadAllChats().then((storedChats) => {
      const active = ensureActiveChat(storedChats);
      const initialChats = storedChats.length > 0 ? storedChats : [active];
      chatsRef.current = new Map(initialChats.map((chat) => [chat.id, chat]));
      setChatSummaries(buildSummaries(chatsRef.current));
      setActiveChatId(active.id);
      setActiveChat(active);
      setLoaded(true);
    });
  }, []);

  useStorageSync(chatsRef, skipCountRef, rebuildSummaries, setActiveChatId, setActiveChat);

  const createChat = useCallback(() => {
    const chat = createNewChat();
    chatsRef.current.set(chat.id, chat);
    rebuildSummaries();
    setActiveChatId(chat.id);
    setActiveChat(chat);
  }, [rebuildSummaries]);

  const selectChat = useCallback((id: string) => {
    const chat = chatsRef.current.get(id);
    if (!chat) return;
    setActiveChatId(id);
    setActiveChat(chat);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      const removed = chatsRef.current.get(id);
      if (!removed) return;
      chatsRef.current.delete(id);
      if (shouldPersistChat(removed)) {
        skipCountRef.current++;
        deleteChatFromStorage(id);
      }

      if (chatsRef.current.size === 0) {
        const chat = createNewChat();
        chatsRef.current.set(chat.id, chat);
      }

      rebuildSummaries();

      const currentActive = activeChatId ? chatsRef.current.get(activeChatId) : null;
      if (!currentActive || activeChatId === id) {
        const next = ensureActiveChat([...chatsRef.current.values()]);
        setActiveChatId(next.id);
        setActiveChat(next);
      }
    },
    [activeChatId, rebuildSummaries],
  );

  const updateActiveChat = useCallback(
    (messages: ChatMessage[], contextUsage?: { used: number; total: number }, pageSource?: PageSource | null) => {
      if (!activeChatId) return;
      const existing = chatsRef.current.get(activeChatId);
      if (!existing) return;

      const updated: Chat = {
        ...existing,
        messages,
        title: deriveChatTitle(messages),
        updatedAt: Date.now(),
        ...(contextUsage ? { contextUsage } : {}),
      };
      if (pageSource === null) {
        delete updated.pageSource;
      } else if (pageSource) {
        updated.pageSource = pageSource;
      }

      chatsRef.current.set(activeChatId, updated);
      setActiveChat(updated);
      if (shouldPersistChat(updated)) {
        skipCountRef.current++;
        saveChat(updated);
      } else {
        skipCountRef.current++;
        deleteChatFromStorage(updated.id);
      }
      rebuildSummaries();
    },
    [activeChatId, rebuildSummaries],
  );

  return (
    <ChatContext.Provider
      value={{
        chatSummaries,
        activeChatId,
        activeChat,
        loaded,
        createChat,
        selectChat,
        deleteChat,
        updateActiveChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
