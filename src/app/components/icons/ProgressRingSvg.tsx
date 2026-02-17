import { memo } from 'react';

interface ProgressRingSvgProps {
  circumference: number;
  offset: number;
}

export const ProgressRingSvg = memo(({ circumference, offset }: ProgressRingSvgProps) => (
  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
    <circle
      cx="50"
      cy="50"
      r="44"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
      strokeDasharray={circumference}
      strokeDashoffset={offset}
      className="text-brand-500 transition-all duration-700 ease-out"
    />
  </svg>
));

ProgressRingSvg.displayName = 'ProgressRingSvg';
