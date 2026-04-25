// Application Configuration
export interface AppConfig {
  mqtt: {
    brokerUrl: string;
    username: string;
    password: string;
    connectTimeout: number;
    reconnectPeriod: number;
    clientId: string;
  };
  emqx: {
    baseUrl: string;
    apiKey: string;
    apiSecret: string;
  };
  development: {
    proxyApiPath: string;
  };
}

// Default configuration values
const defaultConfig: AppConfig = {
  mqtt: {
    brokerUrl: 'ws://localhost:8083/mqtt',
    username: 'admin',
    password: 'public',
    connectTimeout: 30000, // 30 seconds
    reconnectPeriod: 5000, // 5 seconds
    clientId: 'mqtt-chat-client', // Default client ID
  },
  emqx: {
    baseUrl: 'http://localhost:18083',
    apiKey: 'your-emqx-api-key',
    apiSecret: 'your-emqx-api-secret',
  },
  development: {
    proxyApiPath: '/api/v5', // This path is configured in package.json proxy
  },
};

// Validate configuration values
function validateConfig(config: AppConfig): void {
  if (!config.mqtt.brokerUrl) {
    console.warn('MQTT broker URL is not configured. Using default value.');
  }
  
  if (!config.emqx.apiKey || config.emqx.apiKey === defaultConfig.emqx.apiKey) {
    console.warn('EMQX API key is using a default/placeholder value. Update REACT_APP_EMQX_API_KEY in environment variables.');
  }
  
  if (!config.emqx.apiSecret || config.emqx.apiSecret === defaultConfig.emqx.apiSecret) {
    console.warn('EMQX API secret is using a default/placeholder value. Update REACT_APP_EMQX_API_SECRET in environment variables.');
  }
}

// Load configuration from environment variables
const appConfig: AppConfig = {
  mqtt: {
    brokerUrl: process.env.REACT_APP_MQTT_BROKER_URL || defaultConfig.mqtt.brokerUrl,
    username: defaultConfig.mqtt.username, // Default value for backward compatibility
    password: defaultConfig.mqtt.password, // Default value for backward compatibility
    connectTimeout: parseInt(process.env.REACT_APP_MQTT_CONNECT_TIMEOUT || defaultConfig.mqtt.connectTimeout.toString(), 10),
    reconnectPeriod: parseInt(process.env.REACT_APP_MQTT_RECONNECT_PERIOD || defaultConfig.mqtt.reconnectPeriod.toString(), 10),
    clientId: process.env.REACT_APP_MQTT_CLIENT_ID || defaultConfig.mqtt.clientId,
  },
  emqx: {
    baseUrl: process.env.REACT_APP_EMQX_BASE_URL || defaultConfig.emqx.baseUrl,
    apiKey: process.env.REACT_APP_EMQX_API_KEY || defaultConfig.emqx.apiKey,
    apiSecret: process.env.REACT_APP_EMQX_API_SECRET || defaultConfig.emqx.apiSecret,
  },
  development: {
    proxyApiPath: process.env.REACT_APP_DEV_PROXY_PATH || defaultConfig.development.proxyApiPath,
  },
};

// Validate the loaded configuration
validateConfig(appConfig);

export default appConfig;