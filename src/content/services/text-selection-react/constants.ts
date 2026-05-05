import type { Language, PopupAction } from './types';

export const HOST_ID = 'nanochat-sel-host';

export const TOOLBAR_H = 40;
export const TOOLBAR_GAP = 8;
export const LANG_PANEL_H = 272;
export const LANG_PANEL_GAP = 6;

export const ACTION_LABELS: Record<PopupAction, string> = {
  translate: 'Translate',
  summarize: 'Summarize',
  rewrite: 'Rewrite',
  spellcheck: 'Spell check',
  explain: 'Explain',
  ask: 'Ask',
};

export const LANGUAGES: Language[] = [
  { name: 'English', native: 'English' },
  { name: 'Spanish', native: 'Español' },
  { name: 'French', native: 'Français' },
  { name: 'German', native: 'Deutsch' },
  { name: 'Italian', native: 'Italiano' },
  { name: 'Portuguese', native: 'Português' },
  { name: 'Russian', native: 'Русский' },
  { name: 'Chinese', native: '中文' },
  { name: 'Japanese', native: '日本語' },
  { name: 'Korean', native: '한국어' },
  { name: 'Arabic', native: 'العربية' },
  { name: 'Hindi', native: 'हिन्दी' },
  { name: 'Dutch', native: 'Nederlands' },
  { name: 'Polish', native: 'Polski' },
  { name: 'Turkish', native: 'Türkçe' },
];

export function getLangCode(name: string): string {
  const map: Record<string, string> = {
    English: 'EN',
    Spanish: 'ES',
    French: 'FR',
    German: 'DE',
    Italian: 'IT',
    Portuguese: 'PT',
    Russian: 'RU',
    Chinese: 'ZH',
    Japanese: 'JA',
    Korean: 'KO',
    Arabic: 'AR',
    Hindi: 'HI',
    Dutch: 'NL',
    Polish: 'PL',
    Turkish: 'TR',
  };
  return map[name] ?? name.slice(0, 2).toUpperCase();
}
