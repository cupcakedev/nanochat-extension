import { memo } from 'react';

interface AgentNoticeProps {
  message: string;
}

export const AgentNotice = memo(({ message }: AgentNoticeProps) => (
  <div className="mx-auto mb-4 w-full max-w-3xl">
    <div className="inline-flex max-w-full rounded-[18px] border border-amber-300/25 bg-amber-200/10 px-4 py-2.5 text-xs text-amber-100">
      {message}
    </div>
  </div>
));

AgentNotice.displayName = 'AgentNotice';
