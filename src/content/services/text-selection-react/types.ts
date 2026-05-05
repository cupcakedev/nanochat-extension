export type PopupAction = 'translate' | 'summarize' | 'rewrite' | 'spellcheck' | 'explain' | 'ask';

export interface Language {
  name: string;
  native: string;
}

export interface ChatSeed {
  userMessage: string;
  assistantMessage: string;
}
