// EMQX API Client Singleton Instance
import EMQXApiService from './emqxApiService';

// Configuration from environment variables or defaults
const emqxApiConfig = {
  baseUrl: process.env.REACT_APP_EMQX_BASE_URL || 'http://localhost:18083',
  apiKey: process.env.REACT_APP_EMQX_API_KEY || '334debcfbdc435a8',
  apiSecret: process.env.REACT_APP_EMQX_API_SECRET || '7PK5Qzq1QNQG4AICorO12gfs9CnlywGfI3ccJ05kxfSD'
};

// Create and export singleton instance
const emqxApiClient = new EMQXApiService(emqxApiConfig);

export default emqxApiClient;