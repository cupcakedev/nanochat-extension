import { memo } from 'react';
import { Logo } from '@app/components/ui/Logo';
import { GithubIcon } from '@app/components/icons/GithubIcon';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GITHUB_URL = 'https://github.com/cupcakedev/nanochat-extension';
const DEVELOPER_URL = 'https://cupcakedev.com';

export const AboutModal = memo(({ isOpen, onClose }: AboutModalProps) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto w-[280px] rounded-[16px] border border-white/10 bg-neutral-100/95 backdrop-blur-xl flex flex-col items-center overflow-hidden">
          <div className="flex flex-col items-center gap-2 pt-6 pb-2 px-6">
            <Logo size={40} />
            <h3 className="text-sm font-semibold text-neutral-800">NanoChat</h3>
          </div>

          <p className="text-[11px] text-neutral-500 text-center leading-relaxed max-w-[220px] px-6 pb-5">
            Open-source on-device AI browser assistant. Private, fast, no cloud required.
          </p>

          <div className="w-full flex flex-col border-t border-white/5">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-5 py-3 text-[12px]
                text-neutral-500 hover:text-neutral-800 hover:bg-white/5 transition-all duration-200"
            >
              <GithubIcon />
              <span className="flex-1">Source code</span>
              <span className="text-[10px] text-neutral-400">MIT License</span>
            </a>
            <a
              href={DEVELOPER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 px-5 py-3 text-[12px] border-t border-white/5
                text-neutral-500 hover:text-neutral-800 hover:bg-white/5 transition-all duration-200"
            >
              <img src="/icons/ccdev_logo.png" alt="cupcakedev" className="w-20 object-contain" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
});

AboutModal.displayName = 'AboutModal';
