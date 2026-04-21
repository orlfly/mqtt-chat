const path = require('path');

module.exports = {
  webpack: (config) => {
    // Add support for absolute imports from the src directory
    config.resolve.modules = [path.resolve(__dirname, 'src'), ...config.resolve.modules];
    return config;
  },
  devServer: (devServerConfig) => {
    devServerConfig.proxy = {
      '/api/emqx': {
        target: 'http://localhost:18083',
        changeOrigin: true,
        pathRewrite: {
          '^/api/emqx': '', // Remove /api/emqx prefix when forwarding
        },
      },
    };
    return devServerConfig;
  },
};