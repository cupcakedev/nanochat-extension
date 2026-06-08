interface BottomBarProps {
  step: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
}

export function BottomBar({ step, total, onNext, onBack }: BottomBarProps) {
  const isLast = step === total - 1;
  const isFirst = step === 0;
  const progress = ((step + 1) / total) * 100;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 px-4 sm:px-8 py-4 sm:py-6">
      <div className="mx-auto w-full max-w-[1040px] rounded-2xl border border-[var(--w-border)] bg-[color:rgba(9,14,24,0.72)] backdrop-blur-[12px] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 sm:gap-6">
        <div className="hidden sm:flex min-w-[210px] flex-col gap-2">
          <div className="text-[12px] text-[var(--w-text-mute)]">
            Step {step + 1} of {total}
          </div>
          <div className="h-1.5 rounded-full bg-[var(--w-surface)] overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--w-accent), var(--w-accent-2))',
              }}
            />
          </div>
        </div>

        <div className="flex-1">
          {!isFirst && (
            <button
              onClick={onBack}
              className="bg-transparent border-none text-[var(--w-text-mute)] text-[14px] font-medium cursor-pointer px-1 py-2 transition-colors duration-150 hover:text-[var(--w-text)]"
            >
              ← Back
            </button>
          )}
        </div>

        <div className="flex-1 flex justify-end">
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 text-white border-none rounded-xl px-[20px] sm:px-[24px] py-[12px] sm:py-[13px] text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, var(--w-accent), var(--w-accent-2))',
              boxShadow: '0 10px 24px -12px rgba(76,141,255,0.9)',
            }}
          >
            {isLast ? 'Get started' : 'Continue'}
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
