import {Header} from '@app/components/ui/Header';
import {EmptyState} from '@app/components/ui/EmptyState';
import {ChatInput} from '@app/components/ui/ChatInput';
import {MessageList} from '@app/components/chat/MessageList';
import {TokenStats} from '@app/components/chat/TokenStats';
import {ModelStatusBar} from '@app/components/status/ModelStatusBar';
import {usePromptSession} from '@app/hooks/usePromptSession';
import {useChat} from '@app/hooks/useChat';

export const MainPage = () => {
	const {status, progress, error, retry, serviceRef} = usePromptSession();
	const {messages, streaming, tokenStats, send, stop, clear} = useChat(serviceRef);

	const hasMessages = messages.length > 0;

	return (
		<div className="flex flex-col h-screen">
			<Header onClear={clear} showClear={hasMessages} />
			<ModelStatusBar status={status} progress={progress} error={error} onRetry={retry} />
			{hasMessages ? (
				<>
					<MessageList messages={messages} streaming={streaming} />
					{tokenStats && !streaming && <TokenStats stats={tokenStats} />}
				</>
			) : (
				<EmptyState
					title="Welcome to NanoChat"
					description="Start a conversation by typing a message below"
				/>
			)}
			<ChatInput
				onSend={send}
				onStop={stop}
				streaming={streaming}
				disabled={status !== 'ready'}
				placeholder="Ask anything..."
			/>
		</div>
	);
};
