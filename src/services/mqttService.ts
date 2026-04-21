import mqtt, { MqttClient } from 'mqtt';
import mockMQTTService from './mockMQTTService';
import emqxApiClient from './emqxApiClient';

interface Message {
  id: string;
  text: string;
  sender: string;
  room: string;
  timestamp: Date;
}

class MQTTService {
  private client: MqttClient | null = null;
  private readonly brokerUrl: string = process.env.REACT_APP_MQTT_BROKER_URL || 'ws://localhost:8083/mqtt'; // Default MQTT broker using WebSocket
  private messageListeners: Array<(message: Message) => void> = [];
  private useMockService: boolean = false;
  
  async connectWithUserProperties(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Configure MQTT v5.0 connection with user properties and authentication
        this.client = mqtt.connect(this.brokerUrl, {
          protocolVersion: 5,
          username: process.env.REACT_APP_MQTT_USERNAME || 'admin',
          password: process.env.REACT_APP_MQTT_PASSWORD || 'public',
          properties: {
            userProperties: {
              name: 'GUI界面',
              description: '负责将人类接入智能体社区',
              emoji: '👤'
            }
          },
          // Add reconnect options to prevent excessive attempts
          reconnectPeriod: 5000, // Reconnect every 5 seconds
          connectTimeout: 30 * 1000 // 30 seconds connect timeout
        });

        this.client.on('connect', () => {
          console.log('Connected to MQTT broker with user properties');
          this.useMockService = false;
          resolve();
        });

        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          console.log('Falling back to mock MQTT service');
          // Only set useMockService = true if not already connected once
          if (!this.client?.connected) {
            this.useMockService = true;
          }
          
          // Even with connection error, we still resolve so the app can continue with mock service
          resolve();
        });

        this.client.on('message', (topic, message) => {
          try {
            const msgData = JSON.parse(message.toString());
            
            const parsedMessage: Message = {
              id: msgData.id || Math.random().toString(36).substr(2, 9),
              text: msgData.text,
              sender: msgData.sender,
              room: this.getRoomFromTopic(topic),
              timestamp: new Date(msgData.timestamp || Date.now()),
            };
            
            this.notifyMessageListeners(parsedMessage);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
      } catch (error) {
        console.error('Failed to connect to MQTT broker with user properties, falling back to mock service:', error);
        // Only set useMockService = true if not already connected once
        if (!this.client?.connected) {
          this.useMockService = true;
        }
        resolve(); // Still resolve to allow fallback to mock service
      }
    });
  }
  
  // EMQX API client integration methods
  async getConnectedClients() {
    try {
      return await emqxApiClient.getClients();
    } catch (error) {
      console.error('Error getting connected clients from EMQX:', error);
      throw error;
    }
  }

  async disconnectClient(clientId: string) {
    try {
      await emqxApiClient.disconnectClient(clientId);
    } catch (error) {
      console.error('Error disconnecting client through EMQX API:', error);
      throw error;
    }
  }

  async getBrokerStatus() {
    try {
      return await emqxApiClient.getBrokerStatus();
    } catch (error) {
      console.error('Error getting broker status from EMQX:', error);
      throw error;
    }
  }

  async getBrokerMetrics() {
    try {
      return await emqxApiClient.getBrokerMetrics();
    } catch (error) {
      console.error('Error getting broker metrics from EMQX:', error);
      throw error;
    }
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(this.brokerUrl, {
          username: process.env.REACT_APP_MQTT_USERNAME || 'admin',
          password: process.env.REACT_APP_MQTT_PASSWORD || 'public',
          // Add reconnect options to prevent excessive attempts
          reconnectPeriod: 5000, // Reconnect every 5 seconds
          connectTimeout: 30 * 1000 // 30 seconds connect timeout
        });

        this.client.on('connect', () => {
          console.log('Connected to MQTT broker');
          this.useMockService = false;
          resolve();
        });

        this.client.on('error', (err) => {
          console.error('MQTT connection error:', err);
          console.log('Falling back to mock MQTT service');
          // Only set useMockService = true if not already connected once
          if (!this.client?.connected) {
            this.useMockService = true;
          }
          
          // Even with connection error, we still resolve so the app can continue with mock service
          resolve();
        });

        this.client.on('message', (topic, message) => {
          try {
            const msgData = JSON.parse(message.toString());
            
            const parsedMessage: Message = {
              id: msgData.id || Math.random().toString(36).substr(2, 9),
              text: msgData.text,
              sender: msgData.sender,
              room: this.getRoomFromTopic(topic),
              timestamp: new Date(msgData.timestamp || Date.now()),
            };
            
            this.notifyMessageListeners(parsedMessage);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        });
      } catch (error) {
        console.error('Failed to connect to MQTT broker, falling back to mock service:', error);
        // Only set useMockService = true if not already connected once
        if (!this.client?.connected) {
          this.useMockService = true;
        }
        resolve(); // Still resolve to allow fallback to mock service
      }
    });
  }

  subscribeToRoom(roomId: string): void {
    console.log('subscribeToRoom called - useMockService:', this.useMockService, ', client connected:', this.client?.connected);
    
    // Don't permanently fall back to mock service if we have a successful connection at any point
    if (this.useMockService) {
      console.log('Using mock service for subscribe');
      mockMQTTService.subscribeToRoom(roomId);
      mockMQTTService.addMessageListener(this.handleMockMessage.bind(this));
      return;
    }

    if (this.client && this.client.connected) {
      console.log('Using real MQTT client for subscribe');
      const topic = `chat/${roomId}`;
      this.client.subscribe(topic);
      console.log(`Subscribed to room: ${roomId}`);
    } else {
      // Wait a bit for the connection to establish, then try again
      console.log('MQTT client not connected, scheduling retry for subscribe');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying subscribe with real MQTT client');
          const topic = `chat/${roomId}`;
          this.client.subscribe(topic);
          console.log(`Subscribed to room: ${roomId}`);
        } else {
          console.log('MQTT client still not connected, using mock service for subscribe');
          mockMQTTService.subscribeToRoom(roomId);
          mockMQTTService.addMessageListener(this.handleMockMessage.bind(this));
        }
      }, 500); // Wait 500ms before trying again
    }
  }

  unsubscribeFromRoom(roomId: string): void {
    console.log('unsubscribeFromRoom called - useMockService:', this.useMockService, ', client connected:', this.client?.connected);
    
    if (this.useMockService) {
      console.log('Using mock service for unsubscribe');
      mockMQTTService.unsubscribeFromRoom(roomId);
      return;
    }

    if (this.client && this.client.connected) {
      console.log('Using real MQTT client for unsubscribe');
      const topic = `chat/${roomId}`;
      this.client.unsubscribe(topic);
      console.log(`Unsubscribed from room: ${roomId}`);
    } else {
      // Wait a bit for the connection to establish, then try again
      console.log('MQTT client not connected, scheduling retry for unsubscribe');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying unsubscribe with real MQTT client');
          const topic = `chat/${roomId}`;
          this.client.unsubscribe(topic);
          console.log(`Unsubscribed from room: ${roomId}`);
        } else {
          console.log('MQTT client still not connected, using mock service for unsubscribe');
          mockMQTTService.unsubscribeFromRoom(roomId);
        }
      }, 500); // Wait 500ms before trying again
    }
  }

  sendMessage(text: string, sender: string, roomId: string): void {
    console.log('sendMessage called - useMockService:', this.useMockService, ', client connected:', this.client?.connected);
    
    if (this.useMockService) {
      console.log('Using mock service for sending message');
      mockMQTTService.sendMessage(text, sender, roomId);
      return;
    }

    if (this.client && this.client.connected) {
      console.log('Using real MQTT client for sending message');
      const topic = `chat/${roomId}`;
      const message: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        sender,
        room: roomId,
        timestamp: new Date(),
      };
      
      this.client.publish(topic, JSON.stringify(message));
      console.log(`Message sent to room ${roomId}:`, message);
    } else {
      // Wait a bit for the connection to establish, then try again
      console.log('MQTT client not connected, scheduling retry for sending message');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying message send with real MQTT client');
          const topic = `chat/${roomId}`;
          const message: Message = {
            id: Math.random().toString(36).substr(2, 9),
            text,
            sender,
            room: roomId,
            timestamp: new Date(),
          };
          
          this.client.publish(topic, JSON.stringify(message));
          console.log(`Message sent to room ${roomId}:`, message);
        } else {
          console.log('MQTT client still not connected, using mock service to send message');
          mockMQTTService.sendMessage(text, sender, roomId);
        }
      }, 500); // Wait 500ms before trying again
    }
  }

  addMessageListener(listener: (message: Message) => void): void {
    this.messageListeners.push(listener);
  }

  removeMessageListener(listener: (message: Message) => void): void {
    const index = this.messageListeners.indexOf(listener);
    if (index > -1) {
      this.messageListeners.splice(index, 1);
    }
  }

  private notifyMessageListeners(message: Message): void {
    this.messageListeners.forEach(listener => listener(message));
  }

  private handleMockMessage(message: Message): void {
    this.notifyMessageListeners(message);
  }

  private getRoomFromTopic(topic: string): string {
    console.log('Extracting room ID from topic:', topic);
    // Extract room ID from topic like "chat/room123" -> "room123"
    return topic.replace('chat/', '');
  }

  // Method to check connection status
  isConnected(): boolean {
    return this.client?.connected === true && !this.useMockService;
  }

  // Method to force refresh client status
  refreshConnectionStatus(): void {
    console.log('Refreshing connection status - client connected:', this.client?.connected, 'useMockService:', this.useMockService);
    if (this.client?.connected) {
      this.useMockService = false;
    }
  }

  // Method to ensure we're using the real MQTT service if possible
  ensureRealMqttService(): void {
    if (this.client?.connected) {
      this.useMockService = false;
      console.log('Ensured real MQTT service is being used');
    }
  }

  disconnect(): void {
    console.log('Disconnect called - useMockService:', this.useMockService, ', client exists:', !!this.client);
    if (this.useMockService) {
      console.log('Disconnecting from mock service');
      mockMQTTService.disconnect();
      return;
    }

    if (this.client) {
      console.log('Disconnecting from real MQTT broker');
      this.client.end();
      console.log('Disconnected from MQTT broker');
    }
  }
}

// Export a singleton instance
const mqttService = new MQTTService();
export default mqttService;
export type { Message }; // Export Message type for use in other files