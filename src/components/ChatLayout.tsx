import React from 'react';
import { Box, Button, Tooltip } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
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
      <ChatContainer connectionSuccess={connectionSuccess || false} />
      {onLogout && (
        <Tooltip title="退出" placement="right">
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
            sx={{ 
              position: 'absolute',
              bottom: 16,
              left: 16,
              zIndex: 1000
            }}
          >
            退出
          </Button>
        </Tooltip>
      )}
    </Box>
  );
};

export default ChatLayout;
