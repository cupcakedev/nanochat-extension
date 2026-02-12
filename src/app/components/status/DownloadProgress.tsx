import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';
import { ProgressRing } from '@app/components/ui/ProgressRing';
import { useTipRotation } from '@app/hooks/useTipRotation';

interface DownloadProgressProps {
    progress: LoadingProgress | null;
}

const formatDownloadedSize = (progressValue: number) =>
    `${(progressValue * 4).toFixed(1)} / ~4 GB`;

export const DownloadProgress = memo(({ progress }: DownloadProgressProps) => {
    const { tip, isVisible } = useTipRotation(true);
    const currentProgress = progress?.progress ?? 0;
    const statusText = progress ? 'Downloading model…' : 'Preparing…';
    const fadeClass = isVisible ? 'opacity-100' : 'opacity-0';

    return (
        <div className="w-full max-w-[320px] flex flex-col items-center">
            <div className="mb-6">
                <ProgressRing progress={currentProgress} />
            </div>

            <h2 className="text-base font-medium text-neutral-800">{statusText}</h2>

            {progress && (
                <p className="mt-1 text-xs text-neutral-500 tabular-nums">
                    {formatDownloadedSize(progress.progress)}
                </p>
            )}

            <div className="mt-10 w-full rounded-xl bg-neutral-100 border border-neutral-200 p-4">
                <div className="flex items-center gap-3">
                    <span className={`text-xl shrink-0 transition-opacity duration-300 ${fadeClass}`}>
                        {tip.icon}
                    </span>
                    <p className={`text-[13px] text-neutral-600 leading-snug transition-opacity duration-300 ${fadeClass}`}>
                        {tip.text}
                    </p>
                </div>
            </div>
        </div>
    );
});

DownloadProgress.displayName = 'DownloadProgress';
