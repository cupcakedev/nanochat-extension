import { getActiveTab } from '@app/services/tab-bridge';
import type { PageSource } from '@shared/types';

const IGNORED_PREFIXES = ['chrome://', 'chrome-extension://'];

function isIgnoredUrl(url: string): boolean {
  return IGNORED_PREFIXES.some((prefix) => url.startsWith(prefix));
}

export async function fetchPageContextSource(): Promise<PageSource | null> {
  try {
    const tab = await getActiveTab();
    if (!tab.url || isIgnoredUrl(tab.url)) return null;
    return { url: tab.url, title: tab.title, faviconUrl: tab.favIconUrl };
  } catch {
    return null;
  }
}
