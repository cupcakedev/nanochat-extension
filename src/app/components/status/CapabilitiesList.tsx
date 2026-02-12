import { memo } from 'react';
import { useAutoRotation } from '@app/hooks/useAutoRotation';

interface Capability {
    icon: string;
    text: string;
}

const CAPABILITIES: Capability[] = [
    { icon: '📝', text: 'Summarize articles & documents' },
    { icon: '✉️', text: 'Draft & polish emails' },
    { icon: '🐛', text: 'Debug code & error messages' },
    { icon: '🌍', text: 'Translate between languages' },
    { icon: '🧠', text: 'Explain complex topics simply' },
    { icon: '💡', text: 'Brainstorm ideas for any project' },
    { icon: '📊', text: 'Create outlines for presentations' },
    { icon: '🔍', text: 'Explain code line by line' },
    { icon: '✅', text: 'Proofread & improve your writing' },
    { icon: '🔤', text: 'Generate regex from examples' },
    { icon: '💼', text: 'Draft cover letters & resumes' },
    { icon: '🔀', text: 'Write git commit messages' },
    { icon: '🧪', text: 'Generate test data & examples' },
    { icon: '🎨', text: 'Rephrase text in different tones' },
    { icon: '📌', text: 'Create checklists & action plans' },
];

const ROTATION_INTERVAL = 4000;

export const CapabilitiesList = memo(() => {
    const { activeIndex, isVisible } = useAutoRotation(
        CAPABILITIES.length,
        ROTATION_INTERVAL,
        true,
    );

    const { icon, text } = CAPABILITIES[activeIndex];
    const fadeClass = isVisible ? 'opacity-100' : 'opacity-0';

    return (
        <div>
            <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                What NanoChat can do
            </h3>
            <div className="w-full rounded-xl bg-neutral-100 border border-neutral-200 p-4">
                <div className="flex items-center gap-2.5 min-h-[24px]">
                    <span className={`text-base shrink-0 transition-opacity duration-300 ${fadeClass}`}>
                        {icon}
                    </span>
                    <span className={`text-[13px] text-neutral-700 leading-tight transition-opacity duration-300 ${fadeClass}`}>
                        {text}
                    </span>
                </div>
            </div>
        </div>
    );
});

CapabilitiesList.displayName = 'CapabilitiesList';
