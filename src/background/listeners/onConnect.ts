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
    }
  });

  port.onDisconnect.addListener(() => {
    if (windowId !== undefined) {
      sidepanelPorts.delete(windowId);
    }
  });
};
