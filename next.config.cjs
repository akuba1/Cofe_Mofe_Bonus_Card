/** next.config.js */
module.exports = {
  webpack(config) {
    // Если уже есть раздел resolve.fallback, сливаем
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'node-fetch': false,   // теперь Webpack будет игнорировать любые require('node-fetch')
    }
    return config
  },
}
