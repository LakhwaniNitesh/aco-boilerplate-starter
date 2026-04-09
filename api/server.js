/**
 * HCL Commerce Proxy Server
 *
 * Provides secure proxy endpoints for EDS Storefront to communicate with HCL Commerce
 * Handles authentication, cart operations, and token management
 *
 * Endpoints:
 *   POST /api/hcl/login            - Authenticate with HCL Commerce
 *   POST /api/hcl/cart/add         - Add product to cart
 *   GET  /api/hcl/cart             - Get current cart
 *   DELETE /api/hcl/cart/item/:id  - Remove item from cart
 *   DELETE /api/hcl/cart/clear     - Clear cart (localhost only)
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Load environment variables from .env file in project root
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname); // Go up one directory from api/server.js
const envPath = join(projectRoot, ".env");
console.log(`[DEBUG] Loading .env from: ${envPath}`);
const dotenvResult = dotenv.config({ path: envPath });
if (dotenvResult.error) {
  console.error(`[ERROR] Failed to load .env: ${dotenvResult.error.message}`);
} else {
  console.log(`[DEBUG] Successfully loaded .env file`);
}

// Import middleware
import { errorHandler } from "./middleware/error-handler.js";
import { logger } from "./middleware/logger.js";
import { validateEnvVars } from "./middleware/env-validator.js";

// Import controllers and clients
import { hclAuthController } from "./controllers/hcl-auth-controller.js";
import { hclCartController } from "./controllers/hcl-cart-controller.js";
import { hclClient } from "./utils/hcl-client.js";

// IMPORTANT: Initialize HCL client AFTER loading environment variables
try {
  hclClient.initialize();
  console.log("[INFO] ✅ HCL Client initialized successfully");
} catch (error) {
  console.error("[ERROR] Failed to initialize HCL Client:", error.message);
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;

// ============================================
// MIDDLEWARE
// ============================================

// Validate environment variables on startup
validateEnvVars();

// Request logging
app.use(logger);

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true,
    optionsSuccessStatus: 200,
  }),
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Request ID middleware (for tracing)
app.use((req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader("X-Request-ID", req.id);
  next();
});

// ============================================
// ROUTES
// ============================================

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * API Routes - HCL Commerce
 */

// Authentication
app.post("/api/hcl/login", hclAuthController.login);
app.post("/api/hcl/logout", hclAuthController.logout);
app.get("/api/hcl/auth/validate", hclAuthController.validateToken);
app.get("/api/hcl/auth/available-users", hclAuthController.getAvailableUsers);
app.get("/api/hcl/auth/diagnose", hclAuthController.diagnose);

// Cart operations
app.post("/api/hcl/cart/add", hclCartController.addToCart);
app.get("/api/hcl/cart", hclCartController.getCart);
app.delete("/api/hcl/cart/remove", hclCartController.removeFromCart);
app.delete(
  "/api/hcl/cart/item/:orderId/:itemId",
  hclCartController.removeFromCart,
);
app.delete("/api/hcl/cart/clear", hclCartController.clearCart);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorHandler);

// ============================================
// SERVER STARTUP
// ============================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║  🛒 HCL Commerce Proxy Server                          ║
║                                                        ║
║  Status: ✅ RUNNING                                    ║
║  Port: ${PORT}                                              ║
║  Environment: ${(process.env.NODE_ENV || "development").padEnd(25)}║
║  Timestamp: ${new Date().toISOString()}  ║
║                                                        ║
║  Endpoints:                                            ║
║  POST   /api/hcl/login                                 ║
║  POST   /api/hcl/cart/add                              ║
║  GET    /api/hcl/cart                                  ║
║  DELETE /api/hcl/cart/item/:orderId/:itemId            ║
║  DELETE /api/hcl/cart/clear                            ║
║  PUT    /api/hcl/cart/checkout                         ║
║                                                        ║
║  Docs: http://localhost:${PORT}/health                 ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

export default app;
