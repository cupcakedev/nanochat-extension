import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Chat, ChatMessage, ChatSummary } from '@shared/types';
import {
  CHATS_STORAGE_KEY,
  loadAllChats,
  saveChat,
  deleteChat as deleteChatFromStorage,
  createNewChat,
  deriveChatTitle,
  chatToSummary,
} from '@shared/services/chat-storage';

export interface ChatContextValue {
  chatSummaries: ChatSummary[];
  activeChatId: string | null;
  activeChat: Chat | null;
  loaded: boolean;
  createChat: () => void;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  updateActiveChat: (messages: ChatMessage[], contextUsage?: { used: number; total: number }) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [loaded, setLoaded] = useState(false);
  const chatsRef = useRef<Map<string, Chat>>(new Map());
  const skipCountRef = useRef(0);

  const rebuildSummaries = useCallback(() => {
    const all = [...chatsRef.current.values()]
      .filter((c) => c.messages.length > 0)
      .sort((a, b) => b.updatedAt - a.updatedAt);
    setChatSummaries(all.map(chatToSummary));
  }, []);

  useEffect(() => {
    loadAllChats().then((chats) => {
      if (chats.length === 0) {
        const chat = createNewChat();
        chats = [chat];
        saveChat(chat);
      }
      const map = new Map(chats.map((c) => [c.id, c]));
      chatsRef.current = map;
      setChatSummaries(chats.filter((c) => c.messages.length > 0).map(chatToSummary));
      setActiveChatId(chats[0].id);
      setActiveChat(chats[0]);
      setLoaded(true);
    });
  }, []);

  // Reactive sync from external storage changes
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (!changes[CHATS_STORAGE_KEY]) return;
      if (skipCountRef.current > 0) {
        skipCountRef.current--;
        return;
      }

      const newMap = (changes[CHATS_STORAGE_KEY].newValue ?? {}) as Record<string, Chat>;
      chatsRef.current = new Map(Object.entries(newMap));

      rebuildSummaries();

      // Refresh active chat if it still exists
      setActiveChatId((prevId) => {
        if (prevId && newMap[prevId]) {
          setActiveChat(newMap[prevId]);
          return prevId;
        }
        // Active chat was deleted externally — pick first
        const sorted = Object.values(newMap).sort((a, b) => b.updatedAt - a.updatedAt);
        if (sorted.length > 0) {
          setActiveChat(sorted[0]);
          return sorted[0].id;
        }
        return null;
      });
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [rebuildSummaries]);

  const createChat = useCallback(() => {
    const chat = createNewChat();
    chatsRef.current.set(chat.id, chat);
    skipCountRef.current++;
    saveChat(chat);
    setActiveChatId(chat.id);
    setActiveChat(chat);
  }, []);

  const selectChat = useCallback((id: string) => {
    const chat = chatsRef.current.get(id);
    if (!chat) return;
    setActiveChatId(id);
    setActiveChat(chat);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      chatsRef.current.delete(id);
      skipCountRef.current++;
      deleteChatFromStorage(id);

      const remaining = [...chatsRef.current.values()].sort((a, b) => b.updatedAt - a.updatedAt);

      if (remaining.length === 0) {
        const chat = createNewChat();
        chatsRef.current.set(chat.id, chat);
        skipCountRef.current++;
        saveChat(chat);
        remaining.push(chat);
      }

      setChatSummaries(remaining.filter((c) => c.messages.length > 0).map(chatToSummary));

      if (activeChatId === id) {
        setActiveChatId(remaining[0].id);
        setActiveChat(remaining[0]);
      }
    },
    [activeChatId],
  );

  const updateActiveChat = useCallback(
    (messages: ChatMessage[], contextUsage?: { used: number; total: number }) => {
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

      chatsRef.current.set(activeChatId, updated);
      setActiveChat(updated);
      skipCountRef.current++;
      saveChat(updated);
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
