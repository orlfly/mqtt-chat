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
  InputAdornment,
  Tooltip
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PeopleIcon from '@mui/icons-material/People';
import MenuIcon from '@mui/icons-material/Menu';
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
  
  // 获取当前用户信息
  const currentClientId = mqttService.clientId;

  // Ensure input element receives focus when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

// Subscribe to MQTT room and handle messages
  useEffect(() => {
    if (!selectedRoom) return;

    // 只添加消息监听器，群聊订阅在初始化时已完成
    
    // Add message listener
    const handleMessage = (msg: Message) => {
      setMessages(prev => {
        // Prevent duplicate messages
        const exists = prev.some(m => m.id === msg.id);
        if (!exists) {
          return [...prev, msg];
        }
        return prev;
      });
    };

    mqttService.addMessageListener(handleMessage);

    // Cleanup on unmount
    return () => {
      // 只移除消息监听器，不退订主题
      mqttService.removeMessageListener(handleMessage);
    };
  }, [selectedRoom]); // Only depend on id to prevent endless re-subscriptions

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !selectedRoom) return;

    setIsLoading(true);
    
    try {
      // 1. 创建本地消息对象并立即显示（乐观更新）
      const userInfo = mqttService.getUserInfo();
      const localMessage = {
        id: Math.random().toString(36).substr(2, 9),
        text: inputValue,
        senderId: mqttService.clientId || '',
        senderEmoji: userInfo.emoji,
        timestamp: new Date(),
      };
      
      // 添加到本地消息列表（立即显示）
      setMessages(prev => [...prev, localMessage]);
      
      console.log('ChatMainContent handleSendMessage - Room ID:', selectedRoom.id);
      console.log('ChatMainContent handleSendMessage - isGroup:', selectedRoom.isGroup);
      
      // 根据房间类型选择发送方法
      if (selectedRoom.isGroup) {
        // 群聊：调用 sendMessage
        console.log('Sending group message (sendMessage) to room:', selectedRoom.id);
        await mqttService.sendMessage(inputValue, 'You', selectedRoom.id);
      } else {
        // 私聊：提取目标客户端ID并调用 sendPrivateMessage
        const targetClientId = selectedRoom.id.startsWith('user_') 
          ? selectedRoom.id.substring(5) 
          : selectedRoom.id;
        console.log('Sending private message (sendPrivateMessage) to client:', targetClientId);
        await mqttService.sendPrivateMessage(
          inputValue, 
          mqttService.clientId || 'You', 
          targetClientId, 
          selectedRoom.id
        );
      }
      
      setInputValue('');
    } catch (error) {
      console.error('Failed to send message:', error);
      // 发送失败，移除本地消息
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
            messages.map((message) => {
              const isOwnMessage = message.senderId === currentClientId;
              return (
                <ListItem 
                  key={message.id}
                  sx={{ 
                    display: 'flex', 
                    justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                    padding: 0.5,
                    alignItems: 'flex-start'
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: { xs: '85%', sm: '80%', md: '75%' },
                      borderRadius: 2,
                      bgcolor: isOwnMessage ? '#d9ffd3' : '#f5f5f5',
                      border: isOwnMessage ? 'none' : '1px solid #e0e0e0',
                      p: 1.5,
                    }}
                  >
                    {/* 发送者信息：始终显示发送者名称和图标 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontSize: '14px' }}>
                        {message.senderEmoji || (isOwnMessage ? mqttService.getUserInfo().emoji : '👤')}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                        {isOwnMessage ? mqttService.getUserInfo().name : message.senderId}
                      </Typography>
                    </Box>
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
                      wordWrap: 'break-word',
                      mb: 0.5,
                      '& .MuiListItemText-secondary': {
                        fontSize: '0.7rem',
                        textAlign: isOwnMessage ? 'right' : 'left'
                      }
                    }}
                  />
                </Box>
              </ListItem>
              );
            })
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
          p: 0.5,
          position: 'relative',
          bgcolor: 'white',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e0e0e0',
          mx: { xs: 0.5, sm: 0.5, md: 0.5 }, // Add horizontal margins on smaller screens
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
            InputProps={{
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
            }}
          />
      </Paper>
    </Box>
  );
};

export default ChatMainContent;
