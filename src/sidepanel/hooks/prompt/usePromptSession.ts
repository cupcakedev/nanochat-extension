import { useCallback, useEffect, useRef, useState } from 'react';
import { PromptAPIService } from '@sidepanel/services/prompt';
import { SessionStatus } from '@shared/types';
import type { LoadingProgress } from '@shared/types';
import { createLogger } from '@shared/utils';

const logger = createLogger('prompt-session');

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

export function usePromptSession() {
  const serviceRef = useRef<PromptAPIService>(new PromptAPIService());
  const initRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.Idle);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setStatus(SessionStatus.Ready);
    } catch (err) {
      if (abortController.signal.aborted) {
        logger.warn('createSession:aborted');
        setStatus(SessionStatus.NeedsDownload);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to initialize model';
      logger.error('createSession:failed', {
        error: toErrorPayload(err),
      });
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

    try {
      const availability = await serviceRef.current.checkAvailability();
      logger.info('checkAndInit:availability', { availability });

      if (availability === 'unavailable') {
        setError('Gemini Nano is not available in this browser. Chrome 138+ required.');
        setStatus(SessionStatus.Error);
        logger.warn('checkAndInit:status=error (unavailable)');
        return;
      }

      if (availability === 'downloadable') {
        setStatus(SessionStatus.NeedsDownload);
        logger.info('checkAndInit:status=needs-download');
        return;
      }

      if (availability === 'downloading') {
        logger.info('checkAndInit:status=downloading -> createSession');
        await createSession();
        return;
      }

      logger.info('checkAndInit:status=available -> createSession');
      await createSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize model';
      logger.error('checkAndInit:failed', {
        error: toErrorPayload(err),
      });
      setError(message);
      setStatus(SessionStatus.Error);
    }
  }, [createSession]);

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
