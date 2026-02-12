import { useContext } from 'react';
import { ChatContext, type ChatContextValue } from '@app/contexts/ChatContext';

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a <ChatProvider>');
  }
  return ctx;
}
