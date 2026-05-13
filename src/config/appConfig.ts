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
  userProperties: {
    name: string;
    description: string;
    emoji: string;
  };
}

const defaultConfig: AppConfig = {
  mqtt: {
    brokerUrl: 'ws://localhost:8083/mqtt',
    username: 'admin',
    password: 'public',
    connectTimeout: 30000,
    reconnectPeriod: 5000,
    clientId: 'mqtt-chat-client',
  },
  emqx: {
    baseUrl: '/api/emqx',
    apiKey: 'your-emqx-api-key',
    apiSecret: 'your-emqx-api-secret',
  },
  userProperties: {
    name: 'mqtt-chat-client',
    description: '负责将人类接入智能体社区',
    emoji: '👤',
  },
};

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

const appConfig: AppConfig = {
  mqtt: {
    brokerUrl: process.env.REACT_APP_MQTT_BROKER_URL || defaultConfig.mqtt.brokerUrl,
    username: defaultConfig.mqtt.username,
    password: defaultConfig.mqtt.password,
    connectTimeout: parseInt(process.env.REACT_APP_MQTT_CONNECT_TIMEOUT || defaultConfig.mqtt.connectTimeout.toString(), 10),
    reconnectPeriod: parseInt(process.env.REACT_APP_MQTT_RECONNECT_PERIOD || defaultConfig.mqtt.reconnectPeriod.toString(), 10),
    clientId: process.env.REACT_APP_MQTT_CLIENT_ID || defaultConfig.mqtt.clientId,
  },
  emqx: {
    baseUrl: process.env.REACT_APP_EMQX_BASE_URL || defaultConfig.emqx.baseUrl,
    apiKey: process.env.REACT_APP_EMQX_API_KEY || defaultConfig.emqx.apiKey,
    apiSecret: process.env.REACT_APP_EMQX_API_SECRET || defaultConfig.emqx.apiSecret,
  },
  userProperties: {
    name: process.env.REACT_APP_USER_NAME || defaultConfig.userProperties.name,
    description: process.env.REACT_APP_USER_DESCRIPTION || defaultConfig.userProperties.description,
    emoji: process.env.REACT_APP_USER_EMOJI || defaultConfig.userProperties.emoji,
  },
};

validateConfig(appConfig);

export default appConfig;
