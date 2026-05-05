import { useEffect, useRef } from 'react';

export function useSidepanelConnection(onSelectedText?: (text: string) => void) {
  const onSelectedTextRef = useRef(onSelectedText);
  onSelectedTextRef.current = onSelectedText;

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

      port.onMessage.addListener((msg: { type: string; text?: string }) => {
        if (msg.type === 'CLOSE') {
          window.close();
        } else if (msg.type === 'SELECTED_TEXT' && msg.text) {
          onSelectedTextRef.current?.(msg.text);
        }
      });
    };

    void setup();

    return () => {
      port?.disconnect();
    };
  }, []);
}
