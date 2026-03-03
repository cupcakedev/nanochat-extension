import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';
import { DownloadProgress } from './DownloadProgress';
import { DownloadPrompt } from './DownloadPrompt';

interface OnboardingScreenProps {
  onDownload: () => void;
  loading: boolean;
  progress: LoadingProgress | null;
  error?: string | null;
}

export const OnboardingScreen = memo(
  ({ onDownload, loading, progress, error }: OnboardingScreenProps) => (
    <div className="flex flex-col items-center justify-center flex-1 px-6 py-10">
      {error && (
        <div className="mb-4 max-w-[360px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}
      {loading ? (
        <DownloadProgress progress={progress} />
      ) : (
        <DownloadPrompt onDownload={onDownload} />
      )}
    </div>
  ),
);

OnboardingScreen.displayName = 'OnboardingScreen';
