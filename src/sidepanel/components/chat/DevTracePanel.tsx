import { memo, useEffect, useMemo, useRef } from 'react';
import { DevTraceKind } from '@sidepanel/types/dev-trace';
import type { DevTraceItem } from '@sidepanel/types/dev-trace';

interface DevTracePanelProps {
  items: DevTraceItem[];
  streaming: boolean;
}

function renderTraceItem(item: DevTraceItem) {
  if (item.kind === DevTraceKind.Line) {
    return (
      <p key={item.id} className="whitespace-pre-wrap break-words">
        {item.line}
      </p>
    );
  }

  return (
    <figure key={item.id} className="rounded-lg border border-amber-300 bg-amber-100/60 p-2">
      <figcaption className="mb-2 text-[11px] uppercase tracking-wide text-amber-800">
        step {item.stepNumber} screenshot {item.width}x{item.height}
      </figcaption>
      <img
        src={item.imageDataUrl}
        alt={`Step ${item.stepNumber} screenshot`}
        className="w-full rounded-md border border-amber-300"
      />
    </figure>
  );
}

export const DevTracePanel = memo(({ items, streaming }: DevTracePanelProps) => {
  const bodyRef = useRef<HTMLDivElement>(null);
  const renderedItems = useMemo(() => items.map(renderTraceItem), [items]);
  const status = streaming ? 'running' : 'idle';

  useEffect(() => {
    const element = bodyRef.current;
    if (!element) return;
    element.scrollTop = element.scrollHeight;
  }, [items]);

  return (
    <section className="mt-4 rounded-xl border border-amber-300 bg-amber-50/80">
      <header className="flex items-center justify-between border-b border-amber-300 px-3 py-2">
        <p className="text-xs font-semibold tracking-wide text-amber-900">DEV TRACE</p>
        <span className="text-[11px] font-medium uppercase text-amber-700">{status}</span>
      </header>
      <div
        ref={bodyRef}
        className="max-h-80 overflow-auto space-y-2 px-3 py-2 font-mono text-[12px] leading-5 text-amber-950"
      >
        {renderedItems.length > 0 ? renderedItems : <p>No steps yet</p>}
      </div>
    </section>
  );
});

DevTracePanel.displayName = 'DevTracePanel';
