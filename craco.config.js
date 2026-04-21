module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Add support for absolute imports from the src directory
      webpackConfig.resolve.modules = [path.resolve(__dirname, 'src'), ...webpackConfig.resolve.modules];
      return webpackConfig;
    },
  },
  devServer: {
    proxy: {
      '/api/emqx': {
        target: 'http://localhost:18083',
        changeOrigin: true,
        pathRewrite: {
          '^/api/emqx': '', // Remove /api/emqx prefix when forwarding
        },
      },
    },
  },
};

// Add path module requirement at the top
const path = require('path');