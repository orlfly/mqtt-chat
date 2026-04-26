import React, { useState, useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';
import ChatMainContent from './ChatMainContent'; 
import mqttService from '../services/mqttService';
import emqxApiClient from '../services/emqxApiClient';
import CreateGroupDialog from './CreateGroupDialog';
import { useClients } from '../context/ClientContext';

interface ChatRoomInfo {
  id: string;
  name: string;
  isGroup: boolean;
}

interface ChatContainerProps {
  connectionSuccess: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ connectionSuccess }) => {
  const [chatRooms, setChatRooms] = useState<ChatRoomInfo[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hasFetchedData = useRef(false);
  const { refreshClients } = useClients();

  useEffect(() => {
    if (hasFetchedData.current || !connectionSuccess) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        if (connectionSuccess) {
          hasFetchedData.current = true;
          
          const groupChats = await emqxApiClient.getGroupChats();
          
          for (const groupName of groupChats) {
            mqttService.subscribeToRoom(groupName);
          }
          
          const users = await emqxApiClient.getUserList();
          
          mqttService.updateClientStatusesFromEmqxApi(users);
          
          // Combine group chats and users from localStorage into a single list
          const rooms: ChatRoomInfo[] = [];
          
          // Add group chats
          groupChats.forEach(groupName => {
            rooms.push({
              id: `group_${groupName}`,
              name: groupName,
              isGroup: true
            });
          });
          
          // Add unique users from localStorage (using stored details)
          const allStoredClients = mqttService.getAllStoredClients();
          const userIdMap = new Map();
          
          // Add users from stored client details
          allStoredClients.forEach(client => {
            // Skip if it's the page's own client
            if (client.client_id === mqttService.clientId) {
              return;
            }
            
            if (!userIdMap.has(client.client_id)) {
              rooms.push({
                id: `user_${client.client_id}`,
                name: client.online ? client.name : `${client.name} - offline`,
                isGroup: false
              });
              userIdMap.set(client.client_id, true);
            }
          });
          
          setChatRooms(rooms);
        } else {
          // Fallback to mock data if connection failed
          setChatRooms([
            { id: '1', name: 'General', isGroup: true },
            { id: '2', name: 'Random', isGroup: true },
            { id: '3', name: 'John Doe', isGroup: false },
            { id: '4', name: 'Jane Smith', isGroup: false },
          ]);
        }
      } catch (error) {
        console.error('Error fetching chat rooms from EMQX:', error);
        // Fallback to mock data if API fails
        setChatRooms([
          { id: '1', name: 'General', isGroup: true },
          { id: '2', name: 'Random', isGroup: true },
          { id: '3', name: 'John Doe', isGroup: false },
          { id: '4', name: 'Jane Smith', isGroup: false },
        ]);
      } finally {
        setLoading(false);
        refreshClients();
      }
    };

    fetchData();
  }, [connectionSuccess, refreshClients]);

  // Function to add a new group chat to the list
  const addGroupChat = (groupName: string) => {
    const newGroupRoom: ChatRoomInfo = {
      id: `group_${groupName}`,
      name: groupName,
      isGroup: true
    };
    
    setChatRooms(prevRooms => {
      // Check if group already exists
      const exists = prevRooms.some(room => room.id === newGroupRoom.id);
      if (!exists) {
        return [...prevRooms, newGroupRoom];
      }
      return prevRooms;
    });
    
    // Automatically select the newly created group
    setSelectedRoom(newGroupRoom);
  };

  const handleSelectRoom = (room: ChatRoomInfo) => {
    setSelectedRoom(room);
  };

  const handleCreateGroup = async (groupName: string, members: string[]) => {
    try {
      addGroupChat(groupName);
      
      mqttService.subscribeToRoom(groupName);
      
      mqttService.sendGroupInvite(members, groupName);
      
      console.log('Group created successfully:', groupName, 'with members:', members);
    } catch (error) {
      console.error('Failed to create group:', error);
    }
  };

  const handleCreateGroupDialogOpen = () => {
    setCreateGroupOpen(true);
  };

  const handleDeleteGroup = (groupId: string) => {
    setChatRooms(prevRooms => prevRooms.filter(room => room.id !== groupId));
  };

  const handleCreateGroupDialogClose = () => {
    setCreateGroupOpen(false);
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>Loading...</Box>;
  }

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
      <Sidebar 
        rooms={chatRooms} 
        onSelectRoom={handleSelectRoom} 
        currentRoom={selectedRoom}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onCreateGroup={handleCreateGroupDialogOpen}
        onDeleteGroup={handleDeleteGroup}
      />
      <ChatMainContent selectedRoom={selectedRoom} />
      
      <CreateGroupDialog
        open={createGroupOpen}
        onClose={handleCreateGroupDialogClose}
        onCreateGroup={handleCreateGroup}
      />
    </Box>
  );
};

export default ChatContainer;