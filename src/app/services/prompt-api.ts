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

function summarizePrompt(messages: LanguageModelMessage[]): object[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content.map((c) =>
      c.type === 'text'
        ? { type: 'text', length: c.value.length, value: c.value }
        : { type: 'image', size: `${((c.value as Blob).size / 1024).toFixed(1)}KB` },
    ),
  }));
}

export class PromptAPIService {
  private session: LanguageModel | null = null;
  private currentSystemPrompt: string | null = null;

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
    this.currentSystemPrompt = null;
    logger.info('Session created', {
      inputUsage: this.session.inputUsage,
      inputQuota: this.session.inputQuota,
    });
  }

  private async ensureSession(systemPrompt: string | null): Promise<void> {
    if (this.session && this.currentSystemPrompt === systemPrompt) {
      logger.info('Session reused (system prompt unchanged)');
      return;
    }

    if (this.session) {
      logger.info('Destroying existing session for system prompt change');
      this.session.destroy();
      this.session = null;
    }

    const hasSystemPrompt = !!systemPrompt;
    logger.info('Creating new session', {
      hasSystemPrompt,
      systemPromptLength: systemPrompt?.length ?? 0,
      systemPrompt: systemPrompt ?? null,
    });

    this.session = await LanguageModel.create({
      ...LANGUAGE_OPTIONS,
      ...(systemPrompt
        ? {
            initialPrompts: [
              {
                role: 'system',
                content: systemPrompt,
              },
            ],
          }
        : {}),
    });
    this.currentSystemPrompt = systemPrompt;

    logger.info('Session initialPrompts payload', {
      initialPrompts: systemPrompt
        ? [
            {
              role: 'system',
              content: systemPrompt,
            },
          ]
        : [],
    });

    logger.info('Session created', {
      inputUsage: this.session.inputUsage,
      inputQuota: this.session.inputQuota,
    });
  }

  async streamChat(
    messages: ChatMessage[],
    onToken: (token: string) => void,
    signal: AbortSignal,
    systemPrompt?: string | null,
  ): Promise<void> {
    logger.info('streamChat:start', {
      messageCount: messages.length,
      hasSystemPrompt: !!systemPrompt,
      roles: messages.map((m) => m.role),
      imageCount: messages.reduce((sum, m) => sum + (m.images?.length ?? 0), 0),
    });

    await this.ensureSession(systemPrompt ?? null);

    if (!this.session) {
      throw new Error('Session not initialized');
    }

    const prompt = await Promise.all(messages.map(toLanguageModelMessage));
    logger.info('streamChat:prompt', summarizePrompt(prompt));

    const usageBefore = this.session.inputUsage;
    logger.info('streamChat:contextBefore', {
      inputUsage: usageBefore,
      inputQuota: this.session.inputQuota,
    });

    const stream = this.session.promptStreaming(prompt, { signal });
    const reader = stream.getReader();
    let tokenCount = 0;
    let fullResponse = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        if (value) {
          tokenCount++;
          fullResponse += value;
          onToken(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    const usageAfter = this.session.inputUsage;
    logger.info('streamChat:complete', {
      tokenCount,
      responseLength: fullResponse.length,
      responsePreview: fullResponse.slice(0, 200),
      inputUsageBefore: usageBefore,
      inputUsageAfter: usageAfter,
      inputConsumed: usageAfter - usageBefore,
      inputQuota: this.session.inputQuota,
      aborted: signal.aborted,
    });
  }

  getContextUsage(): { used: number; total: number } | null {
    if (!this.session) return null;
    return {
      used: this.session.inputUsage,
      total: this.session.inputQuota,
    };
  }

  destroySession(): void {
    if (this.session) {
      this.session.destroy();
      this.session = null;
      this.currentSystemPrompt = null;
      logger.info('Session destroyed');
    }
  }
}
