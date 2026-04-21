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
    // Subscribe to the room when component mounts
    mqttService.subscribeToRoom(room.id);
    
    // Add message listener
    const handleMessage = (msg: Message) => {
      if (msg.room === room.id) {
        setMessages(prev => {
          // Prevent duplicate messages
          const exists = prev.some(m => m.id === msg.id);
          if (!exists) {
            return [...prev, msg];
          }
          return prev;
        });
      }
    };

    mqttService.addMessageListener(handleMessage);

    // Cleanup on unmount
    return () => {
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
      // Send message via MQTT service
      await mqttService.sendMessage(inputValue, 'You', room.id);
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
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
                    primary={message.text}
                    secondary={formatTime(message.timestamp)}
                    sx={{ 
                      wordWrap: 'break-word',
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
            maxRows={4}
            slotProps={{
              input: {
                sx: { borderRadius: 20, py: 0.5, px: 2 },
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
              }
            }}
          />
      </Paper>
    </Box>
  );
};

export default ChatRoom;
