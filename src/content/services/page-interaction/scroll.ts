function maxScrollTop(): number {
  const doc = document.documentElement;
  const body = document.body;
  const documentHeight = Math.max(
    doc?.scrollHeight ?? 0,
    body?.scrollHeight ?? 0,
    doc?.offsetHeight ?? 0,
    body?.offsetHeight ?? 0,
    window.innerHeight,
  );
  return Math.max(0, documentHeight - window.innerHeight);
}

function normalizeScrollTop(value: number): number {
  if (!Number.isFinite(value)) return Math.round(window.scrollY || 0);
  const rounded = Math.round(value);
  return Math.min(maxScrollTop(), Math.max(0, rounded));
}

export function setInteractionScrollTop(top: number): number {
  const normalizedTop = normalizeScrollTop(top);
  window.scrollTo({ top: normalizedTop, left: window.scrollX, behavior: 'auto' });
  return Math.max(0, Math.round(window.scrollY || 0));
}
