import { ChatMode } from '@sidepanel/types/mode';

const PREFERRED_MODE_KEY = 'nanochat:preferred-mode';

export function readPreferredMode(): ChatMode {
  try {
    const stored = localStorage.getItem(PREFERRED_MODE_KEY);
    if (stored === ChatMode.Agent) return ChatMode.Agent;
    return ChatMode.Chat;
  } catch {
    return ChatMode.Chat;
  }
}

export function writePreferredMode(mode: ChatMode): void {
  try {
    localStorage.setItem(PREFERRED_MODE_KEY, mode);
  } catch {
    //
  }
}
