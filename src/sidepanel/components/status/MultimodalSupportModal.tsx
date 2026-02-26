import { memo } from 'react';

interface MultimodalSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MULTIMODAL_FLAG_URL = 'chrome://flags/#prompt-api-for-gemini-nano-multimodal-input';

function openMultimodalFlag() {
  chrome.tabs.create({ url: MULTIMODAL_FLAG_URL });
}

export const MultimodalSupportModal = memo(({ isOpen, onClose }: MultimodalSupportModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-[320px] rounded-[16px] border border-white/10 bg-neutral-100/95 backdrop-blur-xl overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-3">
            <h3 className="text-sm font-semibold text-neutral-800">Image Input Is Disabled</h3>
            <p className="text-xs text-neutral-600 leading-relaxed">
              To use image attachments, enable Chrome flag
              <span className="font-medium"> Prompt API for Gemini Nano multimodal input</span>.
            </p>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Set it to <span className="font-medium">Enabled</span> and relaunch Chrome.
            </p>
          </div>

          <div className="px-5 pb-5 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="text-xs text-neutral-500 hover:text-neutral-700 px-3 py-2 rounded-[10px]
                hover:bg-neutral-200/40 transition-all duration-200"
            >
              Close
            </button>
            <button
              onClick={openMultimodalFlag}
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

MultimodalSupportModal.displayName = 'MultimodalSupportModal';
