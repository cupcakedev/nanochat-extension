import { memo } from 'react';

interface ProgressRingSvgProps {
  circumference: number;
  offset: number;
}

export const ProgressRingSvg = memo(({ circumference, offset }: ProgressRingSvgProps) => (
  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="none" stroke="#27272A" strokeWidth="5" />
    <circle
      cx="50"
      cy="50"
      r="44"
      fill="none"
      stroke="#1E6FF1"
      strokeWidth="5"
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={offset}
      className="transition-all duration-700 ease-out"
    />
  </svg>
));

ProgressRingSvg.displayName = 'ProgressRingSvg';
