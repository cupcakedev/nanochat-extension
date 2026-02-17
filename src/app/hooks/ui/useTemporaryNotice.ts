import { useState, useCallback, useRef } from 'react';

const NOTICE_DURATION_MS = 4000;

export function useTemporaryNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showNotice = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setNotice(message);
    timerRef.current = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
  }, []);

  return { notice, showNotice };
}
