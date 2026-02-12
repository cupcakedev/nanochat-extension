import { memo } from 'react';
import { Logo } from './Logo';

interface EmptyStateProps {
	title: string;
	description: string;
}

export const EmptyState = memo(({ title, description }: EmptyStateProps) => (
	<div className="flex flex-col items-center justify-center flex-1 px-6 text-center">
		<Logo size={48} />
		<h2 className="mt-4 text-lg font-semibold text-gray-900">{title}</h2>
		<p className="mt-1.5 text-sm text-gray-500 max-w-[240px]">{description}</p>
	</div>
));

EmptyState.displayName = 'EmptyState';
