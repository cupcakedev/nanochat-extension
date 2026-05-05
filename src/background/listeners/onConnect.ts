import { consumeStoredChatSeed, takePendingSelection } from './onRuntimeMessage';

const sidepanelPorts = new Map<number, chrome.runtime.Port>();

export function getSidepanelPort(windowId: number): chrome.runtime.Port | undefined {
  return sidepanelPorts.get(windowId);
}

export const onConnect = (port: chrome.runtime.Port) => {
  if (port.name !== 'sidepanel') return;

  let windowId: number | undefined;

  port.onMessage.addListener((msg: { type: string; windowId?: number }) => {
    if (msg.type === 'INIT' && typeof msg.windowId === 'number') {
      windowId = msg.windowId;
      sidepanelPorts.set(windowId, port);

      const pending = takePendingSelection(windowId);
      if (pending) {
        if (pending.chatSeed) {
          port.postMessage({ type: 'SELECTED_CHAT_SEED', chatSeed: pending.chatSeed });
        } else if (pending.prompt) {
          port.postMessage({ type: 'SELECTED_PROMPT', prompt: pending.prompt });
        } else {
          port.postMessage({ type: 'SELECTED_TEXT', text: pending.text });
        }
      }

      void consumeStoredChatSeed(windowId).then((chatSeed) => {
        if (!chatSeed) return;
        port.postMessage({ type: 'SELECTED_CHAT_SEED', chatSeed });
      });
    }
  });

  port.onDisconnect.addListener(() => {
    if (windowId !== undefined) {
      sidepanelPorts.delete(windowId);
    }
  });
};
