import React, { useState } from 'react';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Box, 
  IconButton,
  Tooltip,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import './Sidebar.css';
import CreateGroupDialog from './CreateGroupDialog';
import { useClients } from '../context/ClientContext';

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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  rooms, 
  onSelectRoom, 
  currentRoom, 
  isCollapsed, 
  onToggleCollapse,
  onCreateGroup
}) => {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
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
            {rooms.map((room: ChatRoom) => {
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
            {rooms.map((room: ChatRoom) => {
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
	</div>
    </div>
  );
};

export default Sidebar;
