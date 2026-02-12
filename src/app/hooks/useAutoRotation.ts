import { useEffect, useState } from 'react';

const FADE_DURATION = 300;

export function useAutoRotation(itemCount: number, intervalMs: number, enabled: boolean) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        if (!enabled || itemCount === 0) return;

        const interval = setInterval(() => {
            setIsVisible(false);
            setTimeout(() => {
                setActiveIndex((prev) => (prev + 1) % itemCount);
                setIsVisible(true);
            }, FADE_DURATION);
        }, intervalMs);

        return () => clearInterval(interval);
    }, [enabled, itemCount, intervalMs]);

    return { activeIndex, isVisible };
}
