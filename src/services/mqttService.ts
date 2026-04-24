import mqtt, { MqttClient } from 'mqtt';
import mockMQTTService from './mockMQTTService';
import emqxApiClient from './emqxApiClient';
import appConfig from '../config/appConfig';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: Date;
}

interface ClientDetail {
  client_id: string;
  name: string;
  description: string;
  emoji: string;
  online: boolean;
}

interface UserProperties {
  name: string;
  description: string;
  emoji: string;
}

class MQTTService {
  private client: MqttClient | null = null;
  private readonly brokerUrl: string = process.env.REACT_APP_MQTT_BROKER_URL || 'ws://localhost:8083/mqtt';
  private messageListeners: Array<(message: Message) => void> = [];
  private useMockService: boolean = false;
  private hasConnectedOnce: boolean = false;
  public clientId: string = appConfig.mqtt.clientId;
  private userProperties: UserProperties = {
    name: appConfig.mqtt.clientId,
    description: '负责将人类接入智能体社区',
    emoji: '👤'
  };
  
  async connectWithUserProperties(): Promise<void> {
    if (this.hasConnectedOnce && this.client?.connected) {
      console.log('Already connected, skipping connect');
      return Promise.resolve();
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(this.brokerUrl, {
          clientId: appConfig.mqtt.clientId,
          protocolVersion: 5,
          username: process.env.REACT_APP_MQTT_USERNAME || 'admin',
          password: process.env.REACT_APP_MQTT_PASSWORD || 'public',
          properties: {
            userProperties: {
              name: appConfig.mqtt.clientId,
              description: '负责将人类接入智能体社区',
              emoji: '👤'
            }
          },
          reconnectPeriod: 5000,
          connectTimeout: 30 * 1000
        });

        this.client?.on('connect', () => {
          console.log('Connected to MQTT broker with user properties');
          this.useMockService = false;
          this.hasConnectedOnce = true;
          
          const inboundTopic = `${this.clientId}/inbound`;
          console.log('Subscribing to inbound topic:', inboundTopic);
          this.client?.subscribe(inboundTopic, (err, granted) => {
            if (err) {
              console.error('Failed to subscribe to inbound topic:', inboundTopic, 'Error:', err);
            } else {
              console.log('Successfully subscribed to inbound topic:', inboundTopic, 'Granted:', granted);
            }
          });
          
          resolve();
        });

        this.client?.on('error', (err) => {
          console.error('MQTT connection error:', err);
          console.log('Falling back to mock MQTT service');
          if (!this.client?.connected) {
            this.useMockService = true;
          }
          resolve();
        });

        this.client?.on('message', (topic, message) => {
          console.log('[connectWithUserProperties] Received message on topic:', topic);
          console.log('[connectWithUserProperties] Raw message:', message.toString());
          try {
            const msgData = JSON.parse(message.toString());
            const parsedMessage: Message = {
              id: msgData.id || Math.random().toString(36).substr(2, 9),
              text: msgData.text,
              sender: msgData.sender,
              timestamp: new Date(msgData.timestamp || Date.now()),
            };
            console.log('[connectWithUserProperties] Parsed message:', parsedMessage);
            this.notifyMessageListeners(parsedMessage);
          } catch (error) {
            console.error('[connectWithUserProperties] Error parsing message:', error);
          }
        });
      } catch (error) {
        console.error('Failed to connect to MQTT broker with user properties:', error);
        if (!this.client?.connected) {
          this.useMockService = true;
        }
        resolve();
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

  subscribeToRoom(roomId: string): void {
    console.log('subscribeToRoom called - useMockService:', this.useMockService, ', client connected:', this.client?.connected, 'Room ID:', roomId);
    
    // Determine if this is a special topic format (contains '/')
    // If roomId contains '/', use it directly as the full topic
    // Otherwise, treat it as a regular room and prepend 'chat/'
    let topic: string;
    if (roomId.includes('/')) {
      topic = roomId;
    } else {
      topic = `chat/${roomId}`;
    }
    
    console.log('Final subscription topic will be:', topic);
    
    // Don't permanently fall back to mock service if we have a successful connection at any point
    if (this.useMockService) {
      console.log('Using mock service for subscribe to room:', roomId, 'Topic:', topic);
      mockMQTTService.subscribeToRoom(roomId);
      mockMQTTService.addMessageListener(this.handleMockMessage.bind(this));
      return;
    }

    if (this.client && this.client.connected) {
      console.log('Using real MQTT client for subscribe to room:', roomId, 'Topic:', topic);
      this.client.subscribe(topic, (err, granted) => {
        if (err) {
          console.error('Failed to subscribe to topic:', topic, 'Error:', err);
        } else {
          console.log('Successfully subscribed to room topic:', topic, 'Granted:', granted);
        }
      });
      console.log(`Subscribed to room: ${roomId} with topic: ${topic}`);
    } else {
      // Wait a bit for the connection to establish, then try again
      console.log('MQTT client not connected, scheduling retry for subscribe to room:', roomId, 'Topic:', topic);
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying subscribe with real MQTT client for room:', roomId, 'Topic:', topic);
          this.client.subscribe(topic, (err, granted) => {
            if (err) {
              console.error('Failed to subscribe to topic after retry:', topic, 'Error:', err);
            } else {
              console.log('Successfully subscribed to room topic after retry:', topic, 'Granted:', granted);
            }
          });
          console.log(`Subscribed to room after retry: ${roomId} with topic: ${topic}`);
        } else {
          console.log('MQTT client still not connected, using mock service for subscribe to room:', roomId, 'Topic:', topic);
          mockMQTTService.subscribeToRoom(roomId);
          mockMQTTService.addMessageListener(this.handleMockMessage.bind(this));
        }
      }, 500); // Wait 500ms before trying again
    }
  }

  unsubscribeFromRoom(roomId: string): void {
    console.log('unsubscribeFromRoom called - useMockService:', this.useMockService, ', client connected:', this.client?.connected);
    
    // Determine if this is a special topic format (contains '/')
    // If roomId contains '/', use it directly as the full topic
    // Otherwise, treat it as a regular room and prepend 'chat/'
    let topic: string;
    if (roomId.includes('/')) {
      topic = roomId;
    } else {
      topic = `chat/${roomId}`;
    }
    
    console.log('Final unsubscription topic will be:', topic);
    
    if (this.useMockService) {
      console.log('Using mock service for unsubscribe');
      mockMQTTService.unsubscribeFromRoom(roomId);
      return;
    }

    if (this.client && this.client.connected) {
      console.log('Using real MQTT client for unsubscribe');
      this.client.unsubscribe(topic);
      console.log(`Unsubscribed from room: ${roomId} with topic: ${topic}`);
    } else {
      // Wait a bit for the connection to establish, then try again
      console.log('MQTT client not connected, scheduling retry for unsubscribe');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying unsubscribe with real MQTT client');
          this.client.unsubscribe(topic);
          console.log(`Unsubscribed from room: ${roomId} with topic: ${topic}`);
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
        timestamp: new Date(),
      };
      
      this.client.publish(topic, JSON.stringify(message));
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
            timestamp: new Date(),
          };
          
          this.client.publish(topic, JSON.stringify(message));
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

  storeClientDetails(clientId: string, details: Omit<ClientDetail, 'client_id'>): void {
    const key = `client-${clientId}`;
    const clientDetail: ClientDetail = { client_id: clientId, ...details };
    localStorage.setItem(key, JSON.stringify(clientDetail));
  }

  getClientDetails(clientId: string): ClientDetail | null {
    const key = `client-${clientId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error(`Error parsing client details for ${clientId}:`, e);
        return null;
      }
    }
    return null;
  }

  updateClientOnlineStatus(clientId: string, online: boolean): void {
    const details = this.getClientDetails(clientId);
    if (details) {
      details.online = online;
      this.storeClientDetails(clientId, details);
    }
  }

  getAllStoredClients(): ClientDetail[] {
    const clients: ClientDetail[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('client-')) {
        const clientId = key.substring(7);
        const details = this.getClientDetails(clientId);
        if (details) {
          clients.push(details);
        }
      }
    }
    return clients;
  }

  updateClientStatusesFromEmqxApi(emqxClients: Array<{ clientId: string; username?: string }>): void {
    const allStored = this.getAllStoredClients();
    allStored.forEach(client => {
      client.online = false;
      this.storeClientDetails(client.client_id, client);
    });

    emqxClients.forEach(emqxClient => {
      const clientId = emqxClient.clientId;
      const existing = this.getClientDetails(clientId);
      if (existing) {
        existing.online = true;
        this.storeClientDetails(clientId, existing);
      } else {
        this.storeClientDetails(clientId, {
          name: emqxClient.clientId,
          description: '',
          emoji: '',
          online: true,
        });
      }
    });
  }

  checkAndUpdateClientDetails(senderClientId: string): void {
    const details = this.getClientDetails(senderClientId);
    if (details && details.name === senderClientId) {
      this.storeClientDetails(senderClientId, {
        name: senderClientId,
        description: details.description,
        emoji: details.emoji,
        online: true,
      });
    }
  }

  sendPrivateMessage(text: string, sender: string, targetClientId: string, targetRoom: string): void {
    console.log('sendPrivateMessage called - useMockService:', this.useMockService, ', client connected:', this.client?.connected);
    console.log('Target client ID:', targetClientId, 'Target room:', targetRoom);
    
    if (this.useMockService) {
      console.log('Using mock service for private message');
      mockMQTTService.sendMessage(text, sender, targetRoom);
      return;
    }

    if (this.client && this.client.connected) {
      const topic = `${targetClientId}/inbound`;
      console.log('Publishing private message to topic:', topic);
      const message: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        sender,
        timestamp: new Date(),
      };
      
      console.log('Sending private message:', message);
      this.client.publish(topic, JSON.stringify(message), {
        properties: {
          userProperties: {
            name: this.userProperties.name,
            description: this.userProperties.description,
            emoji: this.userProperties.emoji,
            reply_to: `${this.clientId}/inbound`,
          },
        },
      });
      console.log('Published private message to topic:', topic);
    } else {
      console.log('MQTT client not connected, scheduling retry for private message');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying private message send with real MQTT client');
          const topic = `${targetClientId}/inbound`;
          const message: Message = {
            id: Math.random().toString(36).substr(2, 9),
            text,
            sender,
            timestamp: new Date(),
          };
          
          console.log('Sending private message after retry:', message);
          this.client.publish(topic, JSON.stringify(message), {
            properties: {
              userProperties: {
                name: this.userProperties.name,
                description: this.userProperties.description,
                emoji: this.userProperties.emoji,
                reply_to: `${this.clientId}/inbound`,
              },
            },
          });
          console.log('Published private message after retry to topic:', topic);
        } else {
          console.log('MQTT client still not connected, using mock service to send private message');
          mockMQTTService.sendMessage(text, sender, targetRoom);
        }
      }, 500); // Wait 500ms before trying again
    }
  }

  disconnect(): void {
    if (!this.hasConnectedOnce) {
      console.log('Skipping disconnect - never connected');
      return;
    }
    
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