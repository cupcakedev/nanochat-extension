export enum ChatMode {
  Chat = 'chat',
  Agent = 'agent',
}

export enum ChatContextSendMode {
  WithoutPageContext = 'without-page-context',
  WithPageContext = 'with-page-context',
}

export interface ChatSendOptions {
  chatContextSendMode?: ChatContextSendMode;
}

export function requiresPageContext(mode: ChatMode): boolean {
  return mode === ChatMode.Agent;
}
