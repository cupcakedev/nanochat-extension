import {memo} from 'react';
import {EXTENSION_NAME} from '@shared/constants';
import {Logo} from './Logo';

export const Header = memo(() => (
	<header className="flex items-center gap-2.5 px-4 py-3 border-b border-gray-100">
		<Logo size={28} />
		<h1 className="text-base font-semibold text-gray-900">{EXTENSION_NAME}</h1>
	</header>
));

Header.displayName = 'Header';
