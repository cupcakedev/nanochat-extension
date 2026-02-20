import { memo, useEffect, useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function openShortcutsPage() {
  chrome.tabs.create({ url: 'chrome://extensions/shortcuts' });
}

function parseShortcut(shortcut: string): string[] {
  if (shortcut.includes('+')) {
    return shortcut.split('+').filter(Boolean);
  }
  return [...shortcut];
}

export const SettingsModal = memo(({ isOpen, onClose }: SettingsModalProps) => {
  const [shortcut, setShortcut] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    chrome.commands.getAll().then((commands) => {
      const cmd = commands.find((c) => c.name === 'open-sidepanel');
      setShortcut(cmd?.shortcut ?? '');
    });
  }, [isOpen]);

  if (!isOpen) return null;

  const keys = shortcut ? parseShortcut(shortcut) : null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-[280px] rounded-[16px] border border-white/10 bg-neutral-100/95 backdrop-blur-xl overflow-hidden">
          <div className="px-5 pt-5 pb-5 space-y-4">
            <h3 className="text-sm font-semibold text-neutral-800">Settings</h3>

            <div className="space-y-2.5">
              <p className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                Open / close shortcut
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  {keys ? (
                    keys.map((key) => (
                      <kbd
                        key={key}
                        className="inline-flex items-center px-2 py-1 rounded-[6px] text-[11px] font-mono
                          bg-neutral-200 border border-neutral-300/40 text-neutral-600 leading-none"
                      >
                        {key}
                      </kbd>
                    ))
                  ) : (
                    <span className="text-xs text-neutral-500">Not set</span>
                  )}
                </div>
                <button
                  onClick={openShortcutsPage}
                  className="shrink-0 text-[11px] text-neutral-500 hover:text-neutral-700
                    px-2.5 py-1 rounded-[8px] hover:bg-neutral-200/20 transition-all duration-200"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

SettingsModal.displayName = 'SettingsModal';
