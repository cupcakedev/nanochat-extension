import { useEffect, useRef } from 'react';

export function useTabChangeListener(
  enabled: boolean,
  onTabChange: () => void,
) {
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const onTabChangeRef = useRef(onTabChange);
  onTabChangeRef.current = onTabChange;

  useEffect(() => {
    const handleTabUpdated = (_tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'complete' && enabledRef.current) {
        onTabChangeRef.current();
      }
    };

    const handleTabActivated = () => {
      if (enabledRef.current) {
        onTabChangeRef.current();
      }
    };

    chrome.tabs.onUpdated.addListener(handleTabUpdated);
    chrome.tabs.onActivated.addListener(handleTabActivated);

    return () => {
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      chrome.tabs.onActivated.removeListener(handleTabActivated);
    };
  }, []);
}
