import { useCallback, useRef, useState } from 'react';

const SCROLL_THRESHOLD = 4;

export function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef(0);

  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const el = scrollRef.current;
      if (!el) return;
      setScrolled(el.scrollTop > SCROLL_THRESHOLD);
    });
  }, []);

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      const prev = scrollRef.current;
      if (prev) prev.removeEventListener('scroll', handleScroll);
      scrollRef.current = node;
      if (node) {
        node.addEventListener('scroll', handleScroll, { passive: true });
        setScrolled(node.scrollTop > SCROLL_THRESHOLD);
      }
    },
    [handleScroll],
  );

  return { scrolled, scrollRef: setRef };
}
