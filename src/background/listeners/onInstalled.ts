import { createLogger } from '@shared/utils';

const logger = createLogger('background:onInstalled');

const enableSidePanel = () => {
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
};

export const onInstalled = (details: chrome.runtime.InstalledDetails) => {
	logger.info(`Extension installed: ${details.reason}`);
	enableSidePanel();
};
