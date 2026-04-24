import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../services/mqttService';
import mqttService from '../services/mqttService';
import { 
  Box, 
  Paper, 
  IconButton, 
  TextField, 
  Typography, 
  List, 
  ListItem, 
  ListItemText,
  CircularProgress,
  InputAdornment
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PeopleIcon from '@mui/icons-material/People';
import './ChatRoom.css';

interface ChatRoomProps {
  room: {
    id: string;
    name: string;
    isGroup: boolean;
  };
}

const ChatRoom: React.FC<ChatRoomProps> = ({ room }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ensure input element receives focus when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Subscribe to MQTT room and handle messages
  useEffect(() => {
    console.log('ChatRoom useEffect: About to subscribe to room:', room.id, 'Room info:', room, 'Client ID:', mqttService.clientId);
    
    // Subscribe to the room when component mounts
    mqttService.subscribeToRoom(room.id);
    
    // Add message listener
    const handleMessage = (msg: Message) => {
      console.log('ChatRoom handleMessage: Received message:', msg, 'Current room:', room);
      // For both group and private chat, we want to show messages in the current room
      // Since MQTT routing handles delivering the right messages to the right topic,
      // we can just show any received message in the current room
      setMessages(prev => {
        // Prevent duplicate messages
        const exists = prev.some(m => m.id === msg.id);
        if (!exists) {
          console.log('Adding new message to room:', msg);
          return [...prev, msg];
        }
        console.log('Message already exists, skipping duplicate:', msg);
        return prev;
      });
    };

    mqttService.addMessageListener(handleMessage);

    // Cleanup on unmount
    return () => {
      console.log('ChatRoom cleanup: Unsubscribing from room:', room.id);
      mqttService.unsubscribeFromRoom(room.id);
      mqttService.removeMessageListener(handleMessage);
    };
  }, [room.id]); // Only depend on id to prevent endless re-subscriptions

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    
    try {
      // Create a local message object to display immediately
      const localMessage = {
        id: Math.random().toString(36).substr(2, 9),
        text: inputValue,
        sender: 'You',
        timestamp: new Date(),
      };
      
      // Add the message to local messages immediately
      setMessages(prev => [...prev, localMessage]);
      
      console.log('About to send message - Room info:', room);
      console.log('Is group chat?', room.isGroup);
      
      // Check if this is a private message (user chat) or group chat
      if (room.isGroup) {
        // Send group message via MQTT service
        console.log('Sending group message to room:', room.id);
        await mqttService.sendMessage(inputValue, 'You', room.id);
      } else {
        // For private messages, extract the target client ID from the room ID
        // Room ID format for users is 'user_{clientId}'
        const targetClientId = room.id.startsWith('user_') ? room.id.substring(5) : room.id;
        console.log('Sending private message to client:', targetClientId, 'Room ID:', room.id);
        
        // Send private message to the specific user's inbound topic
        await mqttService.sendPrivateMessage(inputValue, mqttService.clientId || 'You', targetClientId, room.id);
      }
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the message if sending failed
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

// Format time for messages
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // State for marked module
  const [markedModule, setMarkedModule] = React.useState<any>(null);

  // Dynamically load marked module
  React.useEffect(() => {
    const loadMarked = async () => {
      const markedModule = await import('marked');
      setMarkedModule(markedModule);
    };
    loadMarked();
  }, []);

  // Markdown parser function
  const parseMarkdown = (text: string) => {
    if (markedModule && markedModule.default && typeof markedModule.default.parse === 'function') {
      try {
        return markedModule.default.parse(text || '');
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return text || '';
      }
    } else if (markedModule && markedModule.marked) {
      try {
        return markedModule.marked(text || '');
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return text || '';
      }
    }
    return text || '';
  };

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
        bgcolor: '#ffffff',
      }}
    >
      {/* Chat header */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        borderBottom: '1px solid #e0e0e0',
        flexShrink: 0,
        bgcolor: '#f5f5f5'
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: '#171717' }}>
          {room.name} {room.isGroup ? '(群聊)' : '(私聊)'}
        </Typography>
      </Box>

      {/* Messages container */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
        }}
      >
        <List sx={{ padding: 0 }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%',
              color: '#9ca3af'
            }}>
              <PeopleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2">暂无消息</Typography>
            </Box>
          ) : (
            messages.map((message) => (
              <ListItem 
                key={message.id}
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.sender === 'You' ? 'flex-end' : 'flex-start',
                  padding: '4px 0'
                }}
              >
                <Box
                  sx={{
                    maxWidth: '70%',
                    borderRadius: 2,
                    bgcolor: message.sender === 'You' ? '#d9fdd3' : '#ffffff',
                    border: message.sender === 'You' ? 'none' : '1px solid #e0e0e0',
                    p: 1.5,
                  }}
                >
                  {room.isGroup && message.sender !== 'You' && (
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block' }}>
                      {message.sender}
                    </Typography>
                  )}
                  <ListItemText
                    primary={
                      markedModule ? (
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: parseMarkdown(message.text) 
                          }} 
                          style={{ wordWrap: 'break-word' }}
                        />
                      ) : (
                        <span>{message.text}</span>
                      )
                    }
                    secondary={formatTime(message.timestamp)}
                    sx={{ 
                      mb: 0,
                      '& .MuiListItemText-secondary': {
                        fontSize: '0.7rem',
                        textAlign: message.sender === 'You' ? 'right' : 'left'
                      }
                    }}
                  />
                </Box>
              </ListItem>
            ))
          )}
          <div ref={messagesEndRef} />
        </List>
      </Box>

      {/* Input area */}
      <Paper
        sx={{
          borderRadius: 0,
          p: 1.5,
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.08)',
          borderTop: '1px solid #e0e0e0',
          flexShrink: 0,
        }}
      >
          <TextField
            inputRef={inputRef}
            fullWidth
            variant="outlined"
            placeholder={`在 ${room.name} 中输入消息...`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={8}
            InputProps={{
              sx: { borderRadius: 20, py: 1, px: 2 },
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || isLoading}
                    sx={{
                      bgcolor: inputValue.trim() && !isLoading ? '#007bff' : 'grey.300',
                      color: 'white',
                      '&:hover': {
                        bgcolor: inputValue.trim() && !isLoading ? '#0056b3' : 'grey.400',
                      },
                      borderRadius: '50%',
                      width: 36,
                      height: 36,
                    }}
                  >
                    {isLoading ? <CircularProgress size={20} /> : <SendIcon />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
      </Paper>
    </Box>
  );
};

export default ChatRoom;
