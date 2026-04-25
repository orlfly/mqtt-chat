import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Box,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import mqttService from '../services/mqttService';
import emqxApiClient from '../services/emqxApiClient';

interface ClientOption {
  id: string;
  name: string;
  emoji: string;
  online: boolean;
}

interface CreateGroupDialogProps {
  open: boolean;
  onClose: () => void;
  onCreateGroup: (groupName: string, members: string[]) => void;
}

const CreateGroupDialog: React.FC<CreateGroupDialogProps> = ({ 
  open, 
  onClose, 
  onCreateGroup 
}) => {
  const [groupName, setGroupName] = useState('');
  const [availableClients, setAvailableClients] = useState<ClientOption[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      fetchClients();
    }
  }, [open]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      // 获取其他所有在线客户端
      const users = await emqxApiClient.getUserList();
      const allStoredClients = mqttService.getAllStoredClients();
      
      // 过滤掉当前客户端
      const filteredUsers = users.filter(user => user.clientId !== mqttService.clientId);
      
      // 合并用户信息
      const clients: ClientOption[] = filteredUsers.map(user => {
        const storedClient = allStoredClients.find(c => c.client_id === user.clientId);
        return {
          id: user.clientId,
          name: storedClient?.name || user.clientId,
          emoji: storedClient?.emoji || '👤',
          online: storedClient?.online ?? true
        };
      });

      setAvailableClients(clients);
      setSelectedMembers([]);
      setGroupName('');
      setError('');
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('Failed to fetch clients');
    } finally {
      setLoading(false);
    }
  };

  const handleMemberToggle = (clientId: string) => {
    setSelectedMembers(prev =>
      prev.includes(clientId)
        ? prev.filter(id => id !== clientId)
        : [...prev, clientId]
    );
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) {
      setError('Group name is required');
      return;
    }
    
    if (selectedMembers.length === 0) {
      setError('At least one member is required');
      return;
    }

    onCreateGroup(groupName, [mqttService.clientId, ...selectedMembers]); // 包含创建者
    handleClose();
  };

  const handleClose = () => {
    setGroupName('');
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>创建群聊</DialogTitle>
      <DialogContent dividers>
        <TextField
          autoFocus
          margin="dense"
          label="群聊名称"
          fullWidth
          variant="outlined"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          helperText="请输入群聊名称"
        />
        
        {error && (
          <Typography color="error" variant="body2" sx={{ mt: 1 }}>
            {error}
          </Typography>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            选择成员
          </Typography>
          {loading ? (
            <Typography>加载中...</Typography>
          ) : (
            <List dense>
              {availableClients.map((client) => (
                <ListItem
                  key={client.id}
                  onClick={() => handleMemberToggle(client.id)}
                  sx={{ 
                    cursor: 'pointer',
                    borderRadius: 1,
                    border: '1px solid #e0e0e0',
                    mb: 1,
                    '&:hover': { backgroundColor: '#f5f5f5' },
                    ...(selectedMembers.includes(client.id) && {
                      backgroundColor: '#e3f2fd',
                      border: '1px solid #1976d2'
                    })
                  }}
                >
                  <ListItemAvatar>
                    <Avatar 
                      sx={{ 
                        bgcolor: client.online ? '#e3f2fd' : '#e0e0e0',
                        color: client.online ? '#1976d2' : '#9e9e9e'
                      }}
                    >
                      {client.emoji}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={client.name}
                    secondary={client.online ? '在线' : '离线'}
                  />
                  <Checkbox
                    edge="end"
                    checked={selectedMembers.includes(client.id)}
                    tabIndex={-1}
                    disableRipple
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        {selectedMembers.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              已选成员 ({selectedMembers.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {selectedMembers.map((clientId) => {
                const client = availableClients.find(c => c.id === clientId);
                return client ? (
                  <Chip
                    key={clientId}
                    avatar={<Avatar>{client.emoji}</Avatar>}
                    label={client.name}
                    onDelete={() => handleMemberToggle(clientId)}
                  />
                ) : null;
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button onClick={handleCreateGroup} variant="contained" color="primary">
          创建
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateGroupDialog;