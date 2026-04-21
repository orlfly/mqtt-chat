import React, { useState, useRef, useEffect } from 'react';
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
import mqttService, { Message } from '../services/mqttService';

interface ChatRoomInfo {
  id: string;
  name: string;
  isGroup: boolean;
}

interface ChatMainContentProps {
  selectedRoom: ChatRoomInfo | null;
}

const ChatMainContent: React.FC<ChatMainContentProps> = ({ selectedRoom }) => {
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
    if (!selectedRoom) return;

    // Subscribe to the room when component mounts
    mqttService.subscribeToRoom(selectedRoom.id);
    
    // Add message listener
    const handleMessage = (msg: Message) => {
      if (msg.room === selectedRoom.id) {
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
      if (selectedRoom) {
        mqttService.unsubscribeFromRoom(selectedRoom.id);
      }
      mqttService.removeMessageListener(handleMessage);
    };
  }, [selectedRoom]); // Only depend on id to prevent endless re-subscriptions

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedRoom) return;

    setIsLoading(true);
    
    try {
      // Send message via MQTT service
      await mqttService.sendMessage(inputValue, 'You', selectedRoom.id);
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

  if (!selectedRoom) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Typography variant="h6" color="textSecondary">
          Select a chat to start messaging
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch', // Changed from 'center' to 'stretch' to fully utilize width
        justifyContent: 'flex-start',
        px: { xs: 0.5, sm: 1, md: 2 },
        py: 2,
        overflow: 'hidden',
        maxHeight: '100vh',
        width: '100%',
      }}
    >
      {/* Chat header */}
      <Box sx={{ width: '100%', maxWidth: '100%', mb: 1, px: { xs: 0.5, sm: 1, md: 2 } }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
          {selectedRoom.name} {selectedRoom.isGroup ? '(Group)' : '(Direct)'}
        </Typography>
      </Box>

      {/* Messages container */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          flex: 1,
          overflowY: 'auto',
          mb: 1,
          bgcolor: 'white',
          borderRadius: 2,
          border: '1px solid #e0e0e0',
          p: { xs: 1, sm: 1.5, md: 2 },
        }}
      >
        <List sx={{ padding: 0 }}>
          {messages.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center',
              minHeight: '300px',
              color: '#9ca3af'
            }}>
              <PeopleIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
              <Typography variant="body2">No messages yet</Typography>
            </Box>
          ) : (
            messages.map((message) => (
              <ListItem 
                key={message.id}
                sx={{ 
                  display: 'flex', 
                  justifyContent: message.sender === 'You' ? 'flex-end' : 'flex-start',
                  padding: 0.5
                }}
              >
                <Box
                  sx={{
                    maxWidth: { xs: '85%', sm: '80%', md: '75%' },
                    borderRadius: 2,
                    bgcolor: message.sender === 'You' ? '#d9fdd3' : '#ffffff',
                    border: message.sender === 'You' ? 'none' : '1px solid #e0e0e0',
                    p: 1.5,
                  }}
                >
                  {selectedRoom.isGroup && message.sender !== 'You' && (
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666', display: 'block' }}>
                      {message.sender}
                    </Typography>
                  )}
                  <ListItemText
                    primary={message.text}
                    secondary={formatTime(message.timestamp)}
                    sx={{ 
                      wordWrap: 'break-word',
                      mb: 0.5,
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
          width: '100%',
          maxWidth: '100%',
          borderRadius: 6,
          p: 1,
          position: 'relative',
          bgcolor: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0',
          mx: { xs: 0.5, sm: 1, md: 2 }, // Add horizontal margins on smaller screens
        }}
      >
          <TextField
            inputRef={inputRef}
            fullWidth
            variant="outlined"
            placeholder={`Type a message in ${selectedRoom.name}...`}
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
                      disabled={!inputValue.trim() || isLoading || !selectedRoom}
                      sx={{
                        bgcolor: inputValue.trim() && !isLoading && selectedRoom ? '#007bff' : 'grey.300',
                        color: 'white',
                        '&:hover': {
                          bgcolor: inputValue.trim() && !isLoading && selectedRoom ? '#0056b3' : 'grey.400',
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

export default ChatMainContent;