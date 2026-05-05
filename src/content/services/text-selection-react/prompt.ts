import type { PopupAction } from './types';

export function buildPrompt(action: PopupAction, text: string, targetLang?: string): string {
  const q = `"${text}"`;
  switch (action) {
    case 'translate':
      return `Translate the following text to ${targetLang ?? 'English'}. Output only the translated text, no explanations:\n\n${q}`;
    case 'summarize':
      return `Summarize the following text concisely:\n\n${q}`;
    case 'rewrite':
      return `Rewrite the following text to improve clarity and flow while keeping the same meaning. Output only the rewritten text:\n\n${q}`;
    case 'spellcheck':
      return `Check the spelling and grammar in the following text. List any errors and provide the corrected version:\n\n${q}`;
    case 'explain':
      return `Explain the following text in simple, clear terms:\n\n${q}`;
    case 'ask':
      return text;
    default:
      return text;
  }
}
