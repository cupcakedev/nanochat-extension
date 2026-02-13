import { createContext, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Chat, ChatMessage, ChatSummary } from '@shared/types';
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
  updateActiveChat: (messages: ChatMessage[], contextUsage?: { used: number; total: number }) => void;
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
    loadAllChats().then((chats) => {
      const startupChat = createNewChat();
      chats = [startupChat, ...chats];

      chatsRef.current = new Map(chats.map((c) => [c.id, c]));
      skipCountRef.current++;
      saveChat(startupChat);
      setChatSummaries(buildSummaries(chatsRef.current));
      setActiveChatId(startupChat.id);
      setActiveChat(startupChat);
      setLoaded(true);
    });
  }, []);

  useStorageSync(chatsRef, skipCountRef, rebuildSummaries, setActiveChatId, setActiveChat);

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

      if (chatsRef.current.size === 0) {
        const chat = createNewChat();
        chatsRef.current.set(chat.id, chat);
        skipCountRef.current++;
        saveChat(chat);
      }

      rebuildSummaries();

      if (activeChatId === id) {
        const first = sortedByRecent([...chatsRef.current.values()])[0];
        setActiveChatId(first.id);
        setActiveChat(first);
      }
    },
    [activeChatId, rebuildSummaries],
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
