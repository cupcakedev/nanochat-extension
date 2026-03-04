import { createLogger } from '@shared/utils';
import type { ChatMessage, LoadingProgress } from '@shared/types';
import { TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS, TEXT_LANGUAGE_MODEL_OPTIONS } from '@shared/constants';
import { AppErrorCode, createAppError, isPromptApiInsufficientStorageError } from '@shared/errors';
import { toLanguageModelMessage, summarizePrompt } from './message-converter';

const logger = createLogger('prompt-api');
type SessionMode = 'text' | 'text+image';

function modeToOptions(mode: SessionMode): LanguageModelCreateCoreOptions {
  return mode === 'text+image' ? TEXT_IMAGE_LANGUAGE_MODEL_OPTIONS : TEXT_LANGUAGE_MODEL_OPTIONS;
}

function toMultimodalUnsupportedError(err: unknown): Error {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return createAppError(AppErrorCode.PromptApiMultimodalUnavailable, { detail }, { cause: err });
}

function toInsufficientStorageError(err: unknown): Error {
  const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return createAppError(AppErrorCode.PromptApiInsufficientStorage, { detail }, { cause: err });
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

function ensureLanguageModelDefined(): void {
  if (typeof LanguageModel === 'undefined') {
    throw createAppError(AppErrorCode.LanguageModelNotDefined);
  }
}

async function checkAvailabilityBeforeCreate(mode: SessionMode): Promise<Availability | 'unknown'> {
  ensureLanguageModelDefined();
  try {
    return await LanguageModel.availability(modeToOptions(mode));
  } catch {
    return 'unknown';
  }
}

async function tryCreateSessionForProbe(mode: SessionMode): Promise<boolean> {
  if (typeof LanguageModel === 'undefined') return false;

  let session: LanguageModel | null = null;
  try {
    await checkAvailabilityBeforeCreate(mode);
    session = await LanguageModel.create(modeToOptions(mode));
    return true;
  } catch {
    return false;
  } finally {
    session?.destroy();
  }
}

async function isMultimodalOnlyFailure(): Promise<boolean> {
  const textOk = await tryCreateSessionForProbe('text');
  if (!textOk) return false;

  const textImageOk = await tryCreateSessionForProbe('text+image');
  return !textImageOk;
}

export class PromptAPIService {
  private session: LanguageModel | null = null;
  private currentSystemPrompt: string | null = null;
  private currentMode: SessionMode | null = null;

  async checkAvailability(mode: SessionMode = 'text'): Promise<Availability> {
    ensureLanguageModelDefined();
    const availability = await LanguageModel.availability(modeToOptions(mode));
    logger.info('Model availability:', { mode, availability });
    return availability;
  }

  async diagnoseUnavailableReason(
    mode: SessionMode = 'text',
  ): Promise<AppErrorCode.PromptApiInsufficientStorage | null> {
    ensureLanguageModelDefined();
    let probeSession: LanguageModel | null = null;
    try {
      probeSession = await LanguageModel.create(modeToOptions(mode));
      return null;
    } catch (err) {
      if (isPromptApiInsufficientStorageError(err)) {
        return AppErrorCode.PromptApiInsufficientStorage;
      }
      return null;
    } finally {
      probeSession?.destroy();
    }
  }

  async createSession(
    onProgress?: (progress: LoadingProgress) => void,
    signal?: AbortSignal,
    mode: SessionMode = 'text',
  ): Promise<void> {
    this.destroySession();

    logger.info('createSession:start', { hasSignal: !!signal, mode });
    let lastLoggedProgressBucket = -1;

    const availabilityBeforeCreate = await checkAvailabilityBeforeCreate(mode);

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
      if (isPromptApiInsufficientStorageError(err)) {
        throw toInsufficientStorageError(err);
      }

      const multimodalOnlyFailure =
        mode === 'text+image' && !signal?.aborted ? await isMultimodalOnlyFailure() : false;

      logger.error('createSession:failed', {
        mode,
        availabilityBeforeCreate,
        multimodalOnlyFailure,
        error: toErrorPayload(err),
      });

      if (multimodalOnlyFailure) {
        throw toMultimodalUnsupportedError(err);
      }

      throw err;
    }

    this.currentSystemPrompt = null;
    this.currentMode = mode;
    logger.info('Session created', {
      mode,
      availabilityBeforeCreate,
      inputUsage: this.session.inputUsage,
      inputQuota: this.session.inputQuota,
    });
  }

  private async ensureSession(
    systemPrompt: string | null,
    mode: SessionMode,
    signal?: AbortSignal,
  ): Promise<void> {
    if (this.session && this.currentSystemPrompt === systemPrompt && this.currentMode === mode) {
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

    const availabilityBeforeCreate = await checkAvailabilityBeforeCreate(mode);

    try {
      this.session = await LanguageModel.create({
        ...modeToOptions(mode),
        signal,
        ...(systemPrompt ? { initialPrompts: [{ role: 'system', content: systemPrompt }] } : {}),
      });
    } catch (err) {
      if (isPromptApiInsufficientStorageError(err)) {
        throw toInsufficientStorageError(err);
      }

      const multimodalOnlyFailure =
        mode === 'text+image' && !signal?.aborted ? await isMultimodalOnlyFailure() : false;

      logger.error('ensureSession:create:failed', {
        mode,
        availabilityBeforeCreate,
        multimodalOnlyFailure,
        hasSystemPrompt: !!systemPrompt,
        error: toErrorPayload(err),
      });

      if (multimodalOnlyFailure) {
        throw toMultimodalUnsupportedError(err);
      }

      throw err;
    }

    this.currentSystemPrompt = systemPrompt;
    this.currentMode = mode;
    logger.info('Session created', {
      mode,
      availabilityBeforeCreate,
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
      throw createAppError(AppErrorCode.SessionNotInitialized);
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
