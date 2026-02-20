import { ChatProvider } from '@sidepanel/contexts/ChatContext';
import { MainPage } from '@sidepanel/pages/MainPage';
import { useSidepanelConnection } from '@sidepanel/hooks/state';

const AppInner = () => {
  useSidepanelConnection();
  return <MainPage />;
};

export const App = () => (
  <ChatProvider>
    <AppInner />
  </ChatProvider>
);
