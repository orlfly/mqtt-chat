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
  Tooltip,
  Button
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DownloadIcon from '@mui/icons-material/Download';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  }, [selectedRoom, currentClientId]);

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
        type: 'text' as const,
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

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !selectedRoom) return;

    setIsLoading(true);

    try {
      for (const file of files) {
        const base64Data = await readFileAsBase64(file);
        const userInfo = mqttService.getUserInfo();
        const localMessage: Message = {
          id: Math.random().toString(36).substr(2, 9),
          senderId: mqttService.clientId || '',
          senderEmoji: userInfo.emoji,
          timestamp: new Date(),
          type: 'file' as const,
          fileName: file.name,
          fileType: file.type,
          fileData: base64Data,
        };

        setMessages(prev => [...prev, localMessage]);

        if (selectedRoom.isGroup) {
          const targetIds = extractMentionedClientIds();
          mqttService.sendFileMessage(file.name, file.type, base64Data, selectedRoom.id, targetIds);
        } else {
          const targetClientId = selectedRoom.id.startsWith('user_')
            ? selectedRoom.id.substring(5)
            : selectedRoom.id;
          mqttService.sendPrivateFileMessage(file.name, file.type, base64Data, targetClientId, selectedRoom.id);
        }
      }
    } catch (error) {
      console.error('Failed to send file:', error);
      setMessages(prev => {
        const fileCount = e.target.files?.length || 0;
        return prev.slice(0, -fileCount);
      });
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadFile = (message: Message) => {
    if (!message.fileData || !message.fileName) return;
    const mimeType = message.fileType || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${message.fileData}`;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = message.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (message: Message): string => {
    if (!message.fileData) return '';
    const bytes = Math.ceil((message.fileData.length * 3) / 4);
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImageFile = (message: Message): boolean => {
    return !!message.fileType?.startsWith('image/');
  };

  const handleCopyMessage = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy message:', error);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {selectedRoom.isGroup ? <PeopleIcon /> : <span style={{ fontSize: '20px' }}>👤</span>}
          <Typography variant="h5" sx={{ fontWeight: 600, color: '#171717' }}>
            {selectedRoom.name}
          </Typography>
        </Box>
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
                      bgcolor: isOwnMessage ? '#2ac360' : '#f5f5f5',
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
                      <Box sx={{ flex: 1 }} />
                      {message.type !== 'file' && (
                        <Tooltip title="复制">
                          <IconButton
                            size="small"
                            onClick={() => handleCopyMessage(message.text || '')}
                            sx={{
                              opacity: 0.4,
                              '&:hover': { opacity: 1 },
                              p: 0.3,
                            }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                    {message.type === 'file' ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {isImageFile(message) && message.fileData ? (
                          <Box
                            component="img"
                            sx={{
                              maxWidth: '100%',
                              maxHeight: 200,
                              borderRadius: 1,
                              objectFit: 'contain',
                            }}
                            src={`data:${message.fileType};base64,${message.fileData}`}
                            alt={message.fileName}
                          />
                        ) : (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 1, bgcolor: '#e8e8e8', borderRadius: 1 }}>
                            <InsertDriveFileIcon sx={{ fontSize: 32, color: '#666' }} />
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {message.fileName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#888' }}>
                                {formatFileSize(message)}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        <Button
                          size="small"
                          startIcon={<DownloadIcon />}
                          onClick={() => handleDownloadFile(message)}
                          sx={{ alignSelf: 'flex-start' }}
                        >
                          下载文件
                        </Button>
                      </Box>
                    ) : (
                      <ListItemText
                      primary={
                        markedModule ? (
                          <Box component="span" className="markdown-content" sx={{ wordBreak: 'break-all', overflowWrap: 'break-word', display: 'block' }}>
                            <div 
                              className="markdown-content"
                              dangerouslySetInnerHTML={{ 
                                __html: parseMarkdown(message.text || '') 
                              }} 
                            />
                          </Box>
                        ) : (
                          <Box component="span" sx={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}>
                            {message.text || ''}
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
                    )}
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
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
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
                  <Tooltip title="发送文件">
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isLoading || !selectedRoom}
                      sx={{ color: '#6b7280', mr: 0.5 }}
                    >
                      <AttachFileIcon />
                    </IconButton>
                  </Tooltip>
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
