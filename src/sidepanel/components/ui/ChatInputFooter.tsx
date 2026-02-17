import { memo } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import { StopIcon } from '@sidepanel/components/icons/StopIcon';
import { SendIcon } from '@sidepanel/components/icons/SendIcon';
import { ImageIcon } from '@sidepanel/components/icons/ImageIcon';
import { ActionButton } from './ActionButton';

interface ChatInputFooterProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  composerDisabled: boolean;
  showAddContext: boolean;
  onAddContext: () => void;
  streaming: boolean;
  onStop?: () => void;
  onSendIntent: () => void;
  canSend: boolean;
}

const GlobeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.3"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="8" cy="8" r="6.5" />
    <ellipse cx="8" cy="8" rx="3" ry="6.5" />
    <path d="M1.5 8h13" />
  </svg>
);

export const ChatInputFooter = memo(
  ({
    fileInputRef,
    onFileChange,
    composerDisabled,
    showAddContext,
    onAddContext,
    streaming,
    onStop,
    onSendIntent,
    canSend,
  }: ChatInputFooterProps) => (
    <div className="px-3 pt-1.5 pb-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={onFileChange}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={composerDisabled}
            className="flex items-center justify-center w-10 h-10 rounded-[12px] [&_svg]:w-5 [&_svg]:h-5
            text-neutral-400 hover:text-neutral-700 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
            title="Attach image"
          >
            <ImageIcon />
          </button>
          {showAddContext && (
            <button
              onClick={onAddContext}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] text-xs
              text-neutral-500 hover:text-neutral-700 hover:bg-neutral-200/20
              transition-colors"
            >
              <GlobeIcon />
              <span>Add page</span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {streaming ? (
            <ActionButton onClick={onStop} variant="stop">
              <StopIcon />
            </ActionButton>
          ) : (
            <ActionButton onClick={onSendIntent} disabled={!canSend} variant="send">
              <SendIcon />
            </ActionButton>
          )}
        </div>
      </div>
    </div>
  ),
);

ChatInputFooter.displayName = 'ChatInputFooter';
