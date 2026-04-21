import React, { useState, useEffect } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Button,
  List
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import AddIcon from '@mui/icons-material/Add';
import { ChatHistoryItem } from './ChatHistoryItem';
import emqxApiClient from '../services/emqxApiClient';

// Define the Chat type
interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  timestamp?: Date;
}

interface ChatSidebarProps {
  connectionSuccess?: boolean;
  onSelectRoom?: (room: { id: string; name: string; isGroup: boolean }) => void;
}

const drawerWidth = 300;
const collapsedWidth = 60;

const ChatSidebar: React.FC<ChatSidebarProps> = ({ connectionSuccess, onSelectRoom }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  // Load chat rooms based on MQTT connection status
  useEffect(() => {
    const loadChats = async () => {
      setLoading(true);
      try {
        if (connectionSuccess) {
          // Get group chats from EMQX API
          const groupChats = await emqxApiClient.getGroupChats();
          
          // Get active users from EMQX API
          const users = await emqxApiClient.getUserList();
          
          // Combine group chats and users into a single list
          const newChats: Chat[] = [];
          
          // Add group chats
          groupChats.forEach(groupName => {
            newChats.push({
              id: `group_${groupName}`,
              name: groupName,
              isGroup: true,
              lastMessage: 'Group created',
              timestamp: new Date()
            });
          });
          
          // Add unique users (based on clientId)
          const userIdMap = new Map();
          users.forEach(user => {
            if (!userIdMap.has(user.clientId)) {
              newChats.push({
                id: `user_${user.clientId}`,
                name: user.username || user.clientId,
                isGroup: false,
                lastMessage: 'User online',
                timestamp: new Date()
              });
              userIdMap.set(user.clientId, true);
            }
          });
          
          setChats(newChats);
        } else {
          // Fallback to mock data if connection failed
          const mockChats: Chat[] = [
            { id: '1', name: 'General', isGroup: true, lastMessage: 'Welcome everyone!', timestamp: new Date() },
            { id: '2', name: 'Random', isGroup: true, lastMessage: 'See you later!', timestamp: new Date(Date.now() - 3600000) },
            { id: '3', name: 'John Doe', isGroup: false, lastMessage: 'Thanks for your help', timestamp: new Date(Date.now() - 7200000) },
            { id: '4', name: 'Jane Smith', isGroup: false, lastMessage: 'Can we meet tomorrow?', timestamp: new Date(Date.now() - 86400000) },
          ];
          setChats(mockChats);
        }
      } catch (error) {
        console.error('Error loading chats:', error);
        // Use mock data if API call fails
        const mockChats: Chat[] = [
          { id: '1', name: 'General', isGroup: true, lastMessage: 'Welcome everyone!', timestamp: new Date() },
          { id: '2', name: 'Random', isGroup: true, lastMessage: 'See you later!', timestamp: new Date(Date.now() - 3600000) },
          { id: '3', name: 'John Doe', isGroup: false, lastMessage: 'Thanks for your help', timestamp: new Date(Date.now() - 7200000) },
          { id: '4', name: 'Jane Smith', isGroup: false, lastMessage: 'Can we meet tomorrow?', timestamp: new Date(Date.now() - 86400000) },
        ];
        setChats(mockChats);
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [connectionSuccess]);

  // Handle new chat creation
  const handleNewChat = () => {
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      name: `New Chat ${chats.length + 1}`,
      isGroup: false,
      lastMessage: 'New conversation started',
      timestamp: new Date(),
    };
    setChats([newChat, ...chats]);
    setSelectedChatId(newChat.id);
  };

  // Handle chat selection
  const handleSelectChat = (chat: Chat) => {
    setSelectedChatId(chat.id);
    if (onSelectRoom) {
      onSelectRoom({
        id: chat.id,
        name: chat.name,
        isGroup: chat.isGroup
      });
    }
  };

  // Toggle sidebar collapse
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  if (loading) {
    return (
      <Box
        sx={{
          width: drawerWidth,
          height: "100vh",
          overflow: "hidden",
          borderRight: "1px solid #e5e7eb",
          backgroundColor: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        Loading chats...
      </Box>
    );
  }

  return (
    <Box
      sx={{
        width: isCollapsed ? collapsedWidth : drawerWidth,
        height: "100vh",
        overflow: "hidden",
        borderRight: isCollapsed ? "none" : "1px solid #e5e7eb",
        backgroundColor: isCollapsed ? "transparent" : "#ffffff",
        transition: "width 0.3s ease, background-color 0.3s ease, border-right 0.3s ease",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Top toolbar */}
      <Box
        sx={{
          p: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Tooltip title={isCollapsed ? "View history" : "Hide history"} placement="right">
          <IconButton
            onClick={handleToggleCollapse}
            size="small"
            sx={{
              color: "#6b7280",
              "&:hover": {
                backgroundColor: "#e5e7eb",
                color: "#1f2937",
                transform: "scale(1.05)",
              },
            }}
          >
            {isCollapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Chat history container */}
      {!isCollapsed && (
        <Box sx={{ flex: 1, overflow: "hidden", display: 'flex', flexDirection: 'column' }}>
          {/* New chat button */}
          <Box sx={{ p: 2, pt: 1 }}>
            <Button
              fullWidth
              variant="text"
              startIcon={<AddIcon />}
              onClick={handleNewChat}
              sx={{
                py: 1,
                px: 2,
                borderRadius: 2,
                backgroundColor: '#ffffff !important',
                color: '#000000',
                border: '1px solid #e5e7eb',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
                '&:hover': {
                  backgroundColor: '#f9fafb !important',
                  borderColor: '#d1d5db',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
                  transform: 'translateY(-1px)',
                },
                '&:active': {
                  backgroundColor: '#ffffff !important',
                  transform: 'translateY(0)',
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                },
                textTransform: 'none',
                fontSize: '14px',
                fontWeight: 400,
                justifyContent: 'flex-start',
                gap: 1,
                transition: 'all 0.2s ease',
              }}
            >
              New Chat
            </Button>
          </Box>

          {/* Chat history list */}
          <Box sx={{ overflow: "auto", height: '100%' }}>
            <List>
              {chats.map((chat) => (
              <ChatHistoryItem
                key={chat.id}
                chat={chat}
                isSelected={chat.id === selectedChatId}
                onSelect={handleSelectChat}
              />
              ))}
            </List>
          </Box>
        </Box>
      )}

      {/* Collapsed view */}
      {isCollapsed && (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            pt: 2,
            gap: 2,
          }}
        >
          <Tooltip title="New Chat" placement="right">
            <IconButton
              onClick={handleNewChat}
              sx={{
                backgroundColor: "#F1F1F0",
                color: "#6b7280",
                "&:hover": {
                  backgroundColor: "#e5e7eb",
                  color: "#1f2937",
                  transform: "scale(1.05)",
                },
              }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};

export default ChatSidebar;