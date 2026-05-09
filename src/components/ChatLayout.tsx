import React from 'react';
import { Box } from '@mui/material';
import ChatContainer from './ChatContainer';

interface ChatLayoutProps {
  connectionSuccess?: boolean;
  onLogout?: () => void;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ connectionSuccess, onLogout }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100%', 
      backgroundColor: '#f2f2f2',
      overflow: 'hidden',
      position: 'relative'
    }}>
      <ChatContainer connectionSuccess={connectionSuccess || false} onLogout={onLogout} />
    </Box>
  );
};

export default ChatLayout;
