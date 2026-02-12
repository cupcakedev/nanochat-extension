import { memo } from 'react';
import type { LoadingProgress } from '@shared/types';
import { DownloadProgress } from './DownloadProgress';
import { DownloadPrompt } from './DownloadPrompt';

interface OnboardingScreenProps {
  onDownload: () => void;
  onCancel: () => void;
  loading: boolean;
  progress: LoadingProgress | null;
}

export const OnboardingScreen = memo(({ onDownload, loading, progress }: OnboardingScreenProps) => (
  <div className="flex flex-col items-center justify-center flex-1 px-6 py-10">
    {loading ? (
      <DownloadProgress progress={progress} />
    ) : (
      <DownloadPrompt onDownload={onDownload} />
    )}
  </div>
));

OnboardingScreen.displayName = 'OnboardingScreen';
