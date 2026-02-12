import {onInstalled} from './listeners/onInstalled';

chrome.runtime.onInstalled.addListener(onInstalled);
