import { createLogger } from '@shared/utils';
import type { ExtensionMessage, MessageResponseMap, MessageType } from '@shared/types';
import {
  extractInteractionSnapshot,
  executeInteractionAction,
  clearInteractionHighlights,
  setInteractionScrollTop,
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
      if (message.payload?.indicatorBottomOffset != null) {
        setAgentIndicatorBottomOffset(message.payload.indicatorBottomOffset);
      }
      if (message.payload?.showIndicator !== false) {
        pulseAgentConnectionIndicator();
      }
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
          message.payload?.viewportSegments,
        ),
      );
      return;

    case 'SET_INTERACTION_SCROLL':
      sendResponse({ top: setInteractionScrollTop(message.payload.top) });
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

    case 'GET_IFRAME_RECTS': {
      const iframes: Array<{
        url: string;
        rect: { x: number; y: number; width: number; height: number };
      }> = [];
      document.querySelectorAll('iframe').forEach((iframe) => {
        const rect = iframe.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          iframes.push({
            url: iframe.src || '',
            rect: {
              x: Math.round(rect.left),
              y: Math.round(rect.top),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          });
        }
      });
      sendResponse({ iframes });
      return;
    }
  }
};

chrome.runtime.onMessage.addListener(handleMessage);

logger.info('Content script loaded');
