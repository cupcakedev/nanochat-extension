import { useContext } from 'react';
import { ChatContext, type ChatContextValue } from '@sidepanel/contexts/ChatContext';
import { AppErrorCode, createAppError } from '@shared/errors';

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw createAppError(AppErrorCode.ChatContextProviderMissing);
  }
  return ctx;
}
