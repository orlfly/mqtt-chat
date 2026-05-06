const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const target = process.env.REACT_APP_EMQX_BASE_URL || 'http://localhost:18083';
  
  app.use(
    '/api/v5',
    createProxyMiddleware({
      target: target,
      changeOrigin: true,
      secure: false,
    })
  );
};
