import { memo } from 'react';

interface StatCardProps {
  value: string;
  label: string;
}

export const StatCard = memo(({ value, label }: StatCardProps) => (
  <div className="flex-1 rounded-[16px] bg-neutral-100/60 border border-white/5 backdrop-blur-md py-3 px-4 text-center">
    <div className="text-sm font-semibold text-neutral-800">{value}</div>
    <div className="text-[11px] text-neutral-500 mt-0.5">{label}</div>
  </div>
));

StatCard.displayName = 'StatCard';
