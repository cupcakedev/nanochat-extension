import { getSidepanelPort } from './onConnect';

const pendingSelections = new Map<number, string>();

export function takePendingSelection(windowId: number): string | null {
  const text = pendingSelections.get(windowId) ?? null;
  pendingSelections.delete(windowId);
  return text;
}

export const onRuntimeMessage = (
  message: { type: string; text?: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): boolean | void => {
  if (message.type !== 'OPEN_WITH_SELECTION' || !message.text || !sender.tab?.windowId) return;

  const windowId = sender.tab.windowId;
  const existingPort = getSidepanelPort(windowId);

  if (existingPort) {
    existingPort.postMessage({ type: 'SELECTED_TEXT', text: message.text });
  } else {
    pendingSelections.set(windowId, message.text);
    chrome.sidePanel.open({ windowId });
  }

  sendResponse({ ok: true });
};
