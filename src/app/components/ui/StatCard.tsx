import { memo } from 'react';

interface StatCardProps {
  value: string;
  label: string;
}

export const StatCard = memo(({ value, label }: StatCardProps) => (
  <div className="flex-1 rounded-xl bg-neutral-100 border border-neutral-200 py-2.5 px-3 text-center">
    <div className="text-sm font-semibold text-neutral-800">{value}</div>
    <div className="text-[10px] text-neutral-400 mt-0.5">{label}</div>
  </div>
));

StatCard.displayName = 'StatCard';
