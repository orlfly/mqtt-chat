import React from 'react';
import { 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Box, 
  Typography,
  IconButton,
  Tooltip
} from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import './Sidebar.css';

const drawerWidth = 280;
const collapsedWidth = 60;

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
}

const Sidebar: React.FC<SidebarProps> = ({ 
  rooms, 
  onSelectRoom, 
  currentRoom, 
  isCollapsed, 
  onToggleCollapse 
}) => {
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
      {/* Header with toggle button */}
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
            <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1 }}>聊天室</Typography>
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
              // Extract client ID for user rooms to get online status from localStorage
              let isOnline = true; // Default to true for group chats
              let clientEmoji = ''; // For user rooms with stored details
              
              if (!room.isGroup) {
                // For user rooms, extract the client ID and check online status
                const clientId = room.id.startsWith('user_') ? room.id.substring(5) : room.id;
                const storedClientStr = localStorage.getItem(`client-${clientId}`);
                
                if (storedClientStr) {
                  try {
                    const storedClient = JSON.parse(storedClientStr);
                    isOnline = storedClient.online === true;
                    clientEmoji = storedClient.emoji || '';
                  } catch (e) {
                    console.error(`Error parsing client details for ${clientId}:`, e);
                  }
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
                      opacity: !room.isGroup && !isOnline ? 0.6 : 1, // Dim offline users
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 36, color: '#6b7280' }}>
                      {room.isGroup ? <PeopleIcon /> : 
                        isOnline ? <PersonIcon /> : <PersonIcon style={{color: '#ccc'}} /> // Grayed out for offline users
                      }
                    </ListItemIcon>
                    <ListItemText 
                      primary={room.name} 
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
                          color: isOnline ? '#6b7280' : '#ccc' // Different color for offline status
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
              // Extract client ID for user rooms to get online status from localStorage
              let isOnline = true; // Default to true for group chats
              
              if (!room.isGroup) {
                // For user rooms, extract the client ID and check online status
                const clientId = room.id.startsWith('user_') ? room.id.substring(5) : room.id;
                const storedClientStr = localStorage.getItem(`client-${clientId}`);
                
                if (storedClientStr) {
                  try {
                    const storedClient = JSON.parse(storedClientStr);
                    isOnline = storedClient.online === true;
                  } catch (e) {
                    console.error(`Error parsing client details for ${clientId}:`, e);
                  }
                }
              }

              return (
                <Tooltip 
                  title={`${room.name} (${room.isGroup ? '群聊' : (isOnline ? '在线' : '离线')})`} 
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
                        opacity: !room.isGroup && !isOnline ? 0.6 : 1, // Dim offline users in collapsed view too
                      }}
                    >
                      <ListItemIcon sx={{ 
                        minWidth: 'auto', 
                        color: !room.isGroup && !isOnline ? '#ccc' : '#6b7280', // Gray out offline user icons
                        justifyContent: 'center'
                      }}>
                        {room.isGroup ? <PeopleIcon /> : 
                          isOnline ? <PersonIcon /> : <PersonIcon style={{color: '#ccc'}} /> // Grayed out for offline users
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
    </div>
  );
};

export default Sidebar;