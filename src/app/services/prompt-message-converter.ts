import type { ChatMessage } from '@shared/types';

export type LanguageModelContent =
  | { type: 'text'; value: string }
  | { type: 'image'; value: Blob };

export type LanguageModelMessage = {
  role: 'user' | 'assistant';
  content: LanguageModelContent[];
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

export async function toLanguageModelMessage(message: ChatMessage): Promise<LanguageModelMessage> {
  const content: LanguageModelContent[] = [];

  if (message.images?.length) {
    for (const dataUrl of message.images) {
      content.push({ type: 'image', value: await dataUrlToBlob(dataUrl) });
    }
  }

  if (message.content) {
    content.push({ type: 'text', value: message.content });
  }

  return { role: message.role, content };
}

export function summarizePrompt(messages: LanguageModelMessage[]): object[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content.map((c) =>
      c.type === 'text'
        ? { type: 'text', length: c.value.length, value: c.value }
        : { type: 'image', size: `${((c.value as Blob).size / 1024).toFixed(1)}KB` },
    ),
  }));
}
