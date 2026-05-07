import mqtt, { MqttClient } from 'mqtt';
import mockMQTTService from './mockMQTTService';
import emqxApiClient from './emqxApiClient';
import appConfig from '../config/appConfig';
import { refreshClientList } from '../context/ClientContext';

interface Message {
  id: string;
  text?: string;
  senderId: string;
  timestamp: Date;
  targetIds?: string[];
  type?: 'text' | 'file';
  fileName?: string;
  fileType?: string;
  fileData?: string;
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
  reply_to?: string;
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
  
  // Get user properties for display
  getUserInfo(): { name: string; emoji: string } {
    return {
      name: this.userProperties.name,
      emoji: this.userProperties.emoji
    };
  }
  
  async connectWithUserProperties(username?: string, password?: string): Promise<void> {
    if (this.hasConnectedOnce && this.client?.connected) {
      console.log('Already connected, skipping connect');
      return Promise.resolve();
    }
    
    // Use provided credentials or fallback to env/config defaults
    const connectUsername = username || process.env.REACT_APP_MQTT_USERNAME || 'admin';
    const connectPassword = password || process.env.REACT_APP_MQTT_PASSWORD || 'public';
    
    return new Promise((resolve, reject) => {
      try {
        this.client = mqtt.connect(this.brokerUrl, {
          clientId: appConfig.mqtt.clientId,
          protocolVersion: 5,
          username: connectUsername,
          password: connectPassword,
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

        this.client?.on('message', (topic, message, packet) => {
          console.log('[connectWithUserProperties] Received message on topic:', topic);
          console.log('[connectWithUserProperties] Raw message:', message.toString());
          console.log('[connectWithUserProperties] Packet:', packet);
          try {
            const msgData = JSON.parse(message.toString());
            
            // 解析消息体
            const parsedMessage: Message = {
              id: msgData.id || Math.random().toString(36).substr(2, 9),
              text: msgData.type === 'file' ? `[文件] ${msgData.fileName || '未知文件'}` : msgData.text,
              senderId: msgData.senderId,
              timestamp: new Date(msgData.timestamp || Date.now()),
              type: msgData.type || 'text',
              fileName: msgData.fileName,
              fileType: msgData.fileType,
              fileData: msgData.fileData,
            };
            
            // 解析 userProperties
            const userProperties = packet.properties?.userProperties;
            if (userProperties) {
              console.log('[connectWithUserProperties] User properties:', userProperties);
              const name = Array.isArray(userProperties.name) ? userProperties.name[0] : userProperties.name;
              const description = Array.isArray(userProperties.description) ? userProperties.description[0] : userProperties.description;
              const emoji = Array.isArray(userProperties.emoji) ? userProperties.emoji[0] : userProperties.emoji;
              
              if (name) {
                parsedMessage.senderId = parsedMessage.senderId || name;
              }
              
              // 更新客户端详情
              if (name) {
                const senderClientId = msgData.senderId;
                
                if (senderClientId) {
                  const existingDetails = this.getClientDetails(senderClientId);
                  if (existingDetails) {
                    if (existingDetails.name !== name) {
                      console.log('[connectWithUserProperties] Updating client details for:', senderClientId);
                      this.storeClientDetails(senderClientId, {
                        name: name,
                        description: description || existingDetails.description,
                        emoji: emoji || existingDetails.emoji,
                        online: existingDetails.online
                      });
                      refreshClientList();
                    }
                  } else {
                    console.log('[connectWithUserProperties] Creating new client details for:', senderClientId);
                    this.storeClientDetails(senderClientId, {
                      name: name,
                      description: description || '',
                      emoji: emoji || '👤',
                      online: true
                    });
                    refreshClientList();
                  }
                }
              }
            }
            
            console.log('[connectWithUserProperties] Parsed message:', parsedMessage);
            
            // 保存消息到 localStorage
            // 判断是私聊消息还是群聊消息
            let roomIdForStorage: string;
            if (topic.startsWith('group_')) {
              // 群聊消息: 从 topic 提取 group name
              const match = topic.match(/^group_(.+)\/bound$/);
              if (match) {
                roomIdForStorage = `group_${match[1]}`;
              } else {
                roomIdForStorage = `group_${topic}`;
              }
            } else {
              // 私聊消息: 使用发送者的 clientId 作为 roomId
              roomIdForStorage = `user_${parsedMessage.senderId}`;
            }
            this.saveMessageToStorage(parsedMessage, roomIdForStorage);
            
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
    
    // Topic 构建规则：
    // 群聊: group_{name} 或直接 {name} → group_{name}/bound 格式
    // 私聊不需要订阅特殊主题（通过入站主题接收）
    let topic: string;
    
    if (roomId.startsWith('group_')) {
      const groupName = roomId.substring(6);
      topic = `group_${groupName}/bound`;
    } else {
      topic = `group_${roomId}/bound`;
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
    
    // Topic 构建规则：
    // 群聊: group_{name} 或直接 {name} → group_{name}/bound 格式
    // 私聊不需要退订特殊主题
    let topic: string;
    
    if (roomId.startsWith('group_')) {
      const groupName = roomId.substring(6);
      topic = `group_${groupName}/bound`;
    } else {
      topic = `group_${roomId}/bound`;
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

  sendMessage(text: string, sender: string, roomId: string, targetIds?: string[]): void {
    console.log('sendMessage called - useMockService:', this.useMockService, ', client connected:', this.client?.connected);
    
    if (this.useMockService) {
      console.log('Using mock service for sending message');
      mockMQTTService.sendMessage(text, sender, roomId);
      return;
    }

    if (this.client && this.client.connected) {
      console.log('Using real MQTT client for sending message');
      
      let topic;
      let groupName = '';
      if (roomId.startsWith('group_')) {
        groupName = roomId.substring(6);
      }
      topic = `group_${groupName || roomId}/bound`;
      
      const message: Message = {
        id: Math.random().toString(36).substr(2, 9),
        text,
        senderId: this.clientId,
        timestamp: new Date(),
        type: 'text',
        targetIds: targetIds || [],
      };
      
      this.saveMessageToStorage(message, roomId);
      console.log('Publishing message to topic:', topic);
      this.client.publish(topic, JSON.stringify(message), {
        properties: {
          userProperties: {
            name: this.userProperties.name,
            description: this.userProperties.description,
            emoji: this.userProperties.emoji,
          },
        },
      });
      console.log('Published message to topic:', topic);
    } else {
      console.log('MQTT client not connected, scheduling retry for sending message');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('Retrying message send with real MQTT client');
          let groupName = '';
          if (roomId.startsWith('group_')) {
            groupName = roomId.substring(6);
          }
          const topic = `group_${groupName || roomId}/bound`;
          const message: Message = {
            id: Math.random().toString(36).substr(2, 9),
            text,
            senderId: this.clientId,
            timestamp: new Date(),
            type: 'text',
            targetIds: targetIds || [],
          };
          
          this.saveMessageToStorage(message, roomId);
          console.log('Publishing message to topic after retry:', topic);
          this.client.publish(topic, JSON.stringify(message), {
            properties: {
              userProperties: {
                name: this.userProperties.name,
                description: this.userProperties.description,
                emoji: this.userProperties.emoji,
              },
            },
          });
          console.log('Published message to topic after retry:', topic);
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
          emoji: '👤',
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
        senderId: this.clientId,
        timestamp: new Date(),
        type: 'text',
      };
      
      this.saveMessageToStorage(message, targetRoom);
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
            senderId: this.clientId,
            timestamp: new Date(),
            type: 'text',
          };
          
          this.saveMessageToStorage(message, targetRoom);
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

  sendFileMessage(fileName: string, fileType: string, fileData: string, roomId: string, targetIds?: string[]): void {
    console.log('sendFileMessage called - fileName:', fileName, 'fileType:', fileType);
    
    if (this.useMockService) {
      console.log('Using mock service for file message');
      mockMQTTService.sendFileMessage(fileName, fileType, fileData, roomId);
      return;
    }

    console.log('[mqttService.sendFileMessage] Starting, fileName:', fileName, 'base64Length:', fileData.length);

    if (this.client && this.client.connected) {
      let topic: string;
      let groupName = '';
      if (roomId.startsWith('group_')) {
        groupName = roomId.substring(6);
      }
      topic = `group_${groupName || roomId}/bound`;
      
      const message: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: this.clientId,
        timestamp: new Date(),
        type: 'file',
        fileName,
        fileType,
        fileData,
        targetIds: targetIds || [],
      };
      
      const jsonString = JSON.stringify(message);
      console.log('[mqttService.sendFileMessage] Message created, topic:', topic, 'jsonLength:', jsonString.length, 'estimatedBytes:', new Blob([jsonString]).size);
      
      this.saveMessageToStorage(message, roomId);
      console.log('[mqttService.sendFileMessage] Saved to storage, now publishing...');
      
      this.client.publish(topic, jsonString, {
        properties: {
          userProperties: {
            name: this.userProperties.name,
            description: this.userProperties.description,
            emoji: this.userProperties.emoji,
          },
        },
      }, (err) => {
        if (err) {
          console.error('[mqttService.sendFileMessage] Publish error:', err);
        } else {
          console.log('[mqttService.sendFileMessage] Publish callback success, topic:', topic);
        }
      });
      console.log('[mqttService.sendFileMessage] Publish called (async)');
    } else {
      console.log('[mqttService.sendFileMessage] MQTT client not connected, scheduling retry');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('[mqttService.sendFileMessage] Retrying...');
          let groupName = '';
          if (roomId.startsWith('group_')) {
            groupName = roomId.substring(6);
          }
          const topic = `group_${groupName || roomId}/bound`;
          const message: Message = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: this.clientId,
            timestamp: new Date(),
            type: 'file',
            fileName,
            fileType,
            fileData,
            targetIds: targetIds || [],
          };
          
          const jsonString = JSON.stringify(message);
          console.log('[mqttService.sendFileMessage] Retry: jsonLength:', jsonString.length);
          
          this.saveMessageToStorage(message, roomId);
          this.client.publish(topic, jsonString, {
            properties: {
              userProperties: {
                name: this.userProperties.name,
                description: this.userProperties.description,
                emoji: this.userProperties.emoji,
              },
            },
          }, (err) => {
            if (err) {
              console.error('[mqttService.sendFileMessage] Retry publish error:', err);
            } else {
              console.log('[mqttService.sendFileMessage] Retry publish callback success');
            }
          });
        } else {
          console.log('[mqttService.sendFileMessage] MQTT client still not connected, using mock service');
          mockMQTTService.sendFileMessage(fileName, fileType, fileData, roomId);
        }
      }, 500);
    }
  }

  sendPrivateFileMessage(fileName: string, fileType: string, fileData: string, targetClientId: string, targetRoom: string): void {
    console.log('[mqttService.sendPrivateFileMessage] Starting, fileName:', fileName, 'targetClientId:', targetClientId, 'base64Length:', fileData.length);
    
    if (this.useMockService) {
      console.log('Using mock service for private file message');
      mockMQTTService.sendFileMessage(fileName, fileType, fileData, targetRoom);
      return;
    }

    if (this.client && this.client.connected) {
      const topic = `${targetClientId}/inbound`;
      const message: Message = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: this.clientId,
        timestamp: new Date(),
        type: 'file',
        fileName,
        fileType,
        fileData,
      };
      
      const jsonString = JSON.stringify(message);
      console.log('[mqttService.sendPrivateFileMessage] Message created, topic:', topic, 'jsonLength:', jsonString.length, 'estimatedBytes:', new Blob([jsonString]).size);
      
      this.saveMessageToStorage(message, targetRoom);
      console.log('[mqttService.sendPrivateFileMessage] Saved to storage, now publishing...');
      
      this.client.publish(topic, jsonString, {
        properties: {
          userProperties: {
            name: this.userProperties.name,
            description: this.userProperties.description,
            emoji: this.userProperties.emoji,
            reply_to: `${this.clientId}/inbound`,
          },
        },
      }, (err) => {
        if (err) {
          console.error('[mqttService.sendPrivateFileMessage] Publish error:', err);
        } else {
          console.log('[mqttService.sendPrivateFileMessage] Publish callback success, topic:', topic);
        }
      });
      console.log('[mqttService.sendPrivateFileMessage] Publish called (async)');
    } else {
      console.log('[mqttService.sendPrivateFileMessage] MQTT client not connected, scheduling retry');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          console.log('[mqttService.sendPrivateFileMessage] Retrying...');
          const topic = `${targetClientId}/inbound`;
          const message: Message = {
            id: Math.random().toString(36).substr(2, 9),
            senderId: this.clientId,
            timestamp: new Date(),
            type: 'file',
            fileName,
            fileType,
            fileData,
          };
          
          const jsonString = JSON.stringify(message);
          console.log('[mqttService.sendPrivateFileMessage] Retry: jsonLength:', jsonString.length);
          
          this.saveMessageToStorage(message, targetRoom);
          this.client.publish(topic, jsonString, {
            properties: {
              userProperties: {
                name: this.userProperties.name,
                description: this.userProperties.description,
                emoji: this.userProperties.emoji,
                reply_to: `${this.clientId}/inbound`,
              },
            },
          }, (err) => {
            if (err) {
              console.error('[mqttService.sendPrivateFileMessage] Retry publish error:', err);
            } else {
              console.log('[mqttService.sendPrivateFileMessage] Retry publish callback success');
            }
          });
        } else {
          console.log('[mqttService.sendPrivateFileMessage] MQTT client still not connected, using mock service');
          mockMQTTService.sendFileMessage(fileName, fileType, fileData, targetRoom);
        }
      }, 500);
    }
  }

  sendGroupInvite(members: string[], groupName: string): void {
    console.log('sendGroupInvite called - members:', members, 'groupName:', groupName);
    
    const topic = `group_${groupName}/bound`;
    
    if (this.useMockService) {
      console.log('Using mock service for group invite');
      return;
    }

    if (this.client && this.client.connected) {
      for (const memberId of members) {
        if (memberId === this.clientId) continue;
        
        const inviteMessage = {
          senderId: this.userProperties.name,
          topic: topic,
          kind: 'invite',
          ts: Date.now(),
        };
        
        console.log('Sending group invite to:', memberId, inviteMessage);
        this.client.publish(`${memberId}/inbound`, JSON.stringify(inviteMessage), {
          properties: {
            userProperties: {
              name: this.userProperties.name,
              description: this.userProperties.description,
              emoji: this.userProperties.emoji,
              reply_to: `${this.clientId}/inbound`,
            },
          },
        });
      }
    } else {
      console.log('MQTT client not connected, scheduling retry for group invite');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          for (const memberId of members) {
            if (memberId === this.clientId) continue;
            
            const inviteMessage = {
              senderId: this.userProperties.name,
              topic: topic,
              kind: 'invite',
              ts: Date.now(),
            };
            
            console.log('Sending group invite after retry to:', memberId);
            this.client.publish(`${memberId}/inbound`, JSON.stringify(inviteMessage), {
              properties: {
                userProperties: {
                  name: this.userProperties.name,
                  description: this.userProperties.description,
                  emoji: this.userProperties.emoji,
                  reply_to: `${this.clientId}/inbound`,
                },
              },
            });
          }
        }
      }, 500);
    }
  }

  deleteGroup(groupName: string, members: string[]): void {
    console.log('deleteGroup called - groupName:', groupName, 'members:', members);
    
    const topic = `group_${groupName}/bound`;
    
    this.unsubscribeFromRoom(groupName);
    
    if (this.useMockService) {
      console.log('Using mock service for group delete');
      return;
    }

    if (this.client && this.client.connected) {
      for (const memberId of members) {
        if (memberId === this.clientId) continue;
        
        const dismissMessage = {
          kind: 'dismissed',
          topic: topic,
          ts: Date.now(),
        };
        
        console.log('Sending group dismiss notification to:', memberId, dismissMessage);
        this.client.publish(`${memberId}/inbound`, JSON.stringify(dismissMessage), {
          properties: {
            userProperties: {
              name: this.userProperties.name,
              description: this.userProperties.description,
              emoji: this.userProperties.emoji,
              reply_to: `${this.clientId}/inbound`,
            },
          },
        });
      }
    } else {
      console.log('MQTT client not connected, scheduling retry for group delete');
      setTimeout(() => {
        if (this.client && this.client.connected) {
          for (const memberId of members) {
            if (memberId === this.clientId) continue;
            
            const dismissMessage = {
              kind: 'dismissed',
              topic: topic,
              ts: Date.now(),
            };
            
            console.log('Sending group dismiss notification after retry to:', memberId);
            this.client.publish(`${memberId}/inbound`, JSON.stringify(dismissMessage), {
              properties: {
                userProperties: {
                  name: this.userProperties.name,
                  description: this.userProperties.description,
                  emoji: this.userProperties.emoji,
                  reply_to: `${this.clientId}/inbound`,
                },
              },
            });
          }
        }
      }, 500);
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

  // LocalStorage storage methods for messages
  private getMessageStorageKey(msgId: string): string {
    return `msg-${msgId}`;
  }

  private getPrivateMessageListKey(clientId: string): string {
    return `message-${clientId}`;
  }

  private getGroupMessageListKey(groupName: string): string {
    return `group-message-${groupName}`;
  }

  saveMessageToStorage(msg: Message, roomId: string): void {
    try {
      const msgKey = this.getMessageStorageKey(msg.id);
      localStorage.setItem(msgKey, JSON.stringify(msg));

      let listKey: string;
      if (roomId.startsWith('group_')) {
        const groupName = roomId.substring(6);
        listKey = this.getGroupMessageListKey(groupName);
      } else {
        const clientId = roomId.startsWith('user_') ? roomId.substring(5) : roomId;
        listKey = this.getPrivateMessageListKey(clientId);
      }

      const listStr = localStorage.getItem(listKey);
      let msgIds: string[] = listStr ? JSON.parse(listStr) : [];
      if (!msgIds.includes(msg.id)) {
        msgIds.push(msg.id);
        localStorage.setItem(listKey, JSON.stringify(msgIds));
      }
      console.log('[Storage] Saved message:', msg.id, 'to list:', listKey);
    } catch (error) {
      console.error('[Storage] Error saving message:', error);
    }
  }

  loadMessagesFromStorage(roomId: string): Message[] {
    try {
      let listKey: string;
      if (roomId.startsWith('group_')) {
        const groupName = roomId.substring(6);
        listKey = this.getGroupMessageListKey(groupName);
      } else {
        const clientId = roomId.startsWith('user_') ? roomId.substring(5) : roomId;
        listKey = this.getPrivateMessageListKey(clientId);
      }

      const listStr = localStorage.getItem(listKey);
      if (!listStr) {
        console.log('[Storage] No messages found for room:', roomId);
        return [];
      }

      const msgIds: string[] = JSON.parse(listStr);
      const messages: Message[] = [];

      for (const msgId of msgIds) {
        const msgStr = localStorage.getItem(this.getMessageStorageKey(msgId));
        if (msgStr) {
          try {
            const msg = JSON.parse(msgStr);
            msg.timestamp = new Date(msg.timestamp);
            messages.push(msg);
          } catch (e) {
            console.error('[Storage] Error parsing message:', msgId, e);
          }
        }
      }

      console.log('[Storage] Loaded', messages.length, 'messages for room:', roomId);
      return messages;
    } catch (error) {
      console.error('[Storage] Error loading messages:', error);
      return [];
    }
  }

  clearMessagesForRoom(roomId: string): void {
    try {
      let listKey: string;
      if (roomId.startsWith('group_')) {
        const groupName = roomId.substring(6);
        listKey = this.getGroupMessageListKey(groupName);
      } else {
        const clientId = roomId.startsWith('user_') ? roomId.substring(5) : roomId;
        listKey = this.getPrivateMessageListKey(clientId);
      }
      
      const listStr = localStorage.getItem(listKey);
      if (listStr) {
        const msgIds: string[] = JSON.parse(listStr);
        for (const msgId of msgIds) {
          localStorage.removeItem(this.getMessageStorageKey(msgId));
        }
      }
      
      localStorage.setItem(listKey, JSON.stringify([]));
      console.log('[Storage] Cleared messages for room:', roomId);
    } catch (error) {
      console.error('[Storage] Error clearing messages:', error);
    }
  }
}

// Export a singleton instance
const mqttService = new MQTTService();
export default mqttService;
export type { Message }; // Export Message type for use in other files
