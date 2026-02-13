import { useEffect } from 'react';
import type { MutableRefObject, Dispatch, SetStateAction } from 'react';
import type { Chat } from '@shared/types';
import { CHATS_STORAGE_KEY } from '@shared/services/chat-storage';

function sortedByRecent(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function useStorageSync(
  chatsRef: MutableRefObject<Map<string, Chat>>,
  skipCountRef: MutableRefObject<number>,
  rebuildSummaries: () => void,
  setActiveChatId: Dispatch<SetStateAction<string | null>>,
  setActiveChat: Dispatch<SetStateAction<Chat | null>>,
) {
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

      setActiveChatId((prevId) => {
        if (prevId && newMap[prevId]) {
          setActiveChat(newMap[prevId]);
          return prevId;
        }
        const sorted = sortedByRecent(Object.values(newMap));
        if (sorted.length > 0) {
          setActiveChat(sorted[0]);
          return sorted[0].id;
        }
        return null;
      });
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [chatsRef, skipCountRef, rebuildSummaries, setActiveChatId, setActiveChat]);
}
