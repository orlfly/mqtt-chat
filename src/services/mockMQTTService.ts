// Mock MQTT service for testing without a real broker
import { Message } from './mqttService';

interface MockUserProperties {
  name?: string;
  description?: string;
  emoji?: string;
  reply_to?: string;
}

class MockMQTTService {
  private messageListeners: Array<(message: Message) => void> = [];
  private subscriptions: Set<string> = new Set();
  private userProperties: MockUserProperties = {
    name: '',
    description: '',
    emoji: '👤',
  };

  async connect(): Promise<void> {
    console.log('Mock MQTT service connected');
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  setUserProperties(props: MockUserProperties): void {
    this.userProperties = { ...this.userProperties, ...props };
  }

  subscribeToRoom(roomId: string): void {
    this.subscriptions.add(roomId);
    console.log(`Mock subscribed to room: ${roomId}`);
  }

  unsubscribeFromRoom(roomId: string): void {
    this.subscriptions.delete(roomId);
    console.log(`Mock unsubscribed from room: ${roomId}`);
  }

  sendMessage(text: string, sender: string, roomId: string, userProps?: MockUserProperties): void {
    const props = userProps || this.userProperties;
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      senderId: props.name || sender,
      timestamp: new Date(),
      senderDescription: props.description,
      senderEmoji: props.emoji,
      replyTo: props.reply_to,
    };
    
    console.log(`Mock message sent to room ${roomId}:`, message);
    
    setTimeout(() => {
      this.notifyMessageListeners(message);
    }, 100);
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

  disconnect(): void {
    console.log('Mock MQTT service disconnected');
  }

  simulateIncomingMessage(text: string, sender: string, roomId: string, userProps?: MockUserProperties): void {
    const props = userProps || this.userProperties;
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      senderId: props.name || sender,
      timestamp: new Date(),
      senderDescription: props.description,
      senderEmoji: props.emoji,
      replyTo: props.reply_to,
    };
    
    console.log(`Mock incoming message to room ${roomId}:`, message);
    this.notifyMessageListeners(message);
  }
}

const mockMQTTService = new MockMQTTService();
export default mockMQTTService;