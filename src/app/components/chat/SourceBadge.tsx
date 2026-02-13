import { memo } from 'react';
import type { PageSource } from '@shared/types';

interface SourceBadgeProps {
  pageSource: PageSource;
}

function openUrl(url: string) {
  void chrome.tabs.create({ url });
}

export const SourceBadge = memo(({ pageSource }: SourceBadgeProps) => (
  <button
    type="button"
    onClick={() => openUrl(pageSource.url)}
    className="mt-2 inline-flex max-w-full items-center gap-2 rounded-[16px] border border-white/10 bg-neutral-100/80 px-3.5 py-2 text-xs text-neutral-700 backdrop-blur-md cursor-pointer hover:bg-neutral-100 transition-colors duration-200"
  >
    <span className="text-neutral-500 shrink-0">Based on:</span>
    {pageSource.faviconUrl ? (
      <img
        src={pageSource.faviconUrl}
        alt=""
        className="h-4 w-4 rounded-[4px] shrink-0"
      />
    ) : (
      <span className="flex h-4 w-4 items-center justify-center rounded-[4px] bg-neutral-200/30 text-[10px] leading-none text-neutral-600 shrink-0">
        •
      </span>
    )}
    <span className="truncate text-neutral-800">{pageSource.title}</span>
  </button>
));

SourceBadge.displayName = 'SourceBadge';
