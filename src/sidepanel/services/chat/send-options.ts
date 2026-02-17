import { ChatMode } from '@sidepanel/types/mode';
import type { ChatContextSendMode, ChatSendOptions } from '@sidepanel/types/mode';

export function toSendOptions(
  mode: ChatMode,
  sendMode?: ChatContextSendMode,
): ChatSendOptions | undefined {
  if (mode !== ChatMode.Chat || !sendMode) return undefined;
  return { chatContextSendMode: sendMode };
}
