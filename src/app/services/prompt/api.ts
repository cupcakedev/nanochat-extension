import { createLogger } from '@shared/utils';
import type { ChatMessage, LoadingProgress } from '@shared/types';
import { TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS } from '@shared/constants';
import { toLanguageModelMessage, summarizePrompt } from './message-converter';

const logger = createLogger('prompt-api');

export class PromptAPIService {
  private session: LanguageModel | null = null;
  private currentSystemPrompt: string | null = null;

  async checkAvailability(): Promise<string> {
    const availability = await LanguageModel.availability(TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS);
    logger.info('Model availability:', availability);
    return availability;
  }

  async createSession(
    onProgress?: (progress: LoadingProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.destroySession();

    this.session = await LanguageModel.create({
      ...TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS,
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
    if (this.session && this.currentSystemPrompt === systemPrompt) return;

    if (this.session) {
      this.session.destroy();
      this.session = null;
    }

    this.session = await LanguageModel.create({
      ...TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS,
      ...(systemPrompt ? { initialPrompts: [{ role: 'system', content: systemPrompt }] } : {}),
    });
    this.currentSystemPrompt = systemPrompt;
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
    });

    await this.ensureSession(systemPrompt ?? null);

    if (!this.session) {
      throw new Error('Session not initialized');
    }

    const prompt = await Promise.all(messages.map(toLanguageModelMessage));
    logger.info('streamChat:prompt', summarizePrompt(prompt));

    const stream = this.session.promptStreaming(prompt, { signal });
    const reader = stream.getReader();
    let tokenCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done || signal.aborted) break;
        if (value) {
          tokenCount++;
          onToken(value);
        }
      }
    } finally {
      reader.releaseLock();
    }

    logger.info('streamChat:complete', {
      tokenCount,
      inputUsage: this.session.inputUsage,
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
    }
  }
}
