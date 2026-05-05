import { onInstalled } from './listeners/onInstalled';
import { onCommand } from './listeners/onCommand';
import { onConnect } from './listeners/onConnect';
import { onRuntimeMessage } from './listeners/onRuntimeMessage';
import { onInferenceConnect } from './listeners/onInferenceConnect';

chrome.runtime.onInstalled.addListener(onInstalled);
chrome.commands.onCommand.addListener(onCommand);
chrome.runtime.onConnect.addListener(onConnect);
chrome.runtime.onConnect.addListener(onInferenceConnect);
chrome.runtime.onMessage.addListener(onRuntimeMessage);
