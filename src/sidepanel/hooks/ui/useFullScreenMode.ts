import { useState, useEffect } from 'react';

export function useFullScreenMode(): boolean {
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    chrome.tabs.getCurrent().then((tab) => {
      setIsFullScreen(tab !== undefined);
    });
  }, []);

  return isFullScreen;
}
