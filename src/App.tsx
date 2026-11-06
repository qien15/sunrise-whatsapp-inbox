import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { InboxWorkbench } from './components/InboxWorkbench';
import { LoginPage } from './components/LoginPage';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <InboxWorkbench />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
