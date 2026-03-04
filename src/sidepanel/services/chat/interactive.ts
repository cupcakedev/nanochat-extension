import type { InteractiveRefs, InteractiveSetters } from '@sidepanel/types/execution';
import {
  extractErrorMessage,
  isMultimodalInputUnsupportedError,
  setAssistantCompletion,
  toContextUsage,
} from '@sidepanel/services/chat/message-utils';
import {
  shouldEnableDevTrace,
  toLineTraceItem,
  toScreenshotTraceItem,
  appendTraceItem,
} from '@sidepanel/services/chat/dev-trace';
import {
  extractInteractionUsage,
  formatInteractionAssistantMessage,
  runPageInteractionStep,
  type InteractionProgressEvent,
} from '@sidepanel/services/page/interaction';
import type { DevTraceItem } from '@sidepanel/types/dev-trace';
import type { ChatMode } from '@sidepanel/types/mode';
import type { ChatMessage } from '@shared/types';

function isAbortError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.name === 'AbortError') return true;
  return /aborted|cancelled/i.test(error.message);
}

function createProgressHandler(
  enabled: boolean,
  setDevTraceItems: InteractiveSetters['setDevTraceItems'],
): ((event: InteractionProgressEvent) => void) | undefined {
  if (!enabled) return undefined;
  return (event: InteractionProgressEvent) => {
    if (event.type === 'line') {
      setDevTraceItems((prev) =>
        appendTraceItem(prev as DevTraceItem[], toLineTraceItem(event.line)),
      );
      return;
    }
    setDevTraceItems((prev) =>
      appendTraceItem(prev as DevTraceItem[], toScreenshotTraceItem(event)),
    );
  };
}

export async function executeInteractiveStep(
  text: string,
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  mode: ChatMode,
  refs: InteractiveRefs,
  setters: InteractiveSetters,
  signal?: AbortSignal,
): Promise<void> {
  setters.setChatContextChipSourceOverride(undefined);
  const isDevTraceEnabled = shouldEnableDevTrace(mode);
  const baseMessages = [...refs.messagesRef.current, userMessage, assistantMessage];
  const onProgress = createProgressHandler(isDevTraceEnabled, setters.setDevTraceItems);

  setters.setDevTraceItems([]);
  setters.setMessages((prev) => [...prev, userMessage, assistantMessage]);
  setters.setStreaming(true);

  try {
    const result = await runPageInteractionStep(
      text,
      onProgress || signal
        ? {
            ...(onProgress ? { onProgress } : {}),
            ...(signal ? { signal } : {}),
          }
        : undefined,
    );
    const usage = extractInteractionUsage(result);
    const completedMessages = setAssistantCompletion(
      baseMessages,
      formatInteractionAssistantMessage(result),
    );
    setters.setMessages(completedMessages);
    setters.setContextUsage(usage ? toContextUsage(usage) : null);
    setters.onMessagesChange?.(completedMessages, usage, refs.pageSourceRef.current ?? undefined);
  } catch (error) {
    if (isAbortError(error)) {
      if (isDevTraceEnabled) {
        setters.setDevTraceItems((prev) =>
          appendTraceItem(
            prev as DevTraceItem[],
            toLineTraceItem('[stopped] User interrupted agent run'),
          ),
        );
      }
      const completedMessages = setAssistantCompletion(baseMessages, 'Stopped.');
      setters.setMessages(completedMessages);
      setters.setContextUsage(null);
      setters.onMessagesChange?.(
        completedMessages,
        undefined,
        refs.pageSourceRef.current ?? undefined,
      );
      return;
    }

    if (isDevTraceEnabled) {
      setters.setDevTraceItems((prev) =>
        appendTraceItem(
          prev as DevTraceItem[],
          toLineTraceItem(`[error] ${extractErrorMessage(error)}`),
        ),
      );
    }

    const errorMessage = extractErrorMessage(error);
    if (isMultimodalInputUnsupportedError(error)) {
      setters.onMultimodalInputUnsupported?.(errorMessage);
      const completedMessages = setAssistantCompletion(
        baseMessages,
        'Image input is unavailable in this Chrome profile. Enable the multimodal Prompt API flag and relaunch Chrome.',
      );
      setters.setMessages(completedMessages);
      setters.setContextUsage(null);
      setters.onMessagesChange?.(
        completedMessages,
        undefined,
        refs.pageSourceRef.current ?? undefined,
      );
      return;
    }

    const completedMessages = setAssistantCompletion(baseMessages, `Error: ${errorMessage}`);
    setters.setMessages(completedMessages);
    setters.setContextUsage(null);
    setters.onMessagesChange?.(
      completedMessages,
      undefined,
      refs.pageSourceRef.current ?? undefined,
    );
  } finally {
    setters.setStreaming(false);
  }
}
