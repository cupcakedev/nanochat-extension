import { createLogger } from '@shared/utils';
import type { ChatMessage, LoadingProgress } from '@shared/types';
import { TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS, TEXT_LANGUAGE_MODEL_OPTIONS } from '@shared/constants';
import { toLanguageModelMessage, summarizePrompt } from './message-converter';

const logger = createLogger('prompt-api');
type SessionMode = 'text' | 'text+image';

function modeToOptions(mode: SessionMode): LanguageModelCreateCoreOptions {
  return mode === 'text+image' ? TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS : TEXT_LANGUAGE_MODEL_OPTIONS;
}

function isMultimodalSessionUnavailableError(err: unknown): boolean {
  if (err instanceof DOMException) {
    if (err.name === 'NotSupportedError' || err.name === 'NotAllowedError') return true;
  }
  if (!(err instanceof Error)) return false;
  return (
    /unable to create a session/i.test(err.message) ||
    /model capability is not available/i.test(err.message) ||
    /notallowederror/i.test(err.message)
  );
}

function toMultimodalUnsupportedError(err: unknown): Error {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return new Error(
    `Image input is currently unavailable in this Chrome profile (Prompt API multimodal session couldn't be created). ${detail}`,
  );
}

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
  private currentMode: SessionMode | null = null;

  async checkAvailability(mode: SessionMode = 'text'): Promise<Availability> {
    const availability = await LanguageModel.availability(modeToOptions(mode));
    logger.info('Model availability:', { mode, availability });
    return availability;
  }

  async createSession(
    onProgress?: (progress: LoadingProgress) => void,
    signal?: AbortSignal,
    mode: SessionMode = 'text',
  ): Promise<void> {
    this.destroySession();

    logger.info('createSession:start', { hasSignal: !!signal, mode });
    let lastLoggedProgressBucket = -1;

    try {
      this.session = await LanguageModel.create({
        ...modeToOptions(mode),
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
      let textAvailabilityAfterError: Availability | 'unknown' = 'unknown';
      try {
        availabilityAfterError = await this.checkAvailability(mode);
      } catch {
        availabilityAfterError = 'unknown';
      }
      if (mode === 'text+image') {
        try {
          textAvailabilityAfterError = await this.checkAvailability('text');
        } catch {
          textAvailabilityAfterError = 'unknown';
        }
      }
      logger.error('createSession:failed', {
        mode,
        availabilityAfterError,
        textAvailabilityAfterError,
        error: toErrorPayload(err),
      });
      if (mode === 'text+image' && isMultimodalSessionUnavailableError(err)) {
        throw toMultimodalUnsupportedError(err);
      }
      throw err;
    }

    this.currentSystemPrompt = null;
    this.currentMode = mode;
    logger.info('Session created', {
      mode,
      inputUsage: this.session.inputUsage,
      inputQuota: this.session.inputQuota,
    });
  }

  private async ensureSession(
    systemPrompt: string | null,
    mode: SessionMode,
    signal?: AbortSignal,
  ): Promise<void> {
    if (
      this.session &&
      this.currentSystemPrompt === systemPrompt &&
      this.currentMode === mode
    ) {
      return;
    }

    if (this.session) {
      this.session.destroy();
      this.session = null;
    }

    logger.info('ensureSession:create:start', {
      hasSystemPrompt: !!systemPrompt,
      mode,
    });

    try {
      this.session = await LanguageModel.create({
        ...modeToOptions(mode),
        signal,
        ...(systemPrompt ? { initialPrompts: [{ role: 'system', content: systemPrompt }] } : {}),
      });
    } catch (err) {
      let availabilityAfterError: Availability | 'unknown' = 'unknown';
      let textAvailabilityAfterError: Availability | 'unknown' = 'unknown';
      try {
        availabilityAfterError = await this.checkAvailability(mode);
      } catch {
        availabilityAfterError = 'unknown';
      }
      if (mode === 'text+image') {
        try {
          textAvailabilityAfterError = await this.checkAvailability('text');
        } catch {
          textAvailabilityAfterError = 'unknown';
        }
      }
      logger.error('ensureSession:create:failed', {
        mode,
        availabilityAfterError,
        textAvailabilityAfterError,
        hasSystemPrompt: !!systemPrompt,
        error: toErrorPayload(err),
      });
      if (mode === 'text+image' && isMultimodalSessionUnavailableError(err)) {
        throw toMultimodalUnsupportedError(err);
      }
      throw err;
    }

    this.currentSystemPrompt = systemPrompt;
    this.currentMode = mode;
    logger.info('Session created', {
      mode,
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

    const prompt = await Promise.all(messages.map(toLanguageModelMessage));
    const hasImageInput = prompt.some((message) =>
      message.content.some((content) => content.type === 'image'),
    );
    const mode: SessionMode = hasImageInput ? 'text+image' : 'text';

    await this.ensureSession(systemPrompt ?? null, mode, signal);

    if (!this.session) {
      throw new Error('Session not initialized');
    }

    logger.info('streamChat:mode-selected', { mode, hasImageInput });
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
      this.currentMode = null;
    }
  }
}
