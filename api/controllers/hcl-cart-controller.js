/**
 * HCL Cart Controller
 * Handles cart operations by proxying to HCL Commerce REST APIs
 * Single source of truth: HCL Commerce only
 */

import { hclClient } from "../utils/hcl-client.js";

/**
 * Convert HCL Commerce API response to standard cart format
 * HCL returns cart with orderItem array (singular key), we normalize to our format
 */
function normalizeHCLCart(hclResponse) {
  try {
    if (!hclResponse) {
      return { cartId: null, items: [], total: 0 };
    }

    // Handle different HCL API response formats
    // HCL uses "orderItem" (singular), not "items" or "orderItems"
    const orderItemsArray =
      hclResponse.orderItem ||
      hclResponse.orderItems ||
      hclResponse.items ||
      [];

    console.log(
      "[CART-PROXY] Normalizing HCL cart - found",
      orderItemsArray.length,
      "items",
    );

    // DEBUG: Log first item's raw structure
    if (orderItemsArray.length > 0) {
      console.log(
        "[CART-PROXY] Raw HCL first item (FULL):",
        JSON.stringify(orderItemsArray[0], null, 2),
      );
      const firstItem = orderItemsArray[0];
      console.log("[CART-PROXY] First item - ALL fields:");
      console.log(
        "  - productName:",
        firstItem.productName,
        typeof firstItem.productName,
      );
      console.log(
        "  - displayName:",
        firstItem.displayName,
        typeof firstItem.displayName,
      );
      console.log(
        "  - partNumber:",
        firstItem.partNumber,
        typeof firstItem.partNumber,
      );
      console.log(
        "  - partnumber:",
        firstItem.partnumber,
        typeof firstItem.partnumber,
      );
      console.log("  - name:", firstItem.name, typeof firstItem.name);
      console.log(
        "  - quantity:",
        firstItem.quantity,
        typeof firstItem.quantity,
      );
      console.log("  - price:", firstItem.price, typeof firstItem.price);
      console.log(
        "  - unitPrice:",
        firstItem.unitPrice,
        typeof firstItem.unitPrice,
      );
    }

    const items = orderItemsArray.map((item, index) => {
      // Parse quantity and price as numbers, handling string inputs
      const quantity = parseFloat(item.quantity || 1);
      const unitPrice = parseFloat(item.unitPrice || item.price || 0);

      // DEBUG: Log all name fields for this item
      console.log(`[CART-PROXY] Item ${index} name fields:`, {
        productName: item.productName,
        displayName: item.displayName,
        partNumber: item.partNumber,
      });

      const selectedName =
        item.productName || item.displayName || item.partNumber || "Product";
      console.log(
        `[CART-PROXY] Item ${index} selected name: "${selectedName}"`,
      );

      return {
        partNumber: item.partNumber || item.partnumber || "",
        sku: item.sku || item.partNumber || item.partnumber || "",
        quantity: quantity,
        price: unitPrice,
        name: selectedName,
        orderItemId: item.orderItemId || null,
      };
    });

    // Use HCL's totalProductPrice if available, otherwise calculate
    let total = hclResponse.totalProductPrice
      ? parseFloat(hclResponse.totalProductPrice)
      : items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return {
      cartId: hclResponse.cartId || hclResponse.orderId || null,
      items,
      total: parseFloat(total.toFixed(2)),
    };
  } catch (error) {
    console.error(
      "[CART-PROXY] Error normalizing HCL response:",
      error.message,
    );
    console.error(
      "[CART-PROXY] Full response:",
      JSON.stringify(hclResponse, null, 2),
    );
    return { cartId: null, items: [], total: 0 };
  }
}

