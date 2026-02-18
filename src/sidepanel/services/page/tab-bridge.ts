import { createLogger } from '@shared/utils';
import { sendMessageToTab, sendMessageToFrame } from '@shared/messaging';
import type {
  InteractionSnapshotPayload,
  InteractiveElementSnapshotItem,
  InteractionRect,
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

export async function waitForTabSettled(
  tabId: number,
  options?: WaitForTabSettledOptions,
): Promise<void> {
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

export async function getTabById(tabId: number): Promise<ActiveTab> {
  const tab = await chrome.tabs.get(tabId);
  return {
    tabId: tab.id!,
    windowId: tab.windowId,
    url: tab.url ?? '',
    title: tab.title ?? '',
    favIconUrl: tab.favIconUrl ?? '',
  };
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
  const response = await sendMessageToFrame<'GET_PAGE_CONTENT'>(tabId, 0, {
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
  await sendMessageToFrame<'SET_AGENT_INDICATOR_POSITION'>(tabId, 0, {
    type: 'SET_AGENT_INDICATOR_POSITION',
    payload: { bottomOffset },
  });
}

interface FrameIndexEntry {
  frameId: number;
  localIndex: number;
}

let frameIndexMap = new Map<number, FrameIndexEntry>();

function clearFrameIndexMap(): void {
  frameIndexMap = new Map();
}

interface FrameInfo {
  frameId: number;
  parentFrameId: number;
  url: string;
}

async function getAllFrames(tabId: number): Promise<FrameInfo[]> {
  try {
    const frames = await chrome.webNavigation.getAllFrames({ tabId });
    return (frames ?? []).map((f) => ({
      frameId: f.frameId,
      parentFrameId: f.parentFrameId,
      url: f.url,
    }));
  } catch {
    return [{ frameId: 0, parentFrameId: -1, url: '' }];
  }
}

async function getIframeRectsFromFrame(
  tabId: number,
  frameId: number,
): Promise<Array<{ url: string; rect: InteractionRect }>> {
  try {
    const response = await sendMessageToFrame<'GET_IFRAME_RECTS'>(tabId, frameId, {
      type: 'GET_IFRAME_RECTS',
    });
    return response.iframes;
  } catch {
    return [];
  }
}

async function getFrameSnapshot(
  tabId: number,
  frameId: number,
  options?: { maxElements?: number; viewportOnly?: boolean; viewportSegments?: number },
): Promise<InteractionSnapshotPayload | null> {
  try {
    return await sendMessageToFrame<'GET_INTERACTION_SNAPSHOT'>(tabId, frameId, {
      type: 'GET_INTERACTION_SNAPSHOT',
      payload: options,
    });
  } catch {
    return null;
  }
}

function computeFrameOffsets(
  frames: FrameInfo[],
  iframeRectsByParent: Map<number, Array<{ url: string; rect: InteractionRect }>>,
): Map<number, { x: number; y: number }> {
  const offsets = new Map<number, { x: number; y: number }>();
  offsets.set(0, { x: 0, y: 0 });

  const childrenByParent = new Map<number, FrameInfo[]>();
  for (const frame of frames) {
    if (frame.frameId === 0) continue;
    const siblings = childrenByParent.get(frame.parentFrameId) ?? [];
    siblings.push(frame);
    childrenByParent.set(frame.parentFrameId, siblings);
  }

  const queue = [0];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    const parentOffset = offsets.get(parentId) ?? { x: 0, y: 0 };
    const children = childrenByParent.get(parentId) ?? [];
    const parentRects = iframeRectsByParent.get(parentId) ?? [];
    const usedRectIndices = new Set<number>();

    for (const child of children) {
      let matchIdx = -1;
      for (let i = 0; i < parentRects.length; i++) {
        if (usedRectIndices.has(i)) continue;
        if (normalizeFrameUrl(parentRects[i].url) === normalizeFrameUrl(child.url)) {
          matchIdx = i;
          break;
        }
      }
      if (matchIdx >= 0) {
        usedRectIndices.add(matchIdx);
        const rect = parentRects[matchIdx].rect;
        offsets.set(child.frameId, { x: parentOffset.x + rect.x, y: parentOffset.y + rect.y });
      }
      queue.push(child.frameId);
    }
  }

  return offsets;
}

function normalizeFrameUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url;
  }
}

function offsetElements(
  elements: InteractiveElementSnapshotItem[],
  offset: { x: number; y: number },
  globalIndexStart: number,
  frameId: number,
): InteractiveElementSnapshotItem[] {
  return elements.map((el, i) => {
    const globalIndex = globalIndexStart + i;
    frameIndexMap.set(globalIndex, { frameId, localIndex: el.index });
    return {
      ...el,
      index: globalIndex,
      rect: {
        x: el.rect.x + offset.x,
        y: el.rect.y + offset.y,
        width: el.rect.width,
        height: el.rect.height,
      },
    };
  });
}

export async function getInteractionSnapshot(
  tabId: number,
  options?: { maxElements?: number; viewportOnly?: boolean; viewportSegments?: number },
): Promise<InteractionSnapshotPayload> {
  logger.info('getInteractionSnapshot:request', { tabId, ...options });
  clearFrameIndexMap();

  const frames = await getAllFrames(tabId);
  const childFrames = frames.filter((f) => f.frameId !== 0);

  const mainSnapshot = await getFrameSnapshot(tabId, 0, options);
  if (!mainSnapshot) throw new Error('Failed to get interaction snapshot from main frame');

  if (childFrames.length === 0) {
    mainSnapshot.interactiveElements.forEach((el) => {
      frameIndexMap.set(el.index, { frameId: 0, localIndex: el.index });
    });
    logger.info('getInteractionSnapshot:response', {
      tabId,
      elementCount: mainSnapshot.interactiveElements.length,
      pageUrl: mainSnapshot.pageUrl,
      frames: 1,
    });
    return mainSnapshot;
  }

  const parentFrameIds = new Set(childFrames.map((f) => f.parentFrameId));
  const iframeRectsByParent = new Map<number, Array<{ url: string; rect: InteractionRect }>>();
  await Promise.all(
    [...parentFrameIds].map(async (parentId) => {
      const rects = await getIframeRectsFromFrame(tabId, parentId);
      iframeRectsByParent.set(parentId, rects);
    }),
  );

  const offsets = computeFrameOffsets(frames, iframeRectsByParent);

  const maxPerFrame = Math.max(
    6,
    Math.floor((options?.maxElements ?? 50) / (childFrames.length + 1)),
  );
  const childSnapshots = await Promise.all(
    childFrames.map(async (frame) => {
      const offset = offsets.get(frame.frameId);
      if (!offset) return null;
      const snap = await getFrameSnapshot(tabId, frame.frameId, {
        ...options,
        maxElements: maxPerFrame,
      });
      if (!snap || snap.interactiveElements.length === 0) return null;
      return { snapshot: snap, frameId: frame.frameId, offset };
    }),
  );

  let globalIndex = 1;
  const allElements: InteractiveElementSnapshotItem[] = [];

  const mainOffset = { x: 0, y: 0 };
  const mainElements = offsetElements(mainSnapshot.interactiveElements, mainOffset, globalIndex, 0);
  allElements.push(...mainElements);
  globalIndex += mainElements.length;

  for (const child of childSnapshots) {
    if (!child) continue;
    const childElements = offsetElements(
      child.snapshot.interactiveElements,
      child.offset,
      globalIndex,
      child.frameId,
    );
    allElements.push(...childElements);
    globalIndex += childElements.length;
  }

  const merged: InteractionSnapshotPayload = {
    ...mainSnapshot,
    interactiveElements: allElements,
  };

  logger.info('getInteractionSnapshot:response', {
    tabId,
    elementCount: allElements.length,
    pageUrl: merged.pageUrl,
    frames: 1 + childSnapshots.filter(Boolean).length,
  });
  return merged;
}

export async function setInteractionScroll(tabId: number, top: number): Promise<number> {
  logger.info('setInteractionScroll:request', { tabId, top });
  const response = await sendMessageToFrame<'SET_INTERACTION_SCROLL'>(tabId, 0, {
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
  const entry = frameIndexMap.get(index);
  const frameId = entry?.frameId ?? 0;
  const localIndex = entry?.localIndex ?? index;
  logger.info('executeAction:request', {
    tabId,
    action,
    index,
    frameId,
    localIndex,
    textLength: text?.length ?? 0,
  });
  const response = await sendMessageToFrame<'EXECUTE_INTERACTION_ACTION'>(tabId, frameId, {
    type: 'EXECUTE_INTERACTION_ACTION',
    payload: { action, index: localIndex, text },
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

function waitForTabComplete(
  tabId: number,
  timeoutMs: number,
  contextLabel = 'openUrl',
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(handleUpdate);
      reject(new Error(`Timed out waiting for page load after ${contextLabel}`));
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

async function updateTabUrlAndWait(
  tabId: number,
  targetUrl: string,
  contextLabel: string,
): Promise<{ finalUrl: string }> {
  const updated = await chrome.tabs.update(tabId, { url: targetUrl });
  if (!updated?.id) throw new Error('Failed to update active tab URL');
  await waitForTabComplete(updated.id, 15000, contextLabel);
  const tab = await chrome.tabs.get(updated.id);
  return { finalUrl: tab.url ?? targetUrl };
}

export async function openUrlInTab(tabId: number, url: string): Promise<{ finalUrl: string }> {
  const targetUrl = normalizeUrl(url);
  logger.info('openUrlInTab:request', { tabId, url: targetUrl });
  const result = await updateTabUrlAndWait(tabId, targetUrl, 'openUrl');
  logger.info('openUrlInTab:response', { tabId, url: result.finalUrl });
  return result;
}

export async function openExtensionPageInTab(
  tabId: number,
  pagePath: string,
): Promise<{ finalUrl: string }> {
  const normalizedPath = pagePath.trim().replace(/^\/+/, '');
  if (!normalizedPath) throw new Error('openExtensionPageInTab received empty pagePath');
  const targetUrl = chrome.runtime.getURL(normalizedPath);
  logger.info('openExtensionPageInTab:request', { tabId, url: targetUrl });
  const result = await updateTabUrlAndWait(tabId, targetUrl, 'openExtensionPage');
  logger.info('openExtensionPageInTab:response', { tabId, url: result.finalUrl });
  return result;
}
