import {useCallback} from 'react';
import {Header} from '@app/components/ui/Header';
import {EmptyState} from '@app/components/ui/EmptyState';
import {ChatInput} from '@app/components/ui/ChatInput';

export const MainPage = () => {
	const handleSend = useCallback((_message: string) => undefined, []);

	return (
		<div className="flex flex-col h-screen">
			<Header />
			<EmptyState
				title="Welcome to NanoChat"
				description="Start a conversation by typing a message below"
			/>
			<ChatInput onSend={handleSend} placeholder="Ask anything..." />
		</div>
	);
};
