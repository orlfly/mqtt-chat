import React, { useState, useEffect } from 'react';
import './ChatContainer.css';
import ChatRoom from './ChatRoom';
import Sidebar from './Sidebar';
import emqxApiClient from '../services/emqxApiClient';

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (connectionSuccess) {
          // Get group chats from EMQX API
          const groupChats = await emqxApiClient.getGroupChats();
          
          // Get active users from EMQX API
          const users = await emqxApiClient.getUserList();
          
          // Combine group chats and users into a single list
          const rooms: ChatRoomInfo[] = [];
          
          // Add group chats
          groupChats.forEach(groupName => {
            rooms.push({
              id: `group_${groupName}`,
              name: groupName,
              isGroup: true
            });
          });
          
          // Add unique users (based on clientId)
          const userIdMap = new Map();
          users.forEach(user => {
            if (!userIdMap.has(user.clientId)) {
              rooms.push({
                id: `user_${user.clientId}`,
                name: user.username || user.clientId,
                isGroup: false
              });
              userIdMap.set(user.clientId, true);
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