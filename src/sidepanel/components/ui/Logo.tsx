import { memo } from 'react';

interface LogoProps {
  size?: number;
}

export const Logo = memo(({ size = 32 }: LogoProps) => (
  <img
    src="/icons/icon-128.png"
    alt="NanoChat"
    width={size}
    height={size}
    className="rounded-[8px] object-cover"
  />
));

Logo.displayName = 'Logo';
