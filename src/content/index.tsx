import {createLogger} from '@shared/utils';
import type {ExtensionMessage, MessageResponseMap, MessageType} from '@shared/types';

const logger = createLogger('content');

type MessageHandler = (
	message: ExtensionMessage,
	sender: chrome.runtime.MessageSender,
	sendResponse: (response: MessageResponseMap[MessageType]) => void
) => boolean | void;

const handleMessage: MessageHandler = (message, _sender, sendResponse) => {
	switch (message.type) {
		case 'PING':
			sendResponse({pong: true});
			return;
		case 'GET_PAGE_CONTENT':
			sendResponse({content: document.body.innerText});
			return;
	}
};

chrome.runtime.onMessage.addListener(handleMessage);

logger.info('Content script loaded');
