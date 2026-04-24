import React, { useState, useEffect, useRef } from 'react';
import './ChatContainer.css';
import ChatRoom from './ChatRoom';
import Sidebar from './Sidebar';
import emqxApiClient from '../services/emqxApiClient';
import mqttService from '../services/mqttService';

interface ChatRoomInfo {
  id: string;
  name: string;
  isGroup: boolean;
}

interface ChatContainerProps {
  connectionSuccess?: boolean;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ connectionSuccess }) => {
  const [selectedRoom, setSelectedRoom] = useState<ChatRoomInfo | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoomInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    // Try to get saved preference from localStorage
    const savedPreference = localStorage.getItem('sidebarCollapsed');
    return savedPreference ? JSON.parse(savedPreference) : false;
  });
  const hasFetchedData = useRef(false); // Track if data has already been fetched

  // Save preference to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    setSidebarCollapsed((prev: boolean) => !prev);
  };

  useEffect(() => {
    // Prevent duplicate API calls in React StrictMode
    if (hasFetchedData.current || !connectionSuccess) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        if (connectionSuccess) {
          // Mark as fetched before starting API calls to prevent duplicate calls
          hasFetchedData.current = true;
          
          // Get group chats from EMQX API
          const groupChats = await emqxApiClient.getGroupChats();
          
          // Get active users from EMQX API
          const users = await emqxApiClient.getUserList();
          
          // Update client statuses in localStorage based on EMQX API data
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
                name: client.online ? `${client.name} (${client.emoji})` : `${client.name} (${client.emoji}) - offline`,
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
      }
    };

    fetchData();
  }, [connectionSuccess]); // Only run when connectionSuccess changes

  return (
    <div className="chat-container" style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {loading ? (
        <div className="loading" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%' 
        }}>Loading chat rooms...</div>
      ) : (
        <>
          <Sidebar 
            rooms={chatRooms} 
            onSelectRoom={setSelectedRoom} 
            currentRoom={selectedRoom}
            isCollapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
          />
          {selectedRoom ? (
            <ChatRoom room={selectedRoom} />
          ) : (
            <div className="welcome-message" style={{ 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              backgroundColor: '#ffffff'
            }}>
              <h2>选择一个聊天室开始聊天</h2>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChatContainer;