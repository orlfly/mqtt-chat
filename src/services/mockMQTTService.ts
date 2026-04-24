// Mock MQTT service for testing without a real broker
import { Message } from './mqttService';

class MockMQTTService {
  private messageListeners: Array<(message: Message) => void> = [];
  private subscriptions: Set<string> = new Set();

  async connect(): Promise<void> {
    console.log('Mock MQTT service connected');
    // Simulate connection success after a short delay
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  subscribeToRoom(roomId: string): void {
    this.subscriptions.add(roomId);
    console.log(`Mock subscribed to room: ${roomId}`);
  }

  unsubscribeFromRoom(roomId: string): void {
    this.subscriptions.delete(roomId);
    console.log(`Mock unsubscribed from room: ${roomId}`);
  }

  sendMessage(text: string, sender: string, roomId: string): void {
    // Create a simulated message
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      sender,
      timestamp: new Date(),
    };
    
    console.log(`Mock message sent to room ${roomId}:`, message);
    
    // Simulate broadcasting to other clients after a short delay
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

  // Method to simulate receiving a message from "another user"
  simulateIncomingMessage(text: string, sender: string, roomId: string): void {
    const message: Message = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      text,
      sender,
      timestamp: new Date(),
    };
    
    console.log(`Mock incoming message to room ${roomId}:`, message);
    this.notifyMessageListeners(message);
  }
}

// Export a singleton instance
const mockMQTTService = new MockMQTTService();
export default mockMQTTService;