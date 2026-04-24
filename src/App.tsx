import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import { Box } from '@mui/material';
import ChatLayout from './components/ChatLayout';
import mqttService from './services/mqttService';

// Global state to share MQTT connection status
export const AppContext = React.createContext<any>(null);

function App() {
  const [mqttInitialized, setMqttInitialized] = useState(false);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const mqttInitializedRef = useRef(false);

  useEffect(() => {
    // Skip if already initialized to prevent React Strict Mode side effects
    if (mqttInitializedRef.current) {
      return;
    }

    console.log('Initializing MQTT connection...');
    mqttInitializedRef.current = true;
    
    // Initialize MQTT connection with v5.0 and user properties when app starts
    mqttService.connectWithUserProperties()
      .then(() => {
        console.log('MQTT service with user properties initialized successfully');
        
        // Wait a bit for connection to be fully established
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
        setMqttInitialized(true); // Still proceed even if MQTT fails
      });

    // Clean up connection when app unmounts
    return () => {
      console.log('Cleaning up MQTT connection...');
      mqttService.disconnect();
    };
  }, []); // Empty dependency array ensures this only runs once

  if (!mqttInitialized) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f1f1f1' }}>
        <div>Connecting to MQTT broker...</div>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', height: '100vh', backgroundColor: '#f1f1f1' }}>
      <ChatLayout connectionSuccess={connectionSuccess} />
    </Box>
  );
}

export default App;
