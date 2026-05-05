import { getSidepanelPort } from './onConnect';

interface PendingEntry {
  text: string;
  prompt: string | null;
}

const pendingSelections = new Map<number, PendingEntry>();

function buildPrompt(action: string, text: string, targetLang?: string): string | null {
  const q = `"${text}"`;
  switch (action) {
    case 'translate':
      return `Translate the following text to ${targetLang ?? 'English'}. Output only the translated text:\n\n${q}`;
    case 'summarize':
      return `Summarize the following text concisely:\n\n${q}`;
    case 'rewrite':
      return `Rewrite the following text to improve clarity and flow while keeping the same meaning. Output only the rewritten text:\n\n${q}`;
    case 'spellcheck':
      return `Check the spelling and grammar in the following text. List any errors found and provide the corrected version:\n\n${q}`;
    case 'explain':
      return `Explain the following text in simple, clear terms:\n\n${q}`;
    default:
      return null;
  }
}

export function takePendingSelection(windowId: number): PendingEntry | null {
  const entry = pendingSelections.get(windowId) ?? null;
  pendingSelections.delete(windowId);
  return entry;
}

export const onRuntimeMessage = (
  message: { type: string; text?: string; action?: string; targetLang?: string },
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
): boolean | void => {
  if (message.type !== 'OPEN_WITH_SELECTION' || !message.text || !sender.tab?.windowId) return;

  const windowId = sender.tab.windowId;
  const text = message.text;
  const action = message.action ?? 'ask';
  const prompt = buildPrompt(action, text, message.targetLang);

  const existingPort = getSidepanelPort(windowId);

  if (existingPort) {
    if (prompt) {
      existingPort.postMessage({ type: 'SELECTED_PROMPT', prompt });
    } else {
      existingPort.postMessage({ type: 'SELECTED_TEXT', text });
    }
  } else {
    pendingSelections.set(windowId, { text, prompt });
    chrome.sidePanel.open({ windowId });
  }

  sendResponse({ ok: true });
};
