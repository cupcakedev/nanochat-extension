const MUTED_SITES_KEY = 'nanochat:muted_sites';

interface MutedSite {
  origin: string;
  expiresAt: number;
}

export async function muteSite(url: string, durationMinutes: number = 30): Promise<void> {
  try {
    const origin = new URL(url).origin;
    const mutedSite: MutedSite = {
      origin,
      expiresAt: Date.now() + durationMinutes * 60 * 1000,
    };

    const result = await chrome.storage.local.get(MUTED_SITES_KEY);
    const existing: MutedSite[] = result[MUTED_SITES_KEY] ?? [];
    const filtered = existing.filter((site) => site.expiresAt > Date.now());

    filtered.push(mutedSite);

    await chrome.storage.local.set({ [MUTED_SITES_KEY]: filtered });
  } catch {
  }
}

export async function isSiteMuted(url: string): Promise<boolean> {
  try {
    const origin = new URL(url).origin;

    const result = await chrome.storage.local.get(MUTED_SITES_KEY);
    const sites: MutedSite[] = result[MUTED_SITES_KEY] ?? [];

    const now = Date.now();
    const activeSite = sites.find((site) => site.origin === origin && site.expiresAt > now);

    return Boolean(activeSite);
  } catch {
    return false;
  }
}

export async function clearExpiredMutes(): Promise<void> {
  const result = await chrome.storage.local.get(MUTED_SITES_KEY);
  const sites: MutedSite[] = result[MUTED_SITES_KEY] ?? [];

  const filtered = sites.filter((site) => site.expiresAt > Date.now());

  await chrome.storage.local.set({ [MUTED_SITES_KEY]: filtered });
}