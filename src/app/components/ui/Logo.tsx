import { memo } from 'react';

interface LogoProps {
	size?: number;
}

export const Logo = memo(({ size = 32 }: LogoProps) => (
	<svg
		width={size}
		height={size}
		viewBox="0 0 32 32"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		<rect width="32" height="32" rx="8" fill="#1E6FF1" />
		<path
			d="M8 12C8 10.3431 9.34315 9 11 9H21C22.6569 9 24 10.3431 24 12V18C24 19.6569 22.6569 21 21 21H18L14 25V21H11C9.34315 21 8 19.6569 8 18V12Z"
			fill="white"
		/>
	</svg>
));

Logo.displayName = 'Logo';
