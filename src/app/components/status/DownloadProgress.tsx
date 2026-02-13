import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';
import { ProgressRing } from '@app/components/ui/ProgressRing';
import { CapabilitiesList } from './CapabilitiesList';

interface DownloadProgressProps {
  progress: LoadingProgress | null;
}

const MODEL_SIZE_GB = 4;

const formatDownloadedSize = (progressValue: number) =>
  `${(progressValue * MODEL_SIZE_GB).toFixed(1)} / ~${MODEL_SIZE_GB} GB`;

export const DownloadProgress = memo(({ progress }: DownloadProgressProps) => {
  const currentProgress = progress?.progress ?? 0;
  const statusText = progress ? 'Downloading model…' : 'Preparing…';

  return (
    <div className="w-full max-w-[320px] flex flex-col items-center">
      <h2 className="text-base font-medium text-neutral-800 mb-4">{statusText}</h2>
      <div className="mb-6">
        <ProgressRing progress={currentProgress} />
      </div>

      {progress && (
        <p className="mt-1 text-xs text-neutral-500 tabular-nums">
          {formatDownloadedSize(progress.progress)}
        </p>
      )}

      <div className="mt-6 w-full">
        <CapabilitiesList />
      </div>
    </div>
  );
});

DownloadProgress.displayName = 'DownloadProgress';
