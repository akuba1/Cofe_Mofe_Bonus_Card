// next.config.mjs
export default {
  webpack(config) {
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      'node-fetch': false,
    }
    return config
  },
}

