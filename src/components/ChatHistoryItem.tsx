import React from 'react';
import {
  Box,
  Typography,
  ListItem,
  ListItemButton,
  ListItemIcon,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import PushPinIcon from '@mui/icons-material/PushPin';
import DeleteIcon from '@mui/icons-material/Delete';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import { format } from 'date-fns';

// Define the Chat type
interface Chat {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage?: string;
  timestamp?: Date;
}

interface ChatHistoryItemProps {
  chat: Chat;
  isSelected: boolean;
  onSelect: (chat: Chat) => void;
}

export const ChatHistoryItem: React.FC<ChatHistoryItemProps> = ({ 
  chat, 
  isSelected, 
  onSelect 
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  const formatDate = (date?: Date): string => {
    if (!date) return '';
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return format(date, 'HH:mm');
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return format(date, 'EEE');
    } else {
      return format(date, 'MM/dd');
    }
  };

  return (
    <ListItem 
      key={chat.id} 
      disablePadding 
      sx={{ 
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateX(0) scale(1)',
        opacity: 1,
        maxHeight: '80px',
        paddingY: 'initial',
        filter: 'blur(0px)'
      }}
    >
      <ListItemButton 
        selected={isSelected} 
        onClick={() => onSelect(chat)}
        sx={{ 
          borderRadius: '8px',
          px: 1,
          display: 'flex',
          alignItems: 'center',
          opacity: 1,
          position: 'relative',
          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
          // When menu is open keep hover background
          backgroundColor: open ? '#f9f9f9' : 'transparent',
          '&.Mui-selected': {
            backgroundColor: '#f5f5f5',
            border: '1px solid #e5e5e5',
            '&:hover': {
              backgroundColor: '#eeeeee',
            }
          },
          '&:hover': {
            backgroundColor: '#f9f9f9',
            '& .more-button': {
              opacity: 1,
            }
          }
        }}
      >
        <ListItemIcon sx={{ 
          minWidth: 32, 
          color: '#6b7280', 
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          mr: 1
        }}>
          <Tooltip
            title={chat.name}
            placement="top"
            arrow
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: '#000000',
                  color: '#ffffff',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  px: 1.5,
                  py: 0.5,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '& .MuiTooltip-arrow': {
                    color: '#000000',
                  },
                },
              },
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -4],
                    },
                  },
                ],
              },
            }}
          >
            <Box sx={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              backgroundColor: '#f8f9fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              border: '1px solid #e9ecef',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.06)',
              '&:hover': {
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
                transform: 'scale(1.02)',
              }
            }}>
              {chat.isGroup ? (
                <PeopleIcon sx={{ fontSize: 16, color: '#6b7280' }} />
              ) : (
                <PersonIcon sx={{ fontSize: 16, color: '#6b7280' }} />
              )}
            </Box>
          </Tooltip>
        </ListItemIcon>
        
        {/* Middle text area */}
        <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              lineHeight: 1.4,
              fontSize: '14px',
              letterSpacing: '-0.01em'
            }}
          >
            {chat.name}
          </Typography>
          {chat.lastMessage && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 400,
                color: '#6b7280',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                lineHeight: 1.3,
                fontSize: '12px',
                mt: 0.25
              }}
            >
              {chat.lastMessage}
            </Typography>
          )}
        </Box>
        
        {/* Right side - time and menu */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          justifyContent: 'center',
          minHeight: '44px',
          position: 'relative'
        }}>
          {chat.timestamp && (
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#9ca3af',
                fontSize: '11px',
                lineHeight: 1.2,
                mb: 0.75,
                fontWeight: 400,
                letterSpacing: '0.01em'
              }}
            >
              {formatDate(chat.timestamp)}
            </Typography>
          )}
          
          {/* More options button */}
          <Tooltip 
            title="More options" 
            placement="top"
            slotProps={{
              tooltip: {
                sx: {
                  bgcolor: '#000000',
                  color: '#ffffff',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 500,
                  px: 1.5,
                  py: 0.5,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  '& .MuiTooltip-arrow': {
                    color: '#000000',
                  },
                },
              },
              popper: {
                modifiers: [
                  {
                    name: 'offset',
                    options: {
                      offset: [0, -4],
                    },
                  },
                ],
              },
            }}
          >
            <IconButton
              className="more-button"
              size="small"
              onClick={handleMenuClick}
              sx={{
                width: '24px',
                height: '20px',
                borderRadius: '6px',
                bgcolor: 'transparent',
                color: '#9ca3af',
                opacity: 0,
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                p: 0,
                minWidth: 'auto',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                  color: '#374151',
                  transform: 'scale(1.05)',
                },
              }}
            >
              <MoreHorizIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </ListItemButton>

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 120,
              borderRadius: '12px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
              border: 'none',
              backgroundColor: '#ffffff',
              '& .MuiMenuItem-root': {
                borderRadius: '6px',
                fontSize: '14px',
                minHeight: '36px',
                color: '#1f2937',
                fontWeight: 400,
                display: 'flex',
                alignItems: 'center',
                '&:hover': {
                  backgroundColor: '#f8f9fa',
                },
                '&.delete-menu-item': {
                  color: '#ef4444',
                  '&:hover': {
                    backgroundColor: '#fef2f2',
                  },
                },
              },
            },
          },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <PushPinIcon sx={{ 
            fontSize: 16, 
            mr: 2, 
            color: '#6b7280'
          }} />
          Pin
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <DeleteIcon sx={{ 
            fontSize: 16, 
            mr: 2, 
            color: '#ef4444'
          }} />
          Delete
        </MenuItem>
      </Menu>
    </ListItem>
  );
};