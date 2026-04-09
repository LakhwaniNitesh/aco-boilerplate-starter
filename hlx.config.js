/**
 * HLX (Helix) Configuration for AEM Edge Delivery Services
 * Configures proxy for backend API calls during local development
 */

module.exports = {
  // Proxy configuration for local development
  // Routes /api/* requests to local backend server on port 3001
  proxy: {
    // Proxy all /api/hcl/* requests to backend server
    "/api/hcl": {
      changeOrigin: true,
      target: "http://localhost:3001",
      pathRewrite: {
        "^/api/hcl": "/api/hcl",
      },
      ws: true,
    },
  },
};
