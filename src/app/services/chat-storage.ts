import type { Chat, ChatMessage, ChatSummary } from '@shared/types';

const STORAGE_KEY = 'chats';

interface ChatsMap {
  [id: string]: Chat;
}

async function readChatsMap(): Promise<ChatsMap> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ChatsMap) ?? {};
}

async function writeChatsMap(map: ChatsMap): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: map });
}

export async function loadAllChats(): Promise<Chat[]> {
  const map = await readChatsMap();
  return Object.values(map).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadChat(id: string): Promise<Chat | null> {
  const map = await readChatsMap();
  return map[id] ?? null;
}

export async function saveChat(chat: Chat): Promise<void> {
  const map = await readChatsMap();
  map[chat.id] = chat;
  await writeChatsMap(map);
}

export async function deleteChat(id: string): Promise<void> {
  const map = await readChatsMap();
  delete map[id];
  await writeChatsMap(map);
}

export function createNewChat(): Chat {
  return {
    id: crypto.randomUUID(),
    title: 'New Chat',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
}

export function deriveChatTitle(messages: ChatMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user');
  if (!firstUserMessage) return 'New Chat';
  const text = firstUserMessage.content.trim();
  if (text.length <= 40) return text;
  return text.slice(0, 40) + '...';
}

export function chatToSummary(chat: Chat): ChatSummary {
  const lastMessage = chat.messages[chat.messages.length - 1];
  return {
    id: chat.id,
    title: chat.title,
    updatedAt: chat.updatedAt,
    preview: lastMessage ? lastMessage.content.slice(0, 60) : '',
  };
}
