import { useEffect, useState } from 'react';

interface Tip {
    icon: string;
    text: string;
}

const TIPS: Tip[] = [
    { icon: '📝', text: 'Summarize long articles in seconds' },
    { icon: '✉️', text: 'Draft and polish emails' },
    { icon: '💡', text: 'Brainstorm ideas for any project' },
    { icon: '🐛', text: 'Debug error messages and stack traces' },
    { icon: '🌍', text: 'Translate text between languages' },
    { icon: '📊', text: 'Create outlines for presentations' },
    { icon: '🔍', text: 'Explain complex code line by line' },
    { icon: '📱', text: 'Draft social media posts' },
    { icon: '🧠', text: 'Simplify complex topics for anyone' },
    { icon: '🏷️', text: 'Write compelling product descriptions' },
    { icon: '🔤', text: 'Generate regex patterns from examples' },
    { icon: '✅', text: 'Proofread and improve your writing' },
    { icon: '📋', text: 'Create meeting agendas in a click' },
    { icon: '🎓', text: 'Explain technical concepts simply' },
    { icon: '💼', text: 'Draft cover letters and resumes' },
    { icon: '🔀', text: 'Write git commit messages' },
    { icon: '🧪', text: 'Generate test data and examples' },
    { icon: '🎨', text: 'Rephrase text in different tones' },
    { icon: '📌', text: 'Create checklists and action plans' },
    { icon: '⚖️', text: 'Analyze pros and cons of any decision' },
];

const FADE_DURATION = 300;
const ROTATION_INTERVAL = 5000;

export function useTipRotation(enabled: boolean) {
    const [tipIndex, setTipIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);

    useEffect(() => {
        if (!enabled) return;

        const interval = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setTipIndex((prev) => (prev + 1) % TIPS.length);
                setIsFading(false);
            }, FADE_DURATION);
        }, ROTATION_INTERVAL);

        return () => clearInterval(interval);
    }, [enabled]);

    return {
        tip: TIPS[tipIndex],
        isVisible: !isFading,
    };
}
