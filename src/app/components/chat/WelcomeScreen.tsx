import { memo, useCallback } from 'react';
import { Logo } from '@app/components/ui/Logo';
import { SuggestionChip } from '@app/components/ui/SuggestionChip';
import { getSuggestionsForMode, getDescriptionForMode } from './welcomeSuggestions';
import type { Suggestion } from './welcomeSuggestions';
import type { ChatMode } from '@app/types/mode';

interface WelcomeScreenProps {
  mode: ChatMode;
  hasPageContext: boolean;
  onSuggestionClick: (prompt: string) => void;
  onContextRequired: () => void;
}

export const WelcomeScreen = memo(({ mode, hasPageContext, onSuggestionClick, onContextRequired }: WelcomeScreenProps) => {
  const suggestions = getSuggestionsForMode(mode);
  const description = getDescriptionForMode(mode);

  const handleClick = useCallback(
    (suggestion: Suggestion) => () => {
      if (suggestion.requiresContext && !hasPageContext) {
        onContextRequired();
        return;
      }
      onSuggestionClick(suggestion.prompt);
    },
    [hasPageContext, onSuggestionClick, onContextRequired],
  );

  return (
    <div className="flex flex-col items-center justify-center flex-1 px-6 pt-16 pb-8">
      <Logo size={44} />
      <h2 className="mt-4 text-base font-semibold text-neutral-800">NanoChat</h2>
      <p className="mt-2 text-xs text-neutral-500 max-w-[280px] text-center leading-relaxed">
        {description}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2 max-w-[340px]">
        {suggestions.map((s) => (
          <SuggestionChip key={s.label} label={s.label} onClick={handleClick(s)} />
        ))}
      </div>
    </div>
  );
});

WelcomeScreen.displayName = 'WelcomeScreen';
