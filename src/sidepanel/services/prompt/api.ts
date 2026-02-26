import { createLogger } from '@shared/utils';
import type { ChatMessage, LoadingProgress } from '@shared/types';
import { TEXT_LANGUAGE_MODEL_OPTIONS } from '@shared/constants';
import { toLanguageModelMessage, summarizePrompt } from './message-converter';

const logger = createLogger('prompt-api');

function toErrorPayload(err: unknown) {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
  }
  return { value: String(err) };
}

export class PromptAPIService {
  private session: LanguageModel | null = null;
  private currentSystemPrompt: string | null = null;

  async checkAvailability(): Promise<Availability> {
    const availability = await LanguageModel.availability(TEXT_LANGUAGE_MODEL_OPTIONS);
    logger.info('Model availability:', availability);
    return availability;
  }

  async createSession(
    onProgress?: (progress: LoadingProgress) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    this.destroySession();

    logger.info('createSession:start', { hasSignal: !!signal });
    let lastLoggedProgressBucket = -1;

    try {
      this.session = await LanguageModel.create({
        ...TEXT_LANGUAGE_MODEL_OPTIONS,
        signal,
        monitor: (monitor) => {
          monitor.addEventListener('downloadprogress', (e) => {
            const progress = e.loaded / e.total;
            const progressBucket = Math.floor(progress * 10);
            if (progressBucket !== lastLoggedProgressBucket) {
              lastLoggedProgressBucket = progressBucket;
              logger.info('createSession:downloadprogress', {
                loaded: e.loaded,
                total: e.total,
                progress,
              });
            }
            onProgress?.({
              progress,
              text: `Downloading model: ${Math.round(progress * 100)}%`,
            });
          });
        },
      });
    } catch (err) {
      let availabilityAfterError: Availability | 'unknown' = 'unknown';
      try {
        availabilityAfterError = await this.checkAvailability();
      } catch {
        availabilityAfterError = 'unknown';
      }
      logger.error('createSession:failed', {
        availabilityAfterError,
        error: toErrorPayload(err),
      });
      throw err;
    }

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

    logger.info('ensureSession:create:start', {
      hasSystemPrompt: !!systemPrompt,
    });

    try {
      this.session = await LanguageModel.create({
        ...TEXT_LANGUAGE_MODEL_OPTIONS,
        ...(systemPrompt ? { initialPrompts: [{ role: 'system', content: systemPrompt }] } : {}),
      });
    } catch (err) {
      let availabilityAfterError: Availability | 'unknown' = 'unknown';
      try {
        availabilityAfterError = await this.checkAvailability();
      } catch {
        availabilityAfterError = 'unknown';
      }
      logger.error('ensureSession:create:failed', {
        availabilityAfterError,
        hasSystemPrompt: !!systemPrompt,
        error: toErrorPayload(err),
      });
      throw err;
    }

    this.currentSystemPrompt = systemPrompt;
    logger.info('Session created', {
      inputUsage: this.session.inputUsage,
      inputQuota: this.session.inputQuota,
      hasSystemPrompt: !!systemPrompt,
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
