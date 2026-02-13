import { createLogger } from '@shared/utils';
import type { ExtensionMessage, MessageResponseMap, MessageType } from '@shared/types';
import {
  extractInteractionSnapshot,
  executeInteractionAction,
  clearInteractionHighlights,
} from './services/page-interaction';
import {
  pulseAgentConnectionIndicator,
  setAgentIndicatorBottomOffset,
} from './services/agent-connection-indicator';

const logger = createLogger('content');

type MessageHandler = (
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponseMap[MessageType]) => void,
) => boolean | void;

const handleMessage: MessageHandler = (message, _sender, sendResponse) => {
  switch (message.type) {
    case 'PING':
      sendResponse({ pong: true });
      return;

    case 'GET_PAGE_CONTENT': {
      pulseAgentConnectionIndicator();
      const content = document.body.innerText || document.body.textContent || '';
      logger.info('GET_PAGE_CONTENT', {
        innerTextLength: document.body.innerText?.length ?? 0,
        textContentLength: document.body.textContent?.length ?? 0,
        usedLength: content.length,
        preview: content.slice(0, 100),
      });
      sendResponse({ content });
      return;
    }

    case 'SET_AGENT_INDICATOR_POSITION':
      setAgentIndicatorBottomOffset(message.payload.bottomOffset);
      sendResponse({ ok: true });
      return;

    case 'GET_INTERACTION_SNAPSHOT':
      sendResponse(
        extractInteractionSnapshot(
          message.payload?.maxElements,
          message.payload?.viewportOnly,
        ),
      );
      return;

    case 'EXECUTE_INTERACTION_ACTION':
      sendResponse(
        executeInteractionAction(
          message.payload.action,
          message.payload.index,
          message.payload.text,
        ),
      );
      return;

    case 'CLEAR_INTERACTION_HIGHLIGHTS':
      clearInteractionHighlights();
      sendResponse({ cleared: true });
      return;
  }
};

chrome.runtime.onMessage.addListener(handleMessage);

logger.info('Content script loaded');
