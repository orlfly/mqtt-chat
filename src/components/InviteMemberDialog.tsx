import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Checkbox,
  CircularProgress
} from '@mui/material';
import mqttService from '../services/mqttService';
import emqxApiClient from '../services/emqxApiClient';

interface ClientOption {
  id: string;
  name: string;
  emoji: string;
  online: boolean;
}

interface InviteMemberDialogProps {
  open: boolean;
  groupName: string;
  onClose: () => void;
  onInvite: (groupName: string, members: string[]) => void;
}

const InviteMemberDialog: React.FC<InviteMemberDialogProps> = ({
  open,
  groupName,
  onClose,
  onInvite
}) => {
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
      const [users, currentMembersResponse] = await Promise.all([
        emqxApiClient.getUserList(),
        emqxApiClient.getTopicSubscriptions(`group_${groupName}/bound`),
      ]);

      const currentMemberIds = new Set(
        (currentMembersResponse?.data || []).map((sub: any) => sub.clientid)
      );

      const allStoredClients = mqttService.getAllStoredClients();

      const filteredUsers = users.filter(user => user.clientId !== mqttService.clientId);

      const clients: ClientOption[] = filteredUsers
        .filter(user => !currentMemberIds.has(user.clientId))
        .map(user => {
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
      setError('');
    } catch (err) {
      console.error('Error fetching clients:', err);
      setError('获取客户端列表失败');
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

  const handleInvite = () => {
    if (selectedMembers.length === 0) {
      setError('请至少选择一个成员');
      return;
    }
    onInvite(groupName, selectedMembers);
    handleClose();
  };

  const handleClose = () => {
    setSelectedMembers([]);
    setError('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>邀请成员 - {groupName}</DialogTitle>
      <DialogContent dividers>
        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 1 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : availableClients.length === 0 ? (
          <Typography variant="body2" color="text.secondary">暂无可邀请的客户端</Typography>
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
        <Button onClick={handleInvite} variant="contained" color="primary">
          邀请
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InviteMemberDialog;
