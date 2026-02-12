import { ChatProvider } from '@app/contexts/ChatContext';
import { MainPage } from '@app/pages/MainPage';

export const App = () => (
  <ChatProvider>
    <MainPage />
  </ChatProvider>
);
