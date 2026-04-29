import React, { useState, useEffect } from 'react';
import './App.css';
import { Box } from '@mui/material';
import ChatLayout from './components/ChatLayout';
import mqttService from './services/mqttService';
import { ClientProvider, useClients, registerClientContext } from './context/ClientContext';
import LoginPage from './components/LoginPage';

const AppContent: React.FC<{ connectionSuccess: boolean; onLogout: () => void }> = ({ connectionSuccess, onLogout }) => {
  const { refreshClients } = useClients();
  
  useEffect(() => {
    registerClientContext(refreshClients, () => {});
  }, [refreshClients]);
  
  return <ChatLayout connectionSuccess={connectionSuccess} onLogout={onLogout} />;
};

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mqttInitialized, setMqttInitialized] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  const handleLogin = async (username: string, password: string) => {
    try {
      console.log('Attempting to connect to MQTT with provided credentials...');
      
      await mqttService.connectWithUserProperties(username, password);
      
      setTimeout(() => {
        console.log('MQTT connected:', mqttService.isConnected());
        mqttService.refreshConnectionStatus();
        console.log('Final connection status - connected:', mqttService.isConnected(), 'useMockService:', mqttService['useMockService'], 'client connected:', mqttService['client']?.connected);
        setConnectionSuccess(mqttService.isConnected());
        setMqttInitialized(true);
        setIsLoggedIn(true);
      }, 500);
    } catch (error) {
      console.error('Failed to connect to MQTT broker:', error);
      setConnectionSuccess(false);
      setMqttInitialized(true);
      throw error;
    }
  };

  const handleLogout = () => {
    console.log('Logging out and disconnecting MQTT...');
    mqttService.disconnect();
    setIsLoggedIn(false);
    setMqttInitialized(false);
    setConnectionSuccess(false);
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  if (!mqttInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f1f1' }}>
        <div>Connecting to MQTT broker...</div>
      </Box>
    );
  }

  return (
    <ClientProvider>
      <AppContent connectionSuccess={connectionSuccess} onLogout={handleLogout} />
    </ClientProvider>
  );
}

export default App;
