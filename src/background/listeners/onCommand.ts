import { getSidepanelPort } from './onConnect';

export const onCommand = (command: string, tab?: chrome.tabs.Tab) => {
  if (command !== 'open-sidepanel') return;
  if (!tab?.windowId) return;

  const port = getSidepanelPort(tab.windowId);
  if (port) {
    port.postMessage({ type: 'CLOSE' });
  } else {
    chrome.sidePanel.open({ windowId: tab.windowId });
  }
};
