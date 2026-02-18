import { onInstalled } from './listeners/onInstalled';
import { onCommand } from './listeners/onCommand';
import { onConnect } from './listeners/onConnect';

chrome.runtime.onInstalled.addListener(onInstalled);
chrome.commands.onCommand.addListener(onCommand);
chrome.runtime.onConnect.addListener(onConnect);
