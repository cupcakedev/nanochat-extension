import { useCallback, useLayoutEffect, type RefObject } from 'react';

const MIN_HEIGHT = 26;
const MAX_HEIGHT = 160;

export function useTextareaAutoResize(value: string, textareaRef: RefObject<HTMLTextAreaElement | null>) {
  const resize = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    if (!textarea.value) {
      textarea.style.height = `${MIN_HEIGHT}px`;
      textarea.style.overflowY = 'hidden';
      return;
    }

    textarea.style.height = `${MIN_HEIGHT}px`;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, MIN_HEIGHT), MAX_HEIGHT);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_HEIGHT ? 'auto' : 'hidden';
  }, [textareaRef]);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);
}
