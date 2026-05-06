import type { CSSProperties } from 'react';

export const THEME_VARS: CSSProperties = {
  ['--w-bg' as string]: '#1D1D20',
  ['--w-text' as string]: '#EFEFF3',
  ['--w-text-dim' as string]: '#A8A8AC',
  ['--w-text-mute' as string]: '#89898D',
  ['--w-border' as string]: 'rgba(255,255,255,0.08)',
  ['--w-border-hi' as string]: 'rgba(255,255,255,0.12)',
  ['--w-surface' as string]: 'rgba(39,39,42,0.68)',
  ['--w-surface-hi' as string]: '#27272A',
  ['--w-accent' as string]: '#1E6FF1',
  ['--w-accent-hover' as string]: '#4B8AF5',
  ['--w-pointer' as string]: '#6C6C70',
};

export const STAGE_KEYFRAMES = `
@keyframes welcome-stage-in {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
}
.welcome-stage { animation: welcome-stage-in 0.36s ease-out; }

@media (max-width: 920px) {
    .welcome-title { font-size: 44px; letter-spacing: -1.1px; }
}

@media (max-width: 720px) {
    .welcome-title { font-size: 34px; line-height: 1.08; }
}
`;
