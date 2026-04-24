// EMQX API Client Singleton Instance
import EMQXApiService from './emqxApiService';
import appConfig from '../config/appConfig';

// Create and export singleton instance using app config
const emqxApiClient = new EMQXApiService({
  baseUrl: appConfig.emqx.baseUrl,
  apiKey: appConfig.emqx.apiKey,
  apiSecret: appConfig.emqx.apiSecret
});

export default emqxApiClient;