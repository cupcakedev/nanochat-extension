import { useEffect } from 'react';

export function useSidepanelConnection() {
  useEffect(() => {
    let port: chrome.runtime.Port | null = null;

    const setup = async () => {
      const tab = await chrome.tabs.getCurrent();
      if (tab !== undefined) return;

      port = chrome.runtime.connect({ name: 'sidepanel' });

      const win = await chrome.windows.getCurrent();
      if (win.id !== undefined) {
        port.postMessage({ type: 'INIT', windowId: win.id });
      }

      port.onMessage.addListener((msg: { type: string }) => {
        if (msg.type === 'CLOSE') {
          window.close();
        }
      });
    };

    void setup();

    return () => {
      port?.disconnect();
    };
  }, []);
}
