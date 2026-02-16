import type { ChatContextSendMode, ChatMode, ChatSendOptions } from '@app/types/mode';

export function toSendOptions(mode: ChatMode, sendMode?: ChatContextSendMode): ChatSendOptions | undefined {
  if (mode !== 'chat' || !sendMode) return undefined;
  return { chatContextSendMode: sendMode };
}
