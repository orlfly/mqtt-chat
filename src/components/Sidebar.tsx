import React, { useState } from 'react';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Box, 
  Typography,
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Popover
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import './Sidebar.css';
import CreateGroupDialog from './CreateGroupDialog';
import { useClients } from '../context/ClientContext';
import mqttService from '../services/mqttService';

const drawerWidth = 420; // 280 * 1.5
const collapsedWidth = 90; // 60 * 1.5

interface ChatRoom {
  id: string;
  name: string;
  isGroup: boolean;
}

interface SidebarProps {
  rooms: ChatRoom[];
  onSelectRoom: (room: ChatRoom) => void;
  currentRoom: ChatRoom | null;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onCreateGroup: () => void;
  onDeleteGroup: (groupId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  rooms, 
  onSelectRoom, 
  currentRoom, 
  isCollapsed, 
  onToggleCollapse,
  onCreateGroup,
  onDeleteGroup
}) => {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDetailAnchor, setUserDetailAnchor] = useState<HTMLElement | null>(null);
  const [deleteGroupOpen, setDeleteGroupOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const { clients } = useClients();

  const handleCreateGroupDialogOpen = () => {
    setCreateGroupOpen(true);
  };

  const handleCreateGroupDialogClose = () => {
    setCreateGroupOpen(false);
  };

  const handleCreateGroup = async (groupName: string, members: string[]) => {
    try {
      console.log('Creating group:', groupName, 'with members:', members);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleViewUserDetail = (clientId: string, event?: React.MouseEvent) => {
    setSelectedUserId(clientId);
    if (event?.currentTarget) {
      setUserDetailAnchor(event.currentTarget as HTMLElement);
    }
    setUserDetailOpen(true);
  };

  const handleCloseUserDetail = () => {
    setUserDetailOpen(false);
    setUserDetailAnchor(null);
    setSelectedUserId(null);
  };

  const handleOpenDeleteGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setDeleteGroupOpen(true);
  };

  const handleCloseDeleteGroup = () => {
    setDeleteGroupOpen(false);
    setSelectedGroupId(null);
  };

  const handleConfirmDeleteGroup = () => {
    if (selectedGroupId) {
      const groupName = selectedGroupId.startsWith('group_') 
        ? selectedGroupId.substring(6) 
        : selectedGroupId;
      
      const groupMembers = clients.map(c => c.client_id);
      mqttService.deleteGroup(groupName, groupMembers);
      console.log('Group deleted:', groupName);
      
      if (currentRoom?.id === selectedGroupId) {
        onSelectRoom({ id: '', name: '', isGroup: false });
      }
      
      onDeleteGroup(selectedGroupId);
    }
    handleCloseDeleteGroup();
  };

  const getUserDetail = () => {
    if (!selectedUserId) return null;
    return mqttService.getClientDetails(selectedUserId);
  };

  const filteredRooms = rooms.filter((room: ChatRoom) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return room.name.toLowerCase().includes(query);
  });
  return (
    <div 
      className="sidebar" 
      style={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        width: isCollapsed ? collapsedWidth : drawerWidth,
        borderRight: isCollapsed ? 'none' : '1px solid #e0e0e0',
        backgroundColor: isCollapsed ? 'transparent' : '#fff',
        transition: 'width 0.3s ease, background-color 0.3s ease, border-right 0.3s ease',
        overflow: 'hidden'
      }}
    >
      {/* Header with toggle button and search */}
      <Box 
        sx={{ 
          padding: isCollapsed ? '8px' : '16px', 
          borderBottom: isCollapsed ? 'none' : '1px solid #e0e0e0', 
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'space-between'
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
              <TextField
                size="small"
                placeholder="搜索聊天..."
                variant="outlined"
                fullWidth
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ 
                  mr: 1,
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#f9fafb',
                  }
                }}
              />
              <Tooltip title="创建群聊" placement="top">
                <IconButton
                  size="small"
                  sx={{
                    backgroundColor: '#e3f2fd',
                    color: '#1976d2',
                    borderRadius: '4px', // 方形边角
                    width: 36,
                    height: 36,
                    '&:hover': {
                      backgroundColor: '#bbdefb',
                    },
                  }}
                  onClick={onCreateGroup}
                >
                  +
                </IconButton>
              </Tooltip>
            </Box>
            <Tooltip title="Collapse sidebar" placement="right">
              <IconButton
                onClick={onToggleCollapse}
                size="small"
                sx={{
                  color: '#6b7280',
                  '&:hover': {
                    backgroundColor: '#e5e7eb',
                    color: '#1f2937',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
          </Box>
        )}
        {isCollapsed && (
          <Tooltip title="Expand sidebar" placement="right">
            <IconButton
              onClick={onToggleCollapse}
              size="small"
              sx={{
                color: '#6b7280',
                '&:hover': {
                  backgroundColor: '#e5e7eb',
                  color: '#1f2937',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MenuOpenIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Rooms list */}
      {!isCollapsed && (
        <div className="rooms-list" style={{ flex: 1, overflow: 'auto' }}>
          <List>
            {filteredRooms.map((room: ChatRoom) => {
              let isOnline = true;
              let clientEmoji = '';
              let displayName = room.name;
              
              if (!room.isGroup) {
                const clientId = room.id.startsWith('user_') ? room.id.substring(5) : room.id;
                const client = clients.find(c => c.client_id === clientId);
                
                if (client) {
                  isOnline = client.online === true;
                  clientEmoji = client.emoji || '👤';
                  displayName = client.name || room.name;
                }
              }

              return (
                <ListItem key={room.id} disablePadding>
                  <ListItemButton
                    selected={currentRoom?.id === room.id}
                    onClick={() => onSelectRoom(room)}
                    sx={{
                      borderRadius: '8px',
                      margin: '4px 8px',
                      '&.Mui-selected': {
                        backgroundColor: '#e3f2fd',
                        '&:hover': {
                          backgroundColor: '#bbdefb',
                        }
                      },
                      opacity: !room.isGroup && !isOnline ? 0.6 : 1,
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: '#6b7280', fontSize: '20px' }}>
                      {room.isGroup ? <PeopleIcon /> : 
                        <span style={{ fontSize: '20px' }}>{clientEmoji || '👤'}</span>
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary={displayName} 
                      secondary={room.isGroup ? '群聊' : isOnline ? '在线' : '离线'}
                      sx={{ 
                        '& .MuiListItemText-primary': { 
                          fontSize: '14px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        },
                        '& .MuiListItemText-secondary': { 
                          fontSize: '12px',
                          color: isOnline ? '#6b7280' : '#ccc'
                        } 
                      }}
                    />
                    {room.isGroup ? (
                      <Tooltip title="删除群聊">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenDeleteGroup(room.id);
                          }}
                          sx={{ color: '#9ca3af', '&:hover': { color: '#ef4444' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    ) : (
                      <Tooltip title="查看详情">
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            const clientId = room.id.startsWith('user_') ? room.id.substring(5) : room.id;
                            setSelectedUserId(clientId);
                            setUserDetailAnchor(e.currentTarget as HTMLElement);
                            setUserDetailOpen(true);
                          }}
                          sx={{ color: '#9ca3af', '&:hover': { color: '#007bff' } }}
                        >
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        </div>
      )}

      {/* Collapsed view - show room icons */}
      {isCollapsed && (
        <div className="rooms-list-collapsed" style={{ flex: 1, overflow: 'auto' }}>
          <List>
            {filteredRooms.map((room: ChatRoom) => {
              let isOnline = true;
              let clientEmoji = '👤';
              let displayName = room.name;
              
              if (!room.isGroup) {
                const clientId = room.id.startsWith('user_') ? room.id.substring(5) : room.id;
                const client = clients.find(c => c.client_id === clientId);
                
                if (client) {
                  isOnline = client.online === true;
                  clientEmoji = client.emoji || '👤';
                  displayName = client.name || room.name;
                }
              }

              return (
                <Tooltip 
                  title={`${displayName} (${room.isGroup ? '群聊' : (isOnline ? '在线' : '离线')})`} 
                  placement="right" 
                  key={room.id}
                >
                  <ListItem disablePadding sx={{ justifyContent: 'center', margin: '8px 0' }}>
                    <ListItemButton
                      selected={currentRoom?.id === room.id}
                      onClick={() => onSelectRoom(room)}
                      sx={{
                        borderRadius: '8px',
                        padding: '8px',
                        justifyContent: 'center',
                        '&.Mui-selected': {
                          backgroundColor: '#e3f2fd',
                          '&:hover': {
                            backgroundColor: '#bbdefb',
                          }
                        },
                        opacity: !room.isGroup && !isOnline ? 0.6 : 1,
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: 'auto', 
                        color: !room.isGroup && !isOnline ? '#ccc' : '#6b7280',
                        justifyContent: 'center',
                        fontSize: '20px'
                      }}>
                        {room.isGroup ? <PeopleIcon /> : 
                          <span style={{ fontSize: '20px' }}>{clientEmoji}</span>
                        }
                      </ListItemIcon>
                    </ListItemButton>
                  </ListItem>
                </Tooltip>
              );
            })}
          </List>
        </div>
      )}
        <div>
<CreateGroupDialog
            open={createGroupOpen}
            onClose={handleCreateGroupDialogClose}
            onCreateGroup={handleCreateGroup}
          />
        <Popover
            open={userDetailOpen}
            anchorEl={userDetailAnchor}
            onClose={handleCloseUserDetail}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{ mt: -1 }}
          >
          <Box sx={{ p: 2, minWidth: 200 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>用户详情</Typography>
            {(() => {
              const detail = getUserDetail();
              if (!detail) {
                return <Typography variant="body2" color="text.secondary">未找到用户信息</Typography>;
              }
              return (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="body2"><strong>客户端ID:</strong> {detail.client_id}</Typography>
                  <Typography variant="body2"><strong>名称:</strong> {detail.name}</Typography>
                  <Typography variant="body2"><strong>描述:</strong> {detail.description || '无'}</Typography>
                  <Typography variant="body2"><strong>状态:</strong> {detail.online ? '在线' : '离线'}</Typography>
                </Box>
              );
            })()}
          </Box>
        </Popover>
        <Dialog open={deleteGroupOpen} onClose={handleCloseDeleteGroup}>
          <DialogTitle>删除群聊</DialogTitle>
          <DialogContent>
            <DialogContentText>
              确定要删除这个群聊吗？此操作无法撤销，群聊中的所有成员都将收到解散通知。
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDeleteGroup}>取消</Button>
            <Button onClick={handleConfirmDeleteGroup} color="error">确定</Button>
          </DialogActions>
        </Dialog>
    </div>
    </div>
  );
};

export default Sidebar;
