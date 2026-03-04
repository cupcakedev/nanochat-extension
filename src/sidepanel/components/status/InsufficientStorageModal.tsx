import { memo } from 'react';

interface InsufficientStorageModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InsufficientStorageModal = memo(
  ({ isOpen, onClose }: InsufficientStorageModalProps) => {
    if (!isOpen) return null;

    return (
      <>
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto w-[320px] rounded-[16px] border border-white/10 bg-neutral-100/95 backdrop-blur-xl overflow-hidden">
            <div className="px-5 pt-5 pb-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-800">Not Enough Disk Space</h3>
              <p className="text-xs text-neutral-600 leading-relaxed">
                Your device does not have enough free space to download the on-device model.
              </p>
              <p className="text-[11px] text-neutral-500 leading-relaxed">
                Free up storage and try again.
              </p>
            </div>

            <div className="px-5 pb-5 flex items-center justify-end">
              <button
                onClick={onClose}
                className="text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 px-4 py-2
                rounded-[10px] transition-all duration-200"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </>
    );
  },
);

InsufficientStorageModal.displayName = 'InsufficientStorageModal';
