import { useCallback, useEffect, useRef, useState } from 'react';
import { PromptAPIService } from '@app/services/prompt-api';
import type { LoadingProgress, SessionStatus } from '@shared/types';

export function usePromptSession() {
	const serviceRef = useRef<PromptAPIService>(new PromptAPIService());
	const initRef = useRef(false);
	const abortRef = useRef<AbortController | null>(null);
	const [status, setStatus] = useState<SessionStatus>('idle');
	const [progress, setProgress] = useState<LoadingProgress | null>(null);
	const [error, setError] = useState<string | null>(null);

	const createSession = useCallback(async () => {
		setStatus('loading');
		setError(null);
		setProgress(null);

		const abortController = new AbortController();
		abortRef.current = abortController;

		try {
			await serviceRef.current.createSession(
				(p) => setProgress(p),
				abortController.signal,
			);
			setStatus('ready');
		} catch (err) {
			if (abortController.signal.aborted) {
				setStatus('needs-download');
				return;
			}
			const message = err instanceof Error ? err.message : 'Failed to initialize model';
			setError(message);
			setStatus('error');
		} finally {
			setProgress(null);
			abortRef.current = null;
		}
	}, []);

	const checkAndInit = useCallback(async () => {
		setStatus('loading');
		setError(null);

		try {
			const availability = await serviceRef.current.checkAvailability();

			if (availability === 'unavailable') {
				setError('Gemini Nano is not available in this browser. Chrome 138+ required.');
				setStatus('error');
				return;
			}

			if (availability === 'downloadable' || availability === 'downloading') {
				setStatus('needs-download');
				return;
			}

			await createSession();
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to initialize model';
			setError(message);
			setStatus('error');
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