export const hclCartController = {
  /**
   * POST /api/hcl/cart/add
   * Add product to cart - proxies to HCL Commerce REST API
   */
  addToCart: async (req, res, next) => {
    try {
      const {
        partNumber,
        sku,
        quantity,
        accessToken: bodyAccessToken,
        trustedToken: bodyTrustedToken,
        userId,
        sessionCookies: bodySessionCookies,
      } = req.body;

      // DEBUG: Log the full request body
      console.log(
        `[CART-PROXY] Full request body keys:`,
        Object.keys(req.body),
      );
      console.log(
        `[CART-PROXY] sessionCookies value from body:`,
        bodySessionCookies,
      );
      console.log(
        `[CART-PROXY] sessionCookies type:`,
        typeof bodySessionCookies,
      );

      // Accept token from EITHER headers (Authorization or Cookie) OR request body
      let accessToken = bodyAccessToken;
      let trustedToken = bodyTrustedToken;

      // Check Authorization header first (e.g., "Bearer token123" or just "token123")
      if (!accessToken && req.headers.authorization) {
        accessToken = req.headers.authorization.replace(/^Bearer\s+/, "");
      }

      // Check for WCToken in headers
      if (!accessToken && req.headers.wctoken) {
        accessToken = req.headers.wctoken;
      }

      // Check for WCTrustedToken in headers
      if (!trustedToken && req.headers.wctrustedtoken) {
        trustedToken = req.headers.wctrustedtoken;
      }

      // Check for Cookie header with WCToken
      if (!accessToken && req.headers.cookie) {
        const cookieMatch = req.headers.cookie.match(/WCToken=([^;]+)/);
        if (cookieMatch) {
          accessToken = cookieMatch[1];
        }
      }

      const productId = partNumber || sku;

      console.log(`[CART-PROXY] Request received`);
      console.log(
        `[CART-PROXY]   Body: partNumber=${partNumber}, sku=${sku}, quantity=${quantity}, userId=${userId}`,
      );
      console.log(
        `[CART-PROXY]   Auth source: ${bodyAccessToken ? "body" : req.headers.authorization ? "Authorization header" : req.headers.wctoken ? "WCToken header" : req.headers.cookie ? "Cookie header" : "NONE"}`,
      );
      console.log(
        `[CART-PROXY]   Token present: ${accessToken ? "yes" : "no"}`,
      );
      console.log(
        `[CART-PROXY]   Token (first 50 chars): ${accessToken ? accessToken.substring(0, 50) : "NONE"}`,
      );
      console.log(
        `[CART-PROXY]   Trusted token present: ${trustedToken ? "yes" : "no"}`,
      );
      console.log(
        `[CART-PROXY]   Session cookies from login: ${bodySessionCookies ? Object.keys(bodySessionCookies).length + " cookies" : "none"}`,
      );

      if (!productId) {
        return res.status(400).json({
          success: false,
          error: "Missing required field: partNumber or sku",
        });
      }

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error:
            "Missing required field: accessToken (in body, Authorization header, WCToken header, or Cookie)",
        });
      }

      // === TOKEN VERIFICATION LOG ===
      console.log(`[CART-PROXY] ╔════════════════════════════════════════`);
      console.log(`[CART-PROXY] ║ TOKEN VERIFICATION`);
      console.log(`[CART-PROXY] ║ Full token: ${accessToken}`);
      console.log(`[CART-PROXY] ║ Length: ${String(accessToken).length} chars`);
      console.log(
        `[CART-PROXY] ║ Is URL-encoded: ${String(accessToken).includes("%2C")}`,
      );
      console.log(
        `[CART-PROXY] ║ Contains user ID (1007002): ${String(accessToken).includes("1007002")}`,
      );
      console.log(
        `[CART-PROXY] ║ First 30 chars: ${String(accessToken).substring(0, 30)}`,
      );
      console.log(
        `[CART-PROXY] ║ Last 30 chars: ${String(accessToken).slice(-30)}`,
      );
      console.log(`[CART-PROXY] ╚════════════════════════════════════════`);

      console.log(
        `[CART-PROXY] Adding to cart: ${productId} x${quantity || 1}`,
      );

      // Initialize HCL client with session cookies from login response
      // CRITICAL: Clear existing cookies and use ONLY the cookies from THIS request
      // This prevents cookie mismatch when multiple users or sessions exist
      if (bodySessionCookies && Object.keys(bodySessionCookies).length > 0) {
        console.log(
          `[CART-PROXY] Clearing old cookies and setting NEW cookies from request`,
        );
        console.log(
          `[CART-PROXY] Old cookies:`,
          JSON.stringify(hclClient.sessionCookies),
        );
        console.log(
          `[CART-PROXY] New cookies from body:`,
          JSON.stringify(bodySessionCookies),
        );

        // CRITICAL FIX: Clear all existing cookies first
        hclClient.sessionCookies = {};

        // Then assign ONLY the cookies from this request
        Object.assign(hclClient.sessionCookies, bodySessionCookies);

        console.log(
          `[CART-PROXY] ✓ Session cookies reset. Now using ${Object.keys(hclClient.sessionCookies).length} cookies: ${Object.keys(hclClient.sessionCookies).join(", ")}`,
        );
      }

      // Call HCL Commerce REST API to add item to cart
      const hclResponse = await hclClient.addToCart(
        accessToken,
        productId,
        quantity || 1,
        userId, // Pass userId if available
        trustedToken, // CRITICAL: Pass trustedToken separately
      );

      // Normalize response to our standard format
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(
        `[CART-PROXY] ✓ Added to HCL cart. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`,
      );

      return res.json({
        success: true,
        message: "Product added to cart",
        cart: normalizedCart,
      });
    } catch (error) {
      console.error("[CART-PROXY] Error adding to cart:", error.message);
      console.error("[CART-PROXY] Full error:", error);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Failed to add product to cart",
        details: error.details,
      });
    }
  },

  /**
   * GET /api/hcl/cart
   * Get current cart - proxies to HCL Commerce REST API
   */
  getCart: async (req, res, next) => {
    try {
      // Accept tokens from query params OR headers OR body
      let accessToken = req.query.accessToken || req.body?.accessToken;
      let trustedToken = req.query.trustedToken || req.body?.trustedToken;
      const { sessionCookies: bodySessionCookies } = req.body || {};

      if (!accessToken && req.headers.authorization) {
        accessToken = req.headers.authorization.replace(/^Bearer\s+/, "");
      }

      if (!accessToken && req.headers.wctoken) {
        accessToken = req.headers.wctoken;
      }

      if (!trustedToken && req.headers.wctrustedtoken) {
        trustedToken = req.headers.wctrustedtoken;
      }

      if (!accessToken && req.headers.cookie) {
        const cookieMatch = req.headers.cookie.match(/WCToken=([^;]+)/);
        if (cookieMatch) {
          accessToken = cookieMatch[1];
        }
      }

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error:
            "Missing required field: accessToken (in query, body, Authorization header, WCToken header, or Cookie)",
        });
      }

      if (!trustedToken) {
        return res.status(401).json({
          success: false,
          error:
            "Missing required field: trustedToken (in query, body, or WCTrustedToken header) - HCL requires both WCToken and WCTrustedToken",
        });
      }

      // Initialize HCL client with session cookies from request if provided
      if (bodySessionCookies && Object.keys(bodySessionCookies).length > 0) {
        hclClient.sessionCookies = {};
        Object.assign(hclClient.sessionCookies, bodySessionCookies);
      }

      console.log("[CART-PROXY] Fetching cart from HCL with both tokens...");

      // Call HCL Commerce REST API to get cart (MUST pass both accessToken and trustedToken)
      const hclResponse = await hclClient.getCart(accessToken, trustedToken);

      // Normalize response to our standard format
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(
        `[CART-PROXY] ✓ Fetched cart. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`,
      );

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error("[CART-PROXY] Error fetching cart:", error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Failed to fetch cart",
        details: error.details,
      });
    }
  },

  /**
   * DELETE /api/hcl/cart/clear
   * Clear cart - calls HCL Commerce to remove all items
   */
  clearCart: async (req, res, next) => {
    try {
      const { accessToken } = req.query;

      if (!accessToken) {
        // For localhost test mode or when no auth needed
        return res.json({
          success: true,
          message: "Cart cleared",
        });
      }

      console.log("[CART-PROXY] Clearing cart in HCL...");

      // Call HCL Commerce REST API to delete all items
      await hclClient.clearCart(accessToken);

      console.log("[CART-PROXY] ✓ Cart cleared");
      return res.json({
        success: true,
        message: "Cart cleared",
      });
    } catch (error) {
      console.error("[CART-PROXY] Error clearing cart:", error.message);
      // Don't fail hard if clear fails - return success anyway
      return res.json({
        success: true,
        message: "Cart cleared (HCL sync may have issues)",
        error: error.message,
      });
    }
  },

  /**
   * DELETE /api/hcl/cart/item
   * Remove item from cart - proxies to HCL Commerce REST API
   */
  removeFromCart: async (req, res, next) => {
    try {
      // Accept token from query OR headers OR body
      let accessToken = req.query.accessToken || req.body?.accessToken;
      const orderItemId = req.query.orderItemId;
      const { sessionCookies: bodySessionCookies } = req.body || {};

      if (!accessToken && req.headers.authorization) {
        accessToken = req.headers.authorization.replace(/^Bearer\s+/, "");
      }

      if (!accessToken && req.headers.wctoken) {
        accessToken = req.headers.wctoken;
      }

      if (!accessToken && req.headers.cookie) {
        const cookieMatch = req.headers.cookie.match(/WCToken=([^;]+)/);
        if (cookieMatch) {
          accessToken = cookieMatch[1];
        }
      }

      if (!accessToken || !orderItemId) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: accessToken (in query/headers), orderItemId",
        });
      }

      // Initialize HCL client with session cookies from request if provided
      if (bodySessionCookies && Object.keys(bodySessionCookies).length > 0) {
        hclClient.sessionCookies = {};
        Object.assign(hclClient.sessionCookies, bodySessionCookies);
      }

      console.log(`[CART-PROXY] Removing item ${orderItemId} from cart...`);

      // Call HCL Commerce REST API to remove item
      const hclResponse = await hclClient.removeFromCart(
        accessToken,
        orderItemId,
      );

      // Normalize response
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(
        `[CART-PROXY] ✓ Item removed. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`,
      );

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error("[CART-PROXY] Error removing item:", error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Failed to remove item",
        details: error.details,
      });
    }
  },

  /**
   * PUT /api/hcl/cart/item
   * Update item quantity - proxies to HCL Commerce REST API
   */
  updateCartItem: async (req, res, next) => {
    try {
      // Accept token from body OR headers
      const {
        accessToken: bodyAccessToken,
        orderItemId,
        quantity,
        sessionCookies: bodySessionCookies,
      } = req.body || {};
      let accessToken = bodyAccessToken;

      if (!accessToken && req.headers.authorization) {
        accessToken = req.headers.authorization.replace(/^Bearer\s+/, "");
      }

      if (!accessToken && req.headers.wctoken) {
        accessToken = req.headers.wctoken;
      }

      if (!accessToken && req.headers.cookie) {
        const cookieMatch = req.headers.cookie.match(/WCToken=([^;]+)/);
        if (cookieMatch) {
          accessToken = cookieMatch[1];
        }
      }

      if (!accessToken || !orderItemId || !quantity) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: accessToken (in body/headers), orderItemId, quantity",
        });
      }

      // Initialize HCL client with session cookies from request if provided
      if (bodySessionCookies && Object.keys(bodySessionCookies).length > 0) {
        hclClient.sessionCookies = {};
        Object.assign(hclClient.sessionCookies, bodySessionCookies);
      }

      console.log(
        `[CART-PROXY] Updating item ${orderItemId} quantity to ${quantity}...`,
      );

      // Call HCL Commerce REST API to update item
      const hclResponse = await hclClient.updateCartItem(
        accessToken,
        orderItemId,
        quantity,
      );

      // Normalize response
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(
        `[CART-PROXY] ✓ Item updated. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`,
      );

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error("[CART-PROXY] Error updating item:", error.message);
      return res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || "Failed to update item",
        details: error.details,
      });
    }
  },

  /**
   * DELETE /api/hcl/cart/remove
   * Remove item from cart - proxies to HCL Commerce REST API
   */
  removeFromCart: async (req, res, next) => {
    try {
      let accessToken = req.body?.accessToken;
      let trustedToken = req.body?.trustedToken;
      const { orderItemId, sessionCookies: bodySessionCookies } =
        req.body || {};

      if (!accessToken && req.headers.authorization) {
        accessToken = req.headers.authorization.replace(/^Bearer\s+/, "");
      }

      if (!accessToken && req.headers.wctoken) {
        accessToken = req.headers.wctoken;
      }

      if (!trustedToken && req.headers.wctrustedtoken) {
        trustedToken = req.headers.wctrustedtoken;
      }

      if (!accessToken || !trustedToken || !orderItemId) {
        return res.status(400).json({
          success: false,
          error:
            "Missing required fields: accessToken, trustedToken (in body/headers), orderItemId",
        });
      }

      // Initialize HCL client with session cookies from request if provided
      if (bodySessionCookies && Object.keys(bodySessionCookies).length > 0) {
        hclClient.sessionCookies = {};
        Object.assign(hclClient.sessionCookies, bodySessionCookies);
      }

      console.log(`[CART-PROXY] Removing item ${orderItemId} from cart...`);

      // Get current cart ID first
      const currentCart = await hclClient.getCart(accessToken, trustedToken);
      const cartId = currentCart?.orderId || currentCart?.cartId;

      if (!cartId) {
        return res.status(400).json({
          success: false,
          error: "Could not determine cart ID",
        });
      }

      // Call HCL Commerce REST API to remove item
      const hclResponse = await hclClient.removeFromCart(
        accessToken,
        cartId,
        orderItemId,
        trustedToken,
      );

      // Normalize response
      const normalizedCart = normalizeHCLCart(hclResponse);
      console.log(
        `[CART-PROXY] ✓ Item removed. Items: ${normalizedCart.items.length}, Total: $${normalizedCart.total.toFixed(2)}`,
      );

      return res.json({
        success: true,
        cart: normalizedCart,
      });
    } catch (error) {
      console.error("[CART-PROXY] Error removing item:", error.message);
      console.error("[CART-PROXY] Full error details:", error);
      console.error(
        "[CART-PROXY] Error status code:",
        error.statusCode || error.status || 500,
      );
      return res.status(error.statusCode || error.status || 500).json({
        success: false,
        error: error.message || "Failed to remove item",
        details: error.details,
      });
    }
  },
};
