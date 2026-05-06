import axios from 'axios';
import appConfig from '../config/appConfig';

type AxiosInstance = any;
type AxiosResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
  headers: any;
  config: any;
};

interface EMQXConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
}

interface Client {
  node: string;
  clientid: string;
  username: string;
  ip_address: string;
  port: number;
  clean_start: boolean;
  keepalive: number;
  protocol: string;
  connected: boolean;
  connack: string;
  connected_at: number;
  disconnected_at?: number;
  subscriptions: Subscription[];
  mountpoint: string;
  recv_cnt: number;
  recv_msg: number;
  recv_bytes: number;
  recv_pkt: number;
  recv_max_rate: number;
  recv_oct: number;
  recv_mqueue_time_full: number;
  send_cnt: number;
  send_msg: number;
  send_bytes: number;
  send_pkt: number;
  send_pend: number;
  send_max_rate: number;
  send_oct: number;
  send_mqueue_len: number;
  send_mqueue_dropped: number;
  send_msg_dropped: number;
  mailbox_len: number;
  heap_size: number;
  reductions: number;
}

interface Subscription {
  topic: string;
  qos: number;
}

interface BrokerStatus {
  node: string;
  uptime: number;
  version: string;
  edition: string;
  sysdescr: string;
  sys_config: Record<string, any>;
  metrics: Record<string, number>;
  node_status: string;
  otp_release: string;
  kernel_version: string;
  elib_malloc: boolean;
  memory_total: number;
  memory_used: number;
  processes: number;
  process_limit: number;
  cpu_load: number;
  memory_load: number;
}

class EMQXApiService {
  private api: AxiosInstance;
  
  constructor(config?: EMQXConfig) {
    // Use provided config or fall back to app config
    const effectiveConfig = config || {
      baseUrl: appConfig.emqx.baseUrl,
      apiKey: appConfig.emqx.apiKey,
      apiSecret: appConfig.emqx.apiSecret
    };
    
    const baseURL = process.env.NODE_ENV === 'development'
      ? '/api/v5'
      : `${effectiveConfig.baseUrl}/api/v5`;

    // Create the basic auth token
    const authToken = this.generateAuthToken(effectiveConfig.apiKey, effectiveConfig.apiSecret);
    
    this.api = axios.create({
      baseURL: baseURL,
      headers: {
        'Authorization': `Basic ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
  }

  private generateAuthToken(apiKey: string, apiSecret: string): string {
    // Create Basic Authentication token as shown in the curl example
    return btoa(`${apiKey}:${apiSecret}`);
  }

  // Get all connected clients
  async getClients(): Promise<Client[]> {
    try {
      const response: AxiosResponse<{ data: Client[] }> = await this.api.get('/clients');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching clients:', error);
      throw error;
    }
  }

  // Get client by client ID
  async getClientById(clientId: string): Promise<Client> {
    try {
      const response: AxiosResponse<Client> = await this.api.get(`/clients/${encodeURIComponent(clientId)}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching client ${clientId}:`, error);
      throw error;
    }
  }

  // Disconnect a client
  async disconnectClient(clientId: string): Promise<void> {
    try {
      await this.api.delete(`/clients/${encodeURIComponent(clientId)}`);
      console.log(`Client ${clientId} disconnected successfully`);
    } catch (error) {
      console.error(`Error disconnecting client ${clientId}:`, error);
      throw error;
    }
  }

  // Get broker status
  async getBrokerStatus(): Promise<BrokerStatus[]> {
    try {
      const response: AxiosResponse<BrokerStatus[]> = await this.api.get('/nodes');
      return response.data;
    } catch (error) {
      console.error('Error fetching broker status:', error);
      throw error;
    }
  }

  // Get broker metrics
  async getBrokerMetrics() {
    try {
      const response: AxiosResponse<any> = await this.api.get('/monitor_current');
      return response.data;
    } catch (error) {
      console.error('Error fetching broker metrics:', error);
      throw error;
    }
  }

  // Get rule engine statistics
  async getRuleEngineStats() {
    try {
      const response: AxiosResponse<any> = await this.api.get('/rule-engine/stats');
      return response.data;
    } catch (error) {
      console.error('Error fetching rule engine stats:', error);
      throw error;
    }
  }

  // Get subscriptions for a specific topic
  async getTopicSubscriptions(topic: string) {
    try {
      const response: AxiosResponse<any> = await this.api.get(`/topics/${encodeURIComponent(topic)}/subscriptions`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching subscriptions for topic ${topic}:`, error);
      throw error;
    }
  }

  // Get all connected clients which represent active users
  async getUserList(): Promise<{clientId: string, username: string, ipAddress: string, connectedAt: number}[]> {
    try {
      const response: AxiosResponse<{ data: Client[] }> = await this.api.get('/clients');
      // Map the client data to user information
      return response.data.data.map(client => ({
        clientId: client.clientid,
        username: client.username,
        ipAddress: client.ip_address,
        connectedAt: client.connected_at
      }));
    } catch (error) {
      console.error('Error fetching user list:', error);
      throw error;
    }
  }



  // Get all authentication sources
  async getAuthSources() {
    try {
      const response: AxiosResponse<any> = await this.api.get('/authentication');
      return response.data;
    } catch (error) {
      console.error('Error fetching auth sources:', error);
      throw error;
    }
  }

  // Get all authorization sources
  async getAuthzSources() {
    try {
      const response: AxiosResponse<any> = await this.api.get('/authorization/sources');
      return response.data;
    } catch (error) {
      console.error('Error fetching authz sources:', error);
      throw error;
    }
  }

  // Get all bridges (data bridges/integrations)
  async getBridges() {
    try {
      const response: AxiosResponse<any> = await this.api.get('/bridges');
      return response.data;
    } catch (error) {
      console.error('Error fetching bridges:', error);
      throw error;
    }
  }

  // Get all topics
  async getAllTopics(): Promise<string[]> {
    try {
      const response: AxiosResponse<{ data: Array<{ topic: string }> }> = await this.api.get('/topics');
      // Extract just the topic strings from the response
      return response.data.data.map(item => item.topic);
    } catch (error) {
      console.error('Error fetching topics:', error);
      // Return empty array instead of throwing to avoid breaking the app
      return [];
    }
  }

  // Get group chats by filtering topics that match the group_*/*/bound pattern
  async getGroupChats(): Promise<string[]> {
    try {
      const topics = await this.getAllTopics();
      // Regular expression to match topics with pattern: group_*/bound (without the chat/ prefix)
      const groupTopicRegex = /^group_([^/]+)\/bound$/;
      const groupRooms: string[] = [];

      for (const topic of topics) {
        const match = topic.match(groupTopicRegex);
        if (match) {
          // Extract the room name which is between 'group_' and '/bound'
          groupRooms.push(match[1]);
        }
      }

      return groupRooms;
    } catch (error) {
      console.error('Error getting group chats:', error);
      throw error;
    }
  }
}

export default EMQXApiService;