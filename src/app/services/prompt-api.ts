import { createLogger } from '@shared/utils';
import type { ChatMessage, LoadingProgress } from '@shared/types';

const logger = createLogger('prompt-api');

const LANGUAGE_OPTIONS = {
  expectedInputs: [{ type: 'text' as const, languages: ['en'] }, { type: 'image' as const }],
  expectedOutputs: [{ type: 'text' as const, languages: ['en'] }],
};

type LanguageModelContent =
  | { type: 'text'; value: string }
  | { type: 'image'; value: Blob };

type LanguageModelMessage = {
  role: 'user' | 'assistant';
  content: LanguageModelContent[];
};

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function toLanguageModelMessage(message: ChatMessage): Promise<LanguageModelMessage> {
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

export class PromptAPIService {
  private session: LanguageModel | null = null;

  async checkAvailability(): Promise<string> {
    const availability = await LanguageModel.availability(LANGUAGE_OPTIONS);
    logger.info('Model availability:', availability);
    return availability;
  }

  async createSession(
    onProgress?: (progress: LoadingProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.destroySession();

    logger.info('Creating LanguageModel session...');
    this.session = await LanguageModel.create({
      ...LANGUAGE_OPTIONS,
      signal,
      monitor: (monitor) => {
        monitor.addEventListener('downloadprogress', (e) => {
          const progress = e.loaded / e.total;
          onProgress?.({
            progress,
            text: `Downloading model: ${Math.round(progress * 100)}%`,
          });
        });
      },
    });
    logger.info('Session created successfully');
  }

  async streamChat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    signal: AbortSignal,
  ): Promise<void> {
    if (!this.session) {
      throw new Error('Session not initialized');
    }

    const prompt = await Promise.all(messages.map(toLanguageModelMessage));
    const stream = this.session.promptStreaming(prompt, { signal });

    const reader = stream.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        if (value) onToken(value);
      }
    } finally {
      reader.releaseLock();
    }
  }

  destroySession(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
      logger.info('Session destroyed');
    }
  }
}
