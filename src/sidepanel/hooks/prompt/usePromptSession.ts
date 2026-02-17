import { useCallback, useEffect, useRef, useState } from 'react';
import { PromptAPIService } from '@sidepanel/services/prompt';
import { SessionStatus } from '@shared/types';
import type { LoadingProgress } from '@shared/types';

export function usePromptSession() {
  const serviceRef = useRef<PromptAPIService>(new PromptAPIService());
  const initRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.Idle);
  const [progress, setProgress] = useState<LoadingProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    setStatus(SessionStatus.Loading);
    setError(null);
    setProgress(null);

    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      await serviceRef.current.createSession((p) => setProgress(p), abortController.signal);
      setStatus(SessionStatus.Ready);
    } catch (err) {
      if (abortController.signal.aborted) {
        setStatus(SessionStatus.NeedsDownload);
        return;
      }
      const message = err instanceof Error ? err.message : 'Failed to initialize model';
      setError(message);
      setStatus(SessionStatus.Error);
    } finally {
      setProgress(null);
      abortRef.current = null;
    }
  }, []);

  const checkAndInit = useCallback(async () => {
    setStatus(SessionStatus.Loading);
    setError(null);

    try {
      const availability = await serviceRef.current.checkAvailability();

      if (availability === 'unavailable') {
        setError('Gemini Nano is not available in this browser. Chrome 138+ required.');
        setStatus(SessionStatus.Error);
        return;
      }

      if (availability === 'downloadable' || availability === 'downloading') {
        setStatus(SessionStatus.NeedsDownload);
        return;
      }

      await createSession();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize model';
      setError(message);
      setStatus(SessionStatus.Error);
    }
  }, [createSession]);

  const download = useCallback(() => {
    createSession();
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
