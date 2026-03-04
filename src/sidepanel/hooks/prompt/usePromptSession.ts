import { useCallback, useEffect, useRef, useState } from 'react';
import { PromptAPIService } from '@sidepanel/services/prompt';
import { SessionStatus } from '@shared/types';
import type { LoadingProgress } from '@shared/types';
import { createLogger } from '@shared/utils';
import { APP_ERROR_TEXT } from '@shared/errors';

const logger = createLogger('prompt-session');
const AVAILABILITY_POLL_INTERVAL_MS = 1500;
const DOWNLOADING_PROGRESS_TEXT = 'Downloading model...';

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

function isSessionCreationBlockedError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const message = err.message.toLowerCase();
  return (
    err.name === 'InvalidStateError' &&
    message.includes('unable to create a session') &&
    message.includes('availability')
  );
}

export function usePromptSession() {
  const serviceRef = useRef<PromptAPIService>(new PromptAPIService());
  const initRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.Idle);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [awaitingAvailability, setAwaitingAvailability] = useState(false);

  const createSession = useCallback(async () => {
    logger.info('createSession:start');
    setStatus(SessionStatus.Loading);
    setError(null);
    setProgress(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await serviceRef.current.createSession((p) => setProgress(p), abortController.signal);
      logger.info('createSession:success');
      setAwaitingAvailability(false);
      setStatus(SessionStatus.Ready);
    } catch (err) {
      if (abortController.signal.aborted) {
        logger.warn('createSession:aborted');
        setAwaitingAvailability(false);
        setStatus(SessionStatus.NeedsDownload);
        return;
      }
      if (isSessionCreationBlockedError(err)) {
        logger.info('createSession:blocked-while-downloading');
        setError(null);
        setAwaitingAvailability(true);
        setStatus(SessionStatus.Loading);
        setProgress({ progress: 0, text: DOWNLOADING_PROGRESS_TEXT });
        return;
      }
      const message = err instanceof Error ? err.message : APP_ERROR_TEXT.failedToInitializeModel;
      logger.error('createSession:failed', {
        error: toErrorPayload(err),
      });
      setAwaitingAvailability(false);
      setError(message);
      setStatus(SessionStatus.Error);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }, []);

  const checkAndInit = useCallback(async () => {
    logger.info('checkAndInit:start');
    setStatus(SessionStatus.Loading);
    setError(null);
    setProgress(null);

    if (typeof LanguageModel === 'undefined') {
      setError(APP_ERROR_TEXT.languageModelNotDefined);
      setStatus(SessionStatus.Error);
      logger.warn('checkAndInit:status=error (language-model-missing)');
      return;
    }

    try {
      const availability = await serviceRef.current.checkAvailability();
      logger.info('checkAndInit:availability', { availability });

      if (availability === 'unavailable') {
        setError(APP_ERROR_TEXT.modelUnavailable);
        setStatus(SessionStatus.Error);
        logger.warn('checkAndInit:status=error (unavailable)');
        return;
      }

      if (availability === 'downloadable') {
        setAwaitingAvailability(false);
        setStatus(SessionStatus.NeedsDownload);
        logger.info('checkAndInit:status=needs-download');
        return;
      }

      if (availability === 'downloading') {
        logger.info('checkAndInit:status=downloading');
        setAwaitingAvailability(true);
        setStatus(SessionStatus.Loading);
        setProgress({ progress: 0, text: DOWNLOADING_PROGRESS_TEXT });
        return;
      }

      setAwaitingAvailability(false);
      logger.info('checkAndInit:status=available -> createSession');
      await createSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : APP_ERROR_TEXT.failedToInitializeModel;
      logger.error('checkAndInit:failed', {
        error: toErrorPayload(err),
      });
      setAwaitingAvailability(false);
      setError(message);
      setStatus(SessionStatus.Error);
    }
  }, [createSession]);

  useEffect(() => {
    if (!awaitingAvailability) return;
    const timerId = window.setTimeout(() => {
      checkAndInit();
    }, AVAILABILITY_POLL_INTERVAL_MS);
    return () => {
      window.clearTimeout(timerId);
    };
  }, [awaitingAvailability, checkAndInit]);

  const download = useCallback(async () => {
    logger.info('download:requested');
    await createSession();
  }, [createSession]);

  const cancelDownload = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const retry = useCallback(() => {
    checkAndInit();
  }, [checkAndInit]);

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;
    const service = serviceRef.current;
    checkAndInit();

    return () => {
      abortRef.current?.abort();
      service.destroySession();
    };
  }, [checkAndInit]);

  return { status, progress, error, retry, download, cancelDownload, serviceRef };
}
