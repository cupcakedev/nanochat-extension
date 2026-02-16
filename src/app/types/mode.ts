export type ChatMode = 'chat' | 'agent';

export type ChatContextSendMode = 'without-page-context' | 'with-page-context';

export interface ChatSendOptions {
  chatContextSendMode?: ChatContextSendMode;
}

export function requiresPageContext(mode: ChatMode): boolean {
  return mode === 'agent';
}
