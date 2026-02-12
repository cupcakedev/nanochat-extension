import type { ExtensionMessage, MessageResponseMap, MessageType } from '@shared/types';

export const sendMessageToTab = <T extends MessageType>(
	tabId: number,
	message: Extract<ExtensionMessage, { type: T }>,
): Promise<MessageResponseMap[T]> => chrome.tabs.sendMessage(tabId, message);

export const sendMessageToBackground = <T extends MessageType>(
	message: Extract<ExtensionMessage, { type: T }>,
): Promise<MessageResponseMap[T]> => chrome.runtime.sendMessage(message);
