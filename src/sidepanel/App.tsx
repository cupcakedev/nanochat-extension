import { ChatProvider } from '@sidepanel/contexts/ChatContext';
import { MainPage } from '@sidepanel/pages/MainPage';

export const App = () => (
  <ChatProvider>
    <MainPage />
  </ChatProvider>
);
