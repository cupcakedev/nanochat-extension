import { memo } from 'react';
import { DownloadIcon } from '@sidepanel/components/icons/DownloadIcon';
import { Logo } from '@sidepanel/components/ui/Logo';

interface DownloadPromptProps {
  onDownload: () => void;
}

export const DownloadPrompt = memo(({ onDownload }: DownloadPromptProps) => (
  <div className="w-full max-w-[320px] flex flex-col items-center text-center">
    <div className="mb-5">
      <Logo size={64} />
    </div>

    <h2 className="text-lg font-semibold text-neutral-800">NanoChat</h2>
    <p className="mt-2.5 text-sm text-neutral-500 leading-relaxed max-w-[280px]">
      NanoChat uses a local AI model that runs entirely on your device. No data is sent to the
      cloud.
    </p>

    <div className="mt-6 w-full text-left bg-neutral-100/50 rounded-2xl p-4 border border-neutral-200/50">
      <h3 className="text-xs font-semibold text-neutral-800 mb-2">System Requirements</h3>
      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-500 mt-0.5 min-w-[24px]">
            GPU
          </span>
          <span className="text-xs text-neutral-600">Strictly more than 4 GB of VRAM</span>
        </div>

        <div className="flex items-center gap-2 py-1">
          <div className="h-px bg-neutral-200 flex-1"></div>
          <span className="text-[10px] font-medium text-neutral-400 uppercase">OR</span>
          <div className="h-px bg-neutral-200 flex-1"></div>
        </div>

        <div className="flex items-start gap-2">
          <span className="text-[10px] uppercase font-bold text-neutral-500 mt-0.5 min-w-[24px]">
            CPU
          </span>
          <span className="text-xs text-neutral-600">16 GB of RAM and 4 CPU cores or more</span>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-neutral-200/50">
        <p className="text-[11px] text-amber-600 leading-snug">
          Note: Generation may be very slow on weak hardware.
        </p>
      </div>
    </div>

    <button
      onClick={onDownload}
      className="mt-5 w-full py-3 rounded-[16px] bg-brand-500 text-white text-sm font-medium
        border border-brand-400/20 backdrop-blur-md flex items-center justify-center gap-2
        transition-all duration-200 hover:bg-brand-600 active:scale-[0.98]"
    >
      <DownloadIcon size={20} className="text-white" />
      Download ~4GB Model
    </button>
  </div>
));

DownloadPrompt.displayName = 'DownloadPrompt';
