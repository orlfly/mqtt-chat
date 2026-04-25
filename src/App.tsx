import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { Box } from '@mui/material';
import ChatLayout from './components/ChatLayout';
import mqttService from './services/mqttService';
import { ClientProvider, registerClientContext, useClients } from './context/ClientContext';

const AppContent: React.FC<{ connectionSuccess: boolean }> = ({ connectionSuccess }) => {
  useClients();
  return <ChatLayout connectionSuccess={connectionSuccess} />;
};

function App() {
  const [mqttInitialized, setMqttInitialized] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const mqttInitializedRef = useRef(false);

  useEffect(() => {
    if (mqttInitializedRef.current) {
      return;
    }

    console.log('Initializing MQTT connection...');
    mqttInitializedRef.current = true;
    
    mqttService.connectWithUserProperties()
      .then(() => {
        console.log('MQTT service with user properties initialized successfully');
        
        setTimeout(() => {
          console.log('MQTT connected:', mqttService.isConnected());
          mqttService.refreshConnectionStatus();
          console.log('Final connection status - connected:', mqttService.isConnected(), 'useMockService:', mqttService['useMockService'], 'client connected:', mqttService['client']?.connected);
          setConnectionSuccess(mqttService.isConnected());
          setMqttInitialized(true);
        }, 500);
      })
      .catch(error => {
        console.error('Failed to initialize MQTT service with user properties:', error);
        setConnectionSuccess(false);
        setMqttInitialized(true);
      });

    return () => {
      console.log('Cleaning up MQTT connection...');
      mqttService.disconnect();
    };
  }, []);

  if (!mqttInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f1f1' }}>
        <div>Connecting to MQTT broker...</div>
      </Box>
    );
  }

  return (
    <ClientProvider>
      <AppContentWrapper connectionSuccess={connectionSuccess || false} />
    </ClientProvider>
  );
}

const AppContentWrapper: React.FC<{ connectionSuccess: boolean }> = ({ connectionSuccess }) => {
  const { refreshClients } = useClients();
  
  useEffect(() => {
    registerClientContext(refreshClients, () => {});
  }, [refreshClients]);
  
  return <ChatLayout connectionSuccess={connectionSuccess} />;
};

export default App;
