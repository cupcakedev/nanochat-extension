import { memo } from 'react';

interface ModelSupportModalProps {
  isOpen: boolean;
  onRetry: () => void;
}

const PROMPT_API_FLAG_URL = 'chrome://flags/#prompt-api-for-gemini-nano';

function openPromptApiFlag() {
  chrome.tabs.create({ url: PROMPT_API_FLAG_URL });
}

export const ModelSupportModal = memo(({ isOpen, onRetry }: ModelSupportModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" />
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-[320px] rounded-[16px] border border-white/10 bg-neutral-100/95 backdrop-blur-xl overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-800">Gemini Nano Is Unavailable</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Enable Prompt API in Chrome to continue.
            </p>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Open Flag. Set <span className="font-medium">Enabled</span> and{' '}
              <span className="font-medium">Relaunch Chrome</span>.
            </p>
          </div>

          <div className="px-5 pb-5 flex items-center justify-end gap-2">
            <button
              onClick={onRetry}
              className="text-xs text-neutral-500 hover:text-neutral-700 px-3 py-2 rounded-[10px]
                hover:bg-neutral-200/40 transition-all duration-200"
            >
              Retry
            </button>
            <button
              onClick={openPromptApiFlag}
              className="text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 px-3 py-2
                rounded-[10px] transition-all duration-200"
            >
              Open Flag
            </button>
          </div>
        </div>
      </div>
    </>
  );
});

ModelSupportModal.displayName = 'ModelSupportModal';
