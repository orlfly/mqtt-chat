import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  IconButton, 
  TextField, 
  Typography, 
  List, 
  ListItem, 
  ListItemButton,
  ListItemText,
  CircularProgress,
  InputAdornment,
  Popover,
  Chip,
  Tooltip,
  Button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import mqttService, { Message } from '../services/mqttService';
import { useClients } from '../context/ClientContext';

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
  
  const [mentionAnchor, setMentionAnchor] = useState<HTMLElement | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  
  const { clients } = useClients();
  const currentClientId = mqttService.clientId;
  
  // 根据 senderId 获取发送者名称
  const getSenderName = (senderId: string): string => {
    if (senderId === currentClientId) {
      return mqttService.getUserInfo().name;
    }
    const client = clients.find(c => c.client_id === senderId);
    return client?.name || senderId;
  };
  
  // 根据 senderId 获取发送者 emoji
  const getSenderEmoji = (senderId: string, msgEmoji?: string): string => {
    if (senderId === currentClientId) {
      return mqttService.getUserInfo().emoji;
    }
    if (msgEmoji) return msgEmoji;
    const client = clients.find(c => c.client_id === senderId);
    return client?.emoji || '👤';
  };

  // Ensure input element receives focus when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

// Subscribe to MQTT room and handle messages
  useEffect(() => {
    if (!selectedRoom) return;

    // 清空消息列表
    setMessages([]);
    
    // 从 localStorage 加载历史消息
    const storedMessages = mqttService.loadMessagesFromStorage(selectedRoom.id);
    if (storedMessages.length > 0) {
      console.log('[ChatMainContent] Loaded', storedMessages.length, 'messages from storage');
      setMessages(storedMessages);
    }
    
    // Add message listener
    const handleMessage = (msg: Message) => {
      // 过滤自己发送的消息（避免重复添加）
      if (msg.senderId === currentClientId) {
        console.log('[ChatMainContent] Skipping own message:', msg.id);
        return;
      }
      
      setMessages(prev => {
        const exists = prev.some(m => m.id === msg.id);
        if (!exists) {
          return [...prev, msg];
        }
        return prev;
      });
    };

    mqttService.addMessageListener(handleMessage);

    return () => {
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
        return markedModule.default.parse(text || '', { breaks: true });
      } catch (error) {
        console.error('Error parsing markdown:', error);
        return text || '';
      }
    } else if (markedModule && markedModule.marked) {
      try {
        return markedModule.marked(text || '', { breaks: true });
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

  const extractMentionedClientIds = (): string[] => {
    const mentions: string[] = [];
    const regex = /@(\S+)/g;
    let match;
    while ((match = regex.exec(inputValue)) !== null) {
      const mentionedName = match[1].toLowerCase();
      const client = clients.find(c => c.name.toLowerCase() === mentionedName);
      if (client) {
        mentions.push(client.client_id);
      }
    }
    return mentions;
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
        // 群聊：提取 @mentions 获取 targetIds
        const targetIds = extractMentionedClientIds();
        console.log('Sending group message (sendMessage) to room:', selectedRoom.id, 'targetIds:', targetIds);
        await mqttService.sendMessage(inputValue, 'You', selectedRoom.id, targetIds);
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

  const getUsedMentionNames = (): string[] => {
    const mentions: string[] = [];
    const regex = /@(\S+)/g;
    let match;
    while ((match = regex.exec(inputValue)) !== null) {
      mentions.push(match[1].toLowerCase());
    }
    return mentions;
  };

  const getFilteredClients = () => {
    const usedNames = getUsedMentionNames();
    if (!mentionQuery.trim()) {
      return clients.filter(client => !usedNames.includes(client.name.toLowerCase()));
    }
    const query = mentionQuery.toLowerCase();
    return clients.filter(client => 
      !usedNames.includes(client.name.toLowerCase()) &&
      (client.name.toLowerCase().includes(query) || 
      client.client_id.toLowerCase().includes(query))
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    
    if (selectedRoom?.isGroup) {
      const cursorPos = e.target.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        if (!textAfterAt.includes(' ')) {
          setMentionQuery(textAfterAt);
          setMentionStartIndex(lastAtIndex);
          setMentionAnchor(inputRef.current);
          return;
        }
      }
    }
    setMentionAnchor(null);
    setMentionQuery('');
    setMentionStartIndex(-1);
  };

  const handleSelectMention = (clientId: string, clientName: string) => {
    const before = inputValue.slice(0, mentionStartIndex);
    const after = inputValue.slice(inputRef.current?.selectionStart || 0);
    const newValue = `${before}@${clientName} ${after}`;
    setInputValue(newValue);
    setMentionAnchor(null);
    setMentionQuery('');
    setMentionStartIndex(-1);
    inputRef.current?.focus();
  };

  const handleClearMessages = () => {
    if (selectedRoom) {
      mqttService.clearMessagesForRoom(selectedRoom.id);
      setMessages([]);
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
          px: { xs: 0.5, sm: 1, md: 2 },
          py: 2,
          overflow: 'hidden',
          width: '100%',
          backgroundColor: '#fff',
        }}
      >
        <Typography variant="h6" sx={{ color: '#9ca3af' }}>
          请选择聊天
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
        alignItems: 'stretch',
        justifyContent: 'flex-start',
        px: { xs: 0.5, sm: 1, md: 2 },
        py: 0.5,
        overflow: 'hidden',
        maxHeight: '100vh',
        width: '100%',
      }}
    >
      {/* Chat header */}
      <Box sx={{ width: '100%', maxWidth: '100%', mb: 0, bgcolor: 'white', borderRadius: 2, border: '1px solid #e0e0e0', py: 1, px: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
          {selectedRoom.name} {selectedRoom.isGroup ? '(Group)' : '(Direct)'}
        </Typography>
        <Tooltip title="清空消息">
          <IconButton onClick={handleClearMessages} size="small" sx={{ color: '#6b7280' }}>
            <DeleteIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Messages container */}
      <Box
        sx={{
          width: '100%',
          maxWidth: '100%',
          flex: 1,
          overflowY: 'auto',
          mb: 0.5,
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
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                    }}
                  >
                    {/* 发送者信息：始终显示发送者名称和图标 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5, flexWrap: 'wrap' }}>
                      <Typography variant="caption" sx={{ fontSize: '14px' }}>
                        {getSenderEmoji(message.senderId, message.senderEmoji)}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', color: '#666' }}>
                        {getSenderName(message.senderId)}
                      </Typography>
                    </Box>
                    <ListItemText
                    primary={
                      markedModule ? (
                        <Box component="span" className="markdown-content" sx={{ wordBreak: 'break-all', overflowWrap: 'break-word', display: 'block' }}>
                          <div 
                            className="markdown-content"
                            dangerouslySetInnerHTML={{ 
                              __html: parseMarkdown(message.text) 
                            }} 
                          />
                        </Box>
                      ) : (
                        <Box component="span" sx={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                          {message.text}
                        </Box>
                      )
                    }
                    secondary={formatTime(message.timestamp)}
                    sx={{ 
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
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
      <Box sx={{ display: 'flex', alignItems: 'center', height: 80 }}>
        <Paper
          sx={{
            flex: 1,
            height: 72,
            borderRadius: 6,
            p: 0.5,
            position: 'relative',
            bgcolor: 'white',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e0e0e0',
            mx: { xs: 0.5, sm: 0.5, md: 0.5 },
          }}
        >
          <TextField
            inputRef={inputRef}
            fullWidth
            variant="outlined"
            placeholder={`Type a message in ${selectedRoom.name}...`}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            multiline
            maxRows={4}
            sx={{ height: 62, '& .MuiOutlinedInput-root': { height: 62 } }}
            InputProps={{
              sx: { borderRadius: 20, py: 2, px: 2 },
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
        <Popover
          open={Boolean(mentionAnchor)}
          anchorEl={mentionAnchor}
          onClose={() => setMentionAnchor(null)}
          anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
          transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          sx={{ maxHeight: 200 }}
        >
          <List dense>
            {getFilteredClients().slice(0, 5).map(client => (
              <ListItemButton 
                key={client.client_id}
                onClick={() => handleSelectMention(client.client_id, client.name)}
              >
                <ListItemText 
                  primary={client.name} 
                  secondary={client.online ? '在线' : '离线'}
                />
              </ListItemButton>
            ))}
          </List>
        </Popover>
      </Box>
    </Box>
  );
};

export default ChatMainContent;
