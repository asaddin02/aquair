// Hanya untuk menjalankan di laptop: /api diteruskan ke backend lokal.
// Di Emergent, REACT_APP_BACKEND_URL dipakai dan berkas ini tidak berpengaruh.
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.AQUAIR_BACKEND_LOKAL;
  if (target) app.use(createProxyMiddleware('/api', { target, changeOrigin: true }));
};
