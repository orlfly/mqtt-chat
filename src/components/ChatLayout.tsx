import React from 'react';
import { Box } from '@mui/material';
import ChatContainer from './ChatContainer';

interface ChatLayoutProps {
  connectionSuccess?: boolean;
}

const ChatLayout: React.FC<ChatLayoutProps> = ({ connectionSuccess }) => {
  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100%', 
      backgroundColor: '#f2f2f2',
      overflow: 'hidden'
    }}>
      <ChatContainer connectionSuccess={connectionSuccess || false} />
    </Box>
  );
};

export default ChatLayout;
