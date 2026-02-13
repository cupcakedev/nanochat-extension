export type ChatMode = 'chat' | 'agent' | 'interactive';

export function requiresPageContext(mode: ChatMode): boolean {
  return mode === 'agent' || mode === 'interactive';
}
