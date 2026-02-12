import { memo } from 'react';
import type { LoadingProgress, SessionStatus } from '@shared/types';
import { LoadingBar } from '@app/components/ui/LoadingBar';
import { ErrorBanner } from './ErrorBanner';

interface ModelStatusBarProps {
  status: SessionStatus;
  progress: LoadingProgress | null;
  error: string | null;
  onRetry: () => void;
}

export const ModelStatusBar = memo(({ status, progress, error, onRetry }: ModelStatusBarProps) => {
  if (status === 'ready' || status === 'idle') return null;

  if (status === 'error' && error) {
    return <ErrorBanner message={error} onRetry={onRetry} />;
  }

  if (status === 'loading' && progress) {
    return <LoadingBar progress={progress} />;
  }

  if (status === 'loading') {
    return (
      <div className="px-4 py-2">
        <span className="text-xs text-neutral-500">Initializing model...</span>
      </div>
    );
  }

  return null;
});

ModelStatusBar.displayName = 'ModelStatusBar';
