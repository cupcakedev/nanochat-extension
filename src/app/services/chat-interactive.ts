import type { RefObject } from 'react';
import {
  extractErrorMessage,
  setAssistantCompletion,
  toContextUsage,
  type ContextUsage,
} from '@app/services/chat-message-utils';
import {
  shouldEnableDevTrace,
  toLineTraceItem,
  toScreenshotTraceItem,
  appendTraceItem,
} from '@app/services/chat-dev-trace';
import {
  extractInteractionUsage,
  formatInteractionAssistantMessage,
  runPageInteractionStep,
  type InteractionProgressEvent,
} from '@app/services/page-interaction';
import type { DevTraceItem } from '@app/types/dev-trace';
import type { ChatMode } from '@app/types/mode';
import type { ChatMessage, PageSource } from '@shared/types';

export interface InteractiveRefs {
  messagesRef: RefObject<ChatMessage[]>;
  pageSourceRef: RefObject<PageSource | null | undefined>;
}

export interface InteractiveSetters {
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  setStreaming: (v: boolean) => void;
  setDevTraceItems: (updater: DevTraceItem[] | ((prev: DevTraceItem[]) => DevTraceItem[])) => void;
  setContextUsage: (v: ContextUsage | null) => void;
  setChatContextChipSourceOverride: (v: PageSource | null | undefined) => void;
  onMessagesChange?: (
    messages: ChatMessage[],
    contextUsage?: { used: number; total: number },
    pageSource?: PageSource | null,
  ) => void;
}

function createProgressHandler(
  enabled: boolean,
  setDevTraceItems: InteractiveSetters['setDevTraceItems'],
): ((event: InteractionProgressEvent) => void) | undefined {
  if (!enabled) return undefined;
  return (event: InteractionProgressEvent) => {
    if (event.type === 'line') {
      setDevTraceItems((prev) => appendTraceItem(prev as DevTraceItem[], toLineTraceItem(event.line)));
      return;
    }
    setDevTraceItems((prev) => appendTraceItem(prev as DevTraceItem[], toScreenshotTraceItem(event)));
  };
}

export async function executeInteractiveStep(
  text: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  mode: ChatMode,
  refs: InteractiveRefs,
  setters: InteractiveSetters,
): Promise<void> {
  setters.setChatContextChipSourceOverride(undefined);
  const isDevTraceEnabled = shouldEnableDevTrace(mode);
  const baseMessages = [...refs.messagesRef.current, userMessage, assistantMessage];
  const onProgress = createProgressHandler(isDevTraceEnabled, setters.setDevTraceItems);

  setters.setDevTraceItems([]);
  setters.setMessages((prev) => [...prev, userMessage, assistantMessage]);
  setters.setStreaming(true);

  try {
    const result = await runPageInteractionStep(text, onProgress ? { onProgress } : undefined);
    const usage = extractInteractionUsage(result);
    const completedMessages = setAssistantCompletion(
      baseMessages,
      formatInteractionAssistantMessage(result),
      [result.screenshotDataUrl],
    );
    setters.setMessages(completedMessages);
    setters.setContextUsage(usage ? toContextUsage(usage) : null);
    setters.onMessagesChange?.(completedMessages, usage, refs.pageSourceRef.current ?? undefined);
  } catch (error) {
    if (isDevTraceEnabled) {
      setters.setDevTraceItems((prev) =>
        appendTraceItem(prev as DevTraceItem[], toLineTraceItem(`[error] ${extractErrorMessage(error)}`)),
      );
    }
    const completedMessages = setAssistantCompletion(
      [...refs.messagesRef.current, userMessage, assistantMessage],
      `Error: ${extractErrorMessage(error)}`,
    );
    setters.setMessages(completedMessages);
    setters.setContextUsage(null);
    setters.onMessagesChange?.(completedMessages, undefined, refs.pageSourceRef.current ?? undefined);
  } finally {
    setters.setStreaming(false);
  }
}
