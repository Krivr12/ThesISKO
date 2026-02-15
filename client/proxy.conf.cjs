/**
 * Proxy config for Angular dev server: /api/* -> http://localhost:5050/*
 * Required so API calls are same-origin and cookies are sent.
 * Use: ng serve --proxy-config proxy.conf.cjs
 */
module.exports = {
  '/api/**': {
    target: 'http://localhost:5050',
    secure: false,
    pathRewrite: { '^/api': '' },
    changeOrigin: true,
    logLevel: 'debug',
  },
};
