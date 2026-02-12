import { useCallback, useEffect, useRef, useState } from 'react';
import type { Chat, ChatMessage, ChatSummary } from '@shared/types';
import {
  loadAllChats,
  saveChat,
  deleteChat as deleteChatFromStorage,
  createNewChat,
  deriveChatTitle,
  chatToSummary,
} from '@app/services/chat-storage';

export function useChatHistory() {
  const [chatSummaries, setChatSummaries] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [loaded, setLoaded] = useState(false);
  const chatsRef = useRef<Map<string, Chat>>(new Map());

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

  const createChat = useCallback(() => {
    const chat = createNewChat();
    chatsRef.current.set(chat.id, chat);
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
      deleteChatFromStorage(id);

      const remaining = [...chatsRef.current.values()].sort((a, b) => b.updatedAt - a.updatedAt);

      if (remaining.length === 0) {
        const chat = createNewChat();
        chatsRef.current.set(chat.id, chat);
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
    (messages: ChatMessage[]) => {
      if (!activeChatId) return;
      const existing = chatsRef.current.get(activeChatId);
      if (!existing) return;

      const updated: Chat = {
        ...existing,
        messages,
        title: deriveChatTitle(messages),
        updatedAt: Date.now(),
      };

      chatsRef.current.set(activeChatId, updated);
      setActiveChat(updated);
      saveChat(updated);

      setChatSummaries(() => {
        const all = [...chatsRef.current.values()]
          .filter((c) => c.messages.length > 0)
          .sort((a, b) => b.updatedAt - a.updatedAt);
        return all.map(chatToSummary);
      });
    },
    [activeChatId],
  );

  return {
    chatSummaries,
    activeChatId,
    activeChat,
    loaded,
    createChat,
    selectChat,
    deleteChat,
    updateActiveChat,
  };
}
