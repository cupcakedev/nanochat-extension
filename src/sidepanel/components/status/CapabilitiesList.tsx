import { memo } from 'react';
import { useAutoRotation } from '@sidepanel/hooks/ui';
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
      <h3 className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider mb-3">
        What NanoChat can do
      </h3>
      <div className="w-full rounded-[16px] bg-neutral-100/60 border border-white/5 backdrop-blur-md p-4">
        <div className="flex items-center gap-3 min-h-[24px]">
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
