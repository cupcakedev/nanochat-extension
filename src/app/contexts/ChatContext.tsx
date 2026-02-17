import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Chat, ChatMessage, ChatSummary, PageSource } from '@shared/types';
import {
  loadAllChats,
  saveChat,
  deleteChat as deleteChatFromStorage,
  createNewChat,
} from '@shared/services/chat-storage';
import { useStorageSync } from '@app/hooks/useStorageSync';
import {
  buildSummaries,
  buildUpdatedChat,
  ensureActiveChat,
  shouldPersistChat,
  type ChatContextValue,
} from './chat-context-utils';

export type { ChatContextValue };

export const ChatContext = createContext<ChatContextValue | null>(null);

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
      chatsRef.current = new Map(storedChats.map((chat) => [chat.id, chat]));
      const fresh = createNewChat();
      chatsRef.current.set(fresh.id, fresh);
      setChatSummaries(buildSummaries(chatsRef.current));
      setActiveChatId(fresh.id);
      setActiveChat(fresh);
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
    (
      messages: ChatMessage[],
      contextUsage?: { used: number; total: number },
      pageSource?: PageSource | null,
    ) => {
      if (!activeChatId) return;
      const existing = chatsRef.current.get(activeChatId);
      if (!existing) return;

      const updated = buildUpdatedChat(existing, messages, contextUsage, pageSource);
      chatsRef.current.set(activeChatId, updated);
      setActiveChat(updated);
      skipCountRef.current++;
      if (shouldPersistChat(updated)) {
        saveChat(updated);
      } else {
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
