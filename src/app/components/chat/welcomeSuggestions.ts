import { ChatMode } from '@app/types/mode';

export interface Suggestion {
  label: string;
  prompt: string;
  requiresContext: boolean;
}

const CHAT_SUGGESTIONS: Suggestion[] = [
  {
    label: 'Summarize this page',
    prompt: 'Summarize the content of this page',
    requiresContext: true,
  },
  {
    label: 'Translate to English',
    prompt: 'Translate the content of this page to English',
    requiresContext: true,
  },
  {
    label: "Explain like I'm 5",
    prompt: 'Explain the content of this page in simple terms, as if I were 5 years old',
    requiresContext: true,
  },
  {
    label: 'Extract key points',
    prompt: 'Extract the key points and main takeaways from this page',
    requiresContext: true,
  },
  {
    label: 'Find action items',
    prompt: 'Find and list all action items or tasks mentioned on this page',
    requiresContext: true,
  },
  {
    label: 'Rewrite more concisely',
    prompt: 'Rewrite the main content of this page in a more concise way',
    requiresContext: true,
  },
];

const AGENT_SUGGESTIONS: Suggestion[] = [
  {
    label: 'Click the sign-in button',
    prompt: 'Click the sign-in button on this page',
    requiresContext: true,
  },
  {
    label: 'Fill out the form',
    prompt: 'Fill out the form on this page with placeholder data',
    requiresContext: true,
  },
  { label: 'Open youtube.com', prompt: 'Navigate to youtube.com', requiresContext: false },
  {
    label: 'Scroll to the bottom',
    prompt: 'Scroll to the bottom of this page',
    requiresContext: true,
  },
  {
    label: 'Search Google for news',
    prompt: "Open Google and search for today's top news",
    requiresContext: false,
  },
];

const CHAT_DESCRIPTION =
  'Ask questions about any webpage, get summaries, translations, and insights — powered by on-device AI.';

const AGENT_DESCRIPTION =
  'Let the agent interact with webpages for you — click buttons, fill forms, navigate sites, and automate tasks.';

export function getSuggestionsForMode(mode: ChatMode): Suggestion[] {
  return mode === ChatMode.Agent ? AGENT_SUGGESTIONS : CHAT_SUGGESTIONS;
}

export function getDescriptionForMode(mode: ChatMode): string {
  return mode === ChatMode.Agent ? AGENT_DESCRIPTION : CHAT_DESCRIPTION;
}
