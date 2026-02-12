import { memo } from 'react';
import { DownloadIcon } from '@app/components/icons/DownloadIcon';
import { StatCard } from '@app/components/ui/StatCard';

interface DownloadPromptProps {
    onDownload: () => void;
}

export const DownloadPrompt = memo(({ onDownload }: DownloadPromptProps) => (
    <div className="w-full max-w-[320px] flex flex-col items-center text-center">
        <div className="w-14 h-14 mb-5 rounded-2xl bg-brand-200 flex items-center justify-center">
            <DownloadIcon />
        </div>

        <h2 className="text-lg font-semibold text-neutral-800">Download AI Model</h2>
        <p className="mt-2 text-sm text-neutral-500 leading-relaxed max-w-[280px]">
            NanoChat uses a local AI model that runs entirely on your device.
            No data is sent to the cloud.
        </p>

        <div className="mt-6 w-full">
            <StatCard value="~4 GB" label="Size" />
        </div>

        <button
            onClick={onDownload}
            className="mt-6 w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-medium
				transition-colors hover:bg-brand-600 active:bg-brand-400"
        >
            Download Model
        </button>
    </div>
));

DownloadPrompt.displayName = 'DownloadPrompt';
