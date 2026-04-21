import React, { useEffect, useState } from 'react';
import './App.css';
import { Box } from '@mui/material';
import ChatContainer from './components/ChatContainer';

function App() {
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  useEffect(() => {
    // Initialize MQTT connection with v5.0 and user properties when app starts
    import('./services/mqttService').then(({ default: mqttService }) => {
      mqttService.connectWithUserProperties()
        .then(() => {
          console.log('MQTT service with user properties initialized successfully');
          mqttService.refreshConnectionStatus();
          setConnectionSuccess(mqttService.isConnected());
        })
        .catch(error => {
          console.error('Failed to initialize MQTT service with user properties:', error);
          setConnectionSuccess(false);
        });
    });

    // Clean up connection when app unmounts
    return () => {
      import('./services/mqttService').then(({ default: mqttService }) => {
        mqttService.disconnect();
      });
    };
  }, []);

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100%', 
      backgroundColor: '#f2f2f2',
      overflow: 'hidden'
    }}>
      <ChatContainer connectionSuccess={connectionSuccess} />
    </Box>
  );
}

export default App;