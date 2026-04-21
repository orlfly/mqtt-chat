import React from 'react';
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText, Box, Typography } from '@mui/material';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import './Sidebar.css';

interface ChatRoom {
  id: string;
  name: string;
  isGroup: boolean;
}

interface SidebarProps {
  rooms: ChatRoom[];
  onSelectRoom: (room: ChatRoom) => void;
  currentRoom: ChatRoom | null;
}

const Sidebar: React.FC<SidebarProps> = ({ rooms, onSelectRoom, currentRoom }) => {
  return (
    <div className="sidebar" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ padding: '16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>聊天室</Typography>
      </Box>
      <div className="rooms-list" style={{ flex: 1, overflow: 'auto' }}>
        <List>
          {rooms.map((room) => (
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
                  }
                }}
              >
                <ListItemIcon sx={{ minWidth: 36, color: '#6b7280' }}>
                  {room.isGroup ? <PeopleIcon /> : <PersonIcon />}
                </ListItemIcon>
                <ListItemText 
                  primary={room.name} 
                  secondary={room.isGroup ? '群聊' : '私聊'}
                  sx={{ 
                    '& .MuiListItemText-primary': { 
                      fontSize: '14px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    },
                    '& .MuiListItemText-secondary': { 
                      fontSize: '12px' 
                    } 
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </div>
    </div>
  );
};

export default Sidebar;