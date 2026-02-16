import { createLogger } from '@shared/utils';
import { sendMessageToTab } from '@shared/messaging';
import type {
  InteractionSnapshotPayload,
  ExecuteActionResponse,
  ExecutableInteractionAction,
} from '@shared/types';

const logger = createLogger('tab-bridge');

export interface ActiveTab {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  favIconUrl: string;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function nowMs(): number {
  return Date.now();
}

function tabSignature(tab: chrome.tabs.Tab): string {
  return `${tab.status ?? 'unknown'}|${tab.url ?? ''}`;
}

interface SettledWaitConfig {
  maxWaitMs: number;
  pollIntervalMs: number;
  stableIdleMs: number;
}

export interface WaitForTabSettledOptions {
  maxWaitMs?: number;
  pollIntervalMs?: number;
  stableIdleMs?: number;
}

function toSettledWaitConfig(options?: WaitForTabSettledOptions): SettledWaitConfig {
  return {
    maxWaitMs: Math.max(0, options?.maxWaitMs ?? 4500),
    pollIntervalMs: Math.max(40, options?.pollIntervalMs ?? 120),
    stableIdleMs: Math.max(0, options?.stableIdleMs ?? 320),
  };
}

async function getTabOrNull(tabId: number): Promise<chrome.tabs.Tab | null> {
  try {
    return await chrome.tabs.get(tabId);
  } catch {
    return null;
  }
}

function isSettled(tab: chrome.tabs.Tab, stableSince: number, stableIdleMs: number): boolean {
  if (tab.status !== 'complete') return false;
  return nowMs() - stableSince >= stableIdleMs;
}

export async function waitForTabSettled(tabId: number, options?: WaitForTabSettledOptions): Promise<void> {
  const config = toSettledWaitConfig(options);
  if (config.maxWaitMs === 0) return;

  const startedAt = nowMs();
  let stableSince = startedAt;
  let lastSignature = '';

  while (nowMs() - startedAt < config.maxWaitMs) {
    const tab = await getTabOrNull(tabId);
    if (!tab) return;

    const signature = tabSignature(tab);
    if (signature !== lastSignature) {
      lastSignature = signature;
      stableSince = nowMs();
    }

    if (isSettled(tab, stableSince, config.stableIdleMs)) return;
    await pause(config.pollIntervalMs);
  }
}

export async function getActiveTab(): Promise<ActiveTab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found');
  const result = {
    tabId: tab.id,
    windowId: tab.windowId,
    url: tab.url ?? '',
    title: tab.title ?? '',
    favIconUrl: tab.favIconUrl ?? '',
  };
  logger.info('getActiveTab', { tabId: result.tabId, url: result.url });
  return result;
}

export interface GetPageContentOptions {
  indicatorBottomOffset?: number;
  showIndicator?: boolean;
}

export async function getPageContent(
  tabId: number,
  options?: GetPageContentOptions,
): Promise<string> {
  logger.info('getPageContent:request', { tabId });
  const response = await sendMessageToTab<'GET_PAGE_CONTENT'>(tabId, {
    type: 'GET_PAGE_CONTENT',
    payload: options,
  });
  logger.info('getPageContent:response', { tabId, contentLength: response.content.length });
  return response.content;
}

export async function setAgentIndicatorPosition(
  tabId: number,
  bottomOffset: number,
): Promise<void> {
  logger.info('setAgentIndicatorPosition:request', { tabId, bottomOffset });
  await sendMessageToTab<'SET_AGENT_INDICATOR_POSITION'>(tabId, {
    type: 'SET_AGENT_INDICATOR_POSITION',
    payload: { bottomOffset },
  });
}

export async function getInteractionSnapshot(
  tabId: number,
  options?: { maxElements?: number; viewportOnly?: boolean; viewportSegments?: number },
): Promise<InteractionSnapshotPayload> {
  logger.info('getInteractionSnapshot:request', { tabId, ...options });
  const response = await sendMessageToTab<'GET_INTERACTION_SNAPSHOT'>(tabId, {
    type: 'GET_INTERACTION_SNAPSHOT',
    payload: options,
  });
  logger.info('getInteractionSnapshot:response', {
    tabId,
    elementCount: response.interactiveElements.length,
    pageUrl: response.pageUrl,
  });
  return response;
}

export async function setInteractionScroll(tabId: number, top: number): Promise<number> {
  logger.info('setInteractionScroll:request', { tabId, top });
  const response = await sendMessageToTab<'SET_INTERACTION_SCROLL'>(tabId, {
    type: 'SET_INTERACTION_SCROLL',
    payload: { top },
  });
  logger.info('setInteractionScroll:response', { tabId, top: response.top });
  return response.top;
}

export async function executeAction(
  tabId: number,
  action: ExecutableInteractionAction,
  index: number,
  text?: string | null,
): Promise<ExecuteActionResponse> {
  logger.info('executeAction:request', { tabId, action, index, textLength: text?.length ?? 0 });
  const response = await sendMessageToTab<'EXECUTE_INTERACTION_ACTION'>(tabId, {
    type: 'EXECUTE_INTERACTION_ACTION',
    payload: { action, index, text },
  });
  logger.info('executeAction:response', { tabId, ok: response.ok, message: response.message });
  return response;
}

export async function clearHighlights(tabId: number): Promise<void> {
  logger.info('clearHighlights', { tabId });
  await sendMessageToTab<'CLEAR_INTERACTION_HIGHLIGHTS'>(tabId, {
    type: 'CLEAR_INTERACTION_HIGHLIGHTS',
  });
}

export async function captureScreenshot(windowId: number): Promise<string> {
  logger.info('captureScreenshot:request', { windowId });
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg' });
  logger.info('captureScreenshot:response', { windowId, dataUrlLength: dataUrl.length });
  return dataUrl;
}

function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('openUrl action received empty URL');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function waitForTabComplete(tabId: number, timeoutMs: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(handleUpdate);
      reject(new Error('Timed out waiting for page load after openUrl'));
    }, timeoutMs);

    const handleUpdate = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (updatedTabId !== tabId) return;
      if (changeInfo.status !== 'complete') return;
      window.clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(handleUpdate);
      resolve();
    };

    chrome.tabs.onUpdated.addListener(handleUpdate);
  });
}

export async function openUrlInTab(tabId: number, url: string): Promise<{ finalUrl: string }> {
  const targetUrl = normalizeUrl(url);
  logger.info('openUrlInTab:request', { tabId, url: targetUrl });
  const updated = await chrome.tabs.update(tabId, { url: targetUrl });
  if (!updated?.id) throw new Error('Failed to update active tab URL');
  await waitForTabComplete(updated.id, 15000);
  const tab = await chrome.tabs.get(updated.id);
  logger.info('openUrlInTab:response', { tabId: updated.id, url: tab.url });
  return { finalUrl: tab.url ?? targetUrl };
}
