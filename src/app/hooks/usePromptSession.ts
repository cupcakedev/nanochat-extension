import {useCallback, useEffect, useRef, useState} from 'react';
import {PromptAPIService} from '@app/services/prompt-api';
import type {LoadingProgress, SessionStatus} from '@shared/types';

export function usePromptSession() {
	const serviceRef = useRef<PromptAPIService>(new PromptAPIService());
	const initRef = useRef(false);
	const [status, setStatus] = useState<SessionStatus>('idle');
	const [progress, setProgress] = useState<LoadingProgress | null>(null);
	const [error, setError] = useState<string | null>(null);

	const initialize = useCallback(async () => {
		setStatus('loading');
		setError(null);
		setProgress(null);

		try {
			const availability = await serviceRef.current.checkAvailability();
			if (availability === 'unavailable') {
				throw new Error('Gemini Nano is not available in this browser. Chrome 138+ required.');
			}

			await serviceRef.current.createSession((p) => setProgress(p));
			setStatus('ready');
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Failed to initialize model';
			setError(message);
			setStatus('error');
		} finally {
			setProgress(null);
		}
	}, []);

	const retry = useCallback(() => {
		initialize();
	}, [initialize]);

	useEffect(() => {
		if (initRef.current) return;
		initRef.current = true;
		const service = serviceRef.current;
		initialize();

		return () => {
			service.destroySession();
		};
	}, [initialize]);

	return {status, progress, error, retry, serviceRef};
}
