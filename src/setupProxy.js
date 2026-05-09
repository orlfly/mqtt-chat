const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  const emqxTarget = process.env.REACT_APP_EMQX_PROXY_TARGET || 'http://localhost:18083';
  
  // Proxy /api/emqx to EMQX API (pathRewrite removes /api prefix, adds /api/v5)
  app.use(
    '/api/emqx',
    createProxyMiddleware({
      target: emqxTarget,
      changeOrigin: true,
      secure: false,
      pathRewrite: { '^/api/emqx': '/api/v5' },
    })
  );
};
