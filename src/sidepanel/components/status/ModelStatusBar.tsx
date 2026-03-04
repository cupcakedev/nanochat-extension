import { memo } from 'react';
import { SessionStatus } from '@shared/types';
import type { LoadingProgress } from '@shared/types';
import { LoadingBar } from '@sidepanel/components/ui/LoadingBar';

interface ModelStatusBarProps {
  status: SessionStatus;
  progress: LoadingProgress | null;
  error: string | null;
  onRetry: () => void;
}

export const ModelStatusBar = memo(
  ({ status, progress, error: _error, onRetry: _onRetry }: ModelStatusBarProps) => {
    if (status === SessionStatus.Ready || status === SessionStatus.Idle) return null;
    if (status === SessionStatus.Error) return null;

    if (status === SessionStatus.Loading && progress) {
      return <LoadingBar progress={progress} />;
    }

    if (status === SessionStatus.Loading) {
      return (
        <div className="px-3.5 py-2 rounded-[12px] bg-neutral-100/80 border border-white/5 backdrop-blur-md">
          <span className="text-xs text-neutral-500">Initializing model...</span>
        </div>
      );
    }

    return null;
  },
);

ModelStatusBar.displayName = 'ModelStatusBar';
