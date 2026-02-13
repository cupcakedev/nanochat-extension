import { createLogger } from '@shared/utils';
import { sendMessageToTab } from '@shared/messaging';
import type { InteractionSnapshotPayload, ExecuteActionResponse, InteractionActionType } from '@shared/types';

const logger = createLogger('tab-bridge');

export interface ActiveTab {
  tabId: number;
  windowId: number;
  url: string;
  title: string;
  favIconUrl: string;
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
  options?: { maxElements?: number; viewportOnly?: boolean },
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

export async function executeAction(
  tabId: number,
  action: InteractionActionType,
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
  const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: 'png' });
  logger.info('captureScreenshot:response', { windowId, dataUrlLength: dataUrl.length });
  return dataUrl;
}
