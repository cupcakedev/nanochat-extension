import { memo } from 'react';
import { useAutoRotation } from '@app/hooks/useAutoRotation';
import { CAPABILITIES, CAPABILITIES_ROTATION_INTERVAL } from './capabilitiesData';

function visibilityClass(isVisible: boolean): string {
	return isVisible ? 'opacity-100' : 'opacity-0';
}

export const CapabilitiesList = memo(() => {
	const { activeIndex, isVisible } = useAutoRotation(
		CAPABILITIES.length,
		CAPABILITIES_ROTATION_INTERVAL,
		true,
	);

	const { icon, text } = CAPABILITIES[activeIndex];
	const fadeTransition = `transition-opacity duration-300 ${visibilityClass(isVisible)}`;

	return (
		<div>
			<h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
				What NanoChat can do
			</h3>
			<div className="w-full rounded-xl bg-neutral-100 border border-neutral-200 p-4">
				<div className="flex items-center gap-2.5 min-h-[24px]">
					<span className={`text-base shrink-0 ${fadeTransition}`}>{icon}</span>
					<span className={`text-[13px] text-neutral-700 leading-tight ${fadeTransition}`}>
						{text}
					</span>
				</div>
			</div>
		</div>
	);
});

CapabilitiesList.displayName = 'CapabilitiesList';
