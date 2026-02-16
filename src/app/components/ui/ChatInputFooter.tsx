import { memo } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { ChatContextSendMode } from '@app/types/mode';
import { StopIcon } from '@app/components/icons/StopIcon';
import { SendIcon } from '@app/components/icons/SendIcon';
import { ImageIcon } from '@app/components/icons/ImageIcon';
import { ContextToggle } from './ContextToggle';
import { ActionButton } from './ActionButton';

interface ChatInputFooterProps {
  fileInputRef: RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  composerDisabled: boolean;
  contextMode: ChatContextSendMode;
  onContextModeChange: (mode: ChatContextSendMode) => void;
  showContextToggle: boolean;
  streaming: boolean;
  onStop?: () => void;
  onSendIntent: () => void;
  canSend: boolean;
}

export const ChatInputFooter = memo(({
  fileInputRef,
  onFileChange,
  composerDisabled,
  contextMode,
  onContextModeChange,
  showContextToggle,
  streaming,
  onStop,
  onSendIntent,
  canSend,
}: ChatInputFooterProps) => (
  <div className="px-3 pt-1.5 pb-2.5">
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-5">
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
          className="flex items-center justify-center w-12 h-12 rounded-[12px] [&_svg]:w-5 [&_svg]:h-5
            text-neutral-400 hover:text-neutral-700 transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed"
          title="Attach image"
        >
          <ImageIcon />
        </button>
        {showContextToggle && (
          <ContextToggle contextMode={contextMode} onContextModeChange={onContextModeChange} />
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
));

ChatInputFooter.displayName = 'ChatInputFooter';
