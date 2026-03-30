/*
 * Copyright 2025 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import {
  helpers,
  ShopperBasketsV2,
  ShopperCustomers,
  ShopperLogin,
  ShopperOrders,
} from "commerce-sdk-isomorphic";
import * as pdpApi from "@dropins/storefront-pdp/api.js";
import { getConfigValue } from "@dropins/tools/lib/aem/configs.js";
import {
  sendAddToCartEvent,
  sendRemoveFromCartEvent,
  sendPlaceOrderEvent,
} from "../aco/eventing/api.js";
import { registerCustomer } from "./register.js";
import { transformCart } from "./transformers/cart.js";
import { transformOrderInfo } from "./transformers/order.js";

function getSalesforceConfig() {
  const configObject = getConfigValue("hcl-commerce");
  const config = {
    proxy: configObject["api-url"],
    redirectUri: configObject["auth-redirect-uri"],
    parameters: {
      clientId: configObject["client-id"],
      organizationId: configObject["organization-id"],
      shortCode: configObject["short-code"],
      siteId: configObject["site-id"],
      locale: configObject.locale,
    },
  };
  return config;
}

// added function for HCL config
function getHclConfig() {
  const configObject = getConfigValue("hcl-commerce");
  return {
    apiUrl: configObject["api-url"],
    WCToken: sessionStorage.getItem("hcl-wctoken"),
    WCTrustedToken: sessionStorage.getItem("hcl-wctrustedtoken"),
    userId: configObject.userId,
    storeId: configObject["store-id"],
    locale: configObject.locale,
    Cookie: configObject.Cookie,
  };
}

// Ensure a URL is https and idempotent. Returns original value when falsy.
function ensureHttps(url) {
  if (!url || typeof url !== "string") return url;
  const s = url.trim();
  if (s.startsWith("https://")) return s;
  if (s.startsWith("//")) return `https:${s}`;
  if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, "https://");
  // No scheme, assume https
  if (!/^[a-z0-9+.-]+:\/\//i.test(s)) return `https://${s}`;
  return s;
}

// Normalize HCL cart response into standard cart shape
async function normalizeHclCartInfo(hclCartResponse) {
  if (!hclCartResponse) return null;

  const items = await Promise.all(
    (hclCartResponse.orderItem || []).map(async (item, idx) => {
      const sku = item.partNumber || item.productId || `itm-${idx}`;
      let nproduct = null;
      try {
        // Use storefront GraphQL endpoint to fetch product details by SKU
        // Set the required headers for the storefront GraphQL call
        pdpApi.setFetchGraphQlHeaders((prev) => ({
          ...prev,
          "AC-Environment-Id": "QLAfBfzromvPvMhhu1D5vN",
          "AC-View-Id": "8b16cfa2-dd8d-4eda-9e70-64ba7dc2bdce",
          "AC-Price-Book-ID": "west_coast_inc",
          "AC-Source-Locale": "en-US",
        }));

        const query = `query Products { products(skus: ["${String(sku).replace(/"/g, '\\"')}"]) { sku id url description images { label roles url } name shortDescription } }`;
        const { data } = await pdpApi.fetchGraphQl(query, { method: "POST" });
        // GraphQL returns { data: { products: [...] } }
        nproduct =
          data && (data.products || data.data?.products)
            ? (data.products && data.products[0]) ||
              (data.data?.products && data.data.products[0])
            : null;
        // If fetchGraphQl returns wrapped differently, try direct properties
        if (!nproduct && data && data.products && data.products.length)
          nproduct = data.products[0];
      } catch (e) {
        nproduct = null;
      }

      // Prefer storefront PDP image, then HCL item image, then productContext, then passed-in product, then previous cart entry, then item.image
      let imageUrl = nproduct?.images?.[0]?.url || nproduct?.image?.url || null;
      if (
        !imageUrl &&
        nproduct?.productContext &&
        Array.isArray(nproduct.productContext) &&
        nproduct.productContext[0]
      ) {
        imageUrl = nproduct.productContext[0]?.images?.[0]?.url || null;
      }

      if (!imageUrl) imageUrl = item?.image || null;
      imageUrl = ensureHttps(imageUrl);
      const images = imageUrl ? [{ url: imageUrl, roles: ["thumbnail"] }] : [];

      // Name fallback: PDP -> passed product -> previous cart -> HCL
      let name = nproduct?.name || null;
      if (!name) name = item.productName || item.partNumber || "Product";

      return {
        itemId:
          item.orderItemId ||
          item.itemId ||
          `${item.partNumber || "itm"}-${idx}`,
        sku,
        name,
        quantity: Number(item.quantity) || 1,
        inStock: item.orderItemInventoryStatus === "Available",

        // Price shape expected by CartItem component
        price: {
          final: {
            amount: {
              value: Number(item.unitPrice || item.orderItemPrice || 0),
            },
          },
        },

        // Add placeholders for brand/model, you can map real ones later
        attributes: [
          { name: "brand", value: item.brand || "" },
          { name: "model", value: item.model || "" },
        ],

        // Provide images as an array of objects so UI .find works
        images,

        // Fallbacks
        productUrl: item.productUrl || "",
        raw: item,
      };
    }),
  );

  const normalizedCart = {
    id: hclCartResponse.orderId || `HCL_CART_${Date.now()}`,
    items,
    totalItems: items.reduce((sum, it) => sum + (it.quantity || 0), 0),
    totals: {
      productTotal: Number(hclCartResponse.totalProductPrice || 0),
      shippingTotal: Number(hclCartResponse.totalShippingCharge || 0),
      taxTotal: Number(hclCartResponse.totalSalesTax || 0),
      grandTotal: Number(hclCartResponse.grandTotal || 0),
      currency: hclCartResponse.grandTotalCurrency || "USD",
    },
    raw: hclCartResponse,
  };

  return normalizedCart;
}

// added function for attocart API call to HCL
async function addToCart(sku, quantity) {
  quantity = quantity.toString();

  const config = getHclConfig();
  // HCL Commerce expects orderItem array in the body
  const body = {
    orderId: ".",
    x_calculateOrder: "0",
    orderItem: [
      {
        quantity,
        partNumber: sku,
      },
    ],
    x_inventoryValidation: true,
  };

  const response = await fetch(config.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error("Could not add item to cart.");
  }

  // code for cart info
  const cartInfoUrl =
    "https://20.40.52.251/wcs/resources/store/715842834/cart/@self";
  const cartResponse = await fetch(cartInfoUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
  });
  if (!cartResponse.ok) {
    const txt = await cartResponse.text();
    throw new Error(
      `Failed to fetch cart info: ${cartResponse.status} – ${txt}`,
    );
  }
  const hclCart = await cartResponse.json();
  const normalizedCart = await normalizeHclCartInfo(hclCart);

  try {
    setCartId(normalizedCart.id);
    setCartStore(normalizedCart);
  } catch (e) {
    console.warn("Could not persist normalized cart", e);
  }

  try {
    const { events } = await import("@dropins/tools/event-bus.js");
    events.emit("cart/data", normalizedCart);
  } catch (e) {
    console.warn("Could not emit cart event", e);
  }

  console.log(JSON.parse(localStorage.getItem("shopper_cart")));

  if (typeof window !== "undefined") {
    window.location.href = "/cart";
  }

  return hclCart;
}

async function getApiConfig() {
  const { token } = await getOrRefreshTokenInfo();
  const config = getSalesforceConfig();
  return {
    ...config,
    throwOnBadResponse: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

function getCartId() {
  return localStorage.getItem("shopper_cart_id") || "";
}

function setCartId(cartId) {
  localStorage.setItem("shopper_cart_id", cartId);
}

function clearCartId() {
  localStorage.removeItem("shopper_cart_id");
}

function getCartStore() {
  try {
    const v = localStorage.getItem("shopper_cart");
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
  // return JSON.parse(localStorage.getItem('shopper_cart') || '{}');
}

function setCartStore(cart) {
  try {
    localStorage.setItem("shopper_cart", JSON.stringify(cart));
  } catch (e) {
    /* ignore storage errors */
  }
  // localStorage.setItem('shopper_cart', JSON.stringify(cart));
}

function clearCartStore() {
  localStorage.removeItem("shopper_cart");
}

function clearCart() {
  clearCartId();
  clearCartStore();
}

async function emitCartDataEvent(cart) {
  const { events } = await import("@dropins/tools/event-bus.js");
  events.emit("cart/data", cart);
}

function getTokenInfoFromStorage() {
  try {
    return JSON.parse(localStorage.getItem("shopper_token_info") || "{}");
  } catch {
    return {};
  }
}

function clearTokenInfo() {
  localStorage.removeItem("shopper_token_info");
}

function getExpiresAt(expiresIn) {
  return new Date(Date.now() + expiresIn * 1000).getTime();
}

function setTokenInfo(tokenInfo) {
  if (typeof window !== "undefined") {
    localStorage.setItem("shopper_token_info", JSON.stringify(tokenInfo));
  }
}

async function getOrRefreshTokenInfo() {
  try {
    const config = getSalesforceConfig();
    let tokenInfo = getTokenInfoFromStorage();

    // Check if token is expired and refresh if necessary
    const now = Date.now();
    let isExpired = false;
    if (tokenInfo.expiresAt) {
      isExpired = now > tokenInfo.expiresAt + 5000;
    }
    let isRefreshTokenExpired = false;
    if (tokenInfo.refreshTokenExpiresAt) {
      isRefreshTokenExpired = now > tokenInfo.refreshTokenExpiresAt + 5000;
    }

    if (!tokenInfo.token) {
      const guestToken = await getGuestToken();
      tokenInfo = {
        token: guestToken.token,
        expiresAt: guestToken.expiresAt,
        refreshToken: guestToken.refreshToken,
        refreshTokenExpiresAt: guestToken.refreshTokenExpiresAt,
        customerId: guestToken.customerId,
        type: "guest",
      };
    } else if (isExpired && !isRefreshTokenExpired) {
      const {
        access_token: token,
        expires_in: expiresIn,
        refresh_token: refreshToken,
        refresh_token_expires_in: refreshTokenExpiresIn,
        customer_id: customerId,
      } = await helpers.refreshAccessToken({
        slasClient: new ShopperLogin(config),
        parameters: { refreshToken: tokenInfo.refreshToken || "" },
      });
      // TODO Check if refresh token worked
      tokenInfo = {
        token,
        expiresAt: getExpiresAt(expiresIn),
        refreshToken,
        refreshTokenExpiresAt: getExpiresAt(refreshTokenExpiresIn),
        customerId,
        type: "registered",
      };
    }
    setTokenInfo(tokenInfo);
    return tokenInfo;
  } catch (error) {
    const message = "Could not get auth token from Salesforce.";
    throw new Error(message, { cause: error });
  }
}

async function getGuestToken() {
  try {
    const config = getSalesforceConfig();
    const {
      access_token: token,
      expires_in: expiresIn,
      refresh_token: refreshToken,
      refresh_token_expires_in: refreshTokenExpiresIn,
      customer_id: customerId,
    } = await helpers.loginGuestUser({
      slasClient: new ShopperLogin(config),
      parameters: { redirectURI: config.redirectUri },
    });
    const expiresAt = new Date(Date.now() + expiresIn * 1000).getTime();
    const refreshTokenExpiresAt = getExpiresAt(refreshTokenExpiresIn);
    const tokenInfo = {
      token,
      expiresAt,
      refreshToken,
      refreshTokenExpiresAt,
      customerId,
      type: "guest",
    };
    return tokenInfo;
  } catch (error) {
    const message = "Could not obtain new guest shopper token.";
    throw new Error(message, { cause: error });
  }
}

async function getShopperToken(username, password) {
  try {
    const config = getSalesforceConfig();
    const {
      access_token: token,
      refresh_token: refreshToken,
      customer_id: customerId,
      expires_in: expiresIn,
      refresh_token_expires_in: refreshTokenExpiresIn,
    } = await helpers.loginRegisteredUserB2C({
      slasClient: new ShopperLogin(config),
      credentials: { username, password },
      parameters: { redirectURI: config.redirectUri },
    });
    const expiresAt = getExpiresAt(expiresIn);
    const refreshTokenExpiresAt = getExpiresAt(refreshTokenExpiresIn);
    const tokenInfo = {
      token,
      refreshToken,
      customerId,
      expiresAt,
      refreshTokenExpiresAt,
      type: "registered",
    };
    return tokenInfo;
  } catch (error) {
    const message = "Could not obtain new shopper token.";
    throw new Error(message, { cause: error });
  }
}

async function registerNewCustomer(firstName, lastName, email, password) {
  try {
    const config = getSalesforceConfig();
    const guestToken = await getGuestToken();
    await registerCustomer(
      config,
      guestToken.token,
      { firstName, lastName, email },
      password,
    );
    await signIn(email, password);
  } catch (error) {
    const message = "Could not register new shopper.";
    throw new Error(message, { cause: error });
  }
}

function isSignedIn() {
  return getTokenInfoFromStorage().type === "registered";
}

async function signInAsGuest() {
  const tokenInfo = await getGuestToken();
  setTokenInfo(tokenInfo);
}

async function signIn(username, password) {
  try {
    const shopperToken = await getShopperToken(username, password);
    const tokenInfo = {
      token: shopperToken.token,
      expiresAt: shopperToken.expiresAt,
      refreshToken: shopperToken.refreshToken,
      refreshTokenExpiresAt: shopperToken.refreshTokenExpiresAt,
      customerId: shopperToken.customerId,
      type: "registered",
    };
    setTokenInfo(tokenInfo);
    // TODO: Merge cart from guest to logged in user
    clearCart();
  } catch (error) {
    const message = "Could not sign in shopper.";
    throw new Error(message, { cause: error });
  }
}

async function signOut() {
  try {
    const config = getSalesforceConfig();
    const tokenInfo = getTokenInfoFromStorage();
    await helpers.logout({
      slasClient: new ShopperLogin(config),
      parameters: {
        accessToken: tokenInfo.token,
        refreshToken: tokenInfo.refreshToken,
      },
    });
  } catch (error) {
    const message = "Could not revoke tokens. User logged out locally.";
    throw new Error(message, { cause: error });
  } finally {
    clearTokenInfo();
    clearCart();
  }
}

async function createCart() {
  try {
    const client = new ShopperBasketsV2(await getApiConfig());
    const newCart = await client.createBasket({
      body: {},
    });
    setCartId(newCart.basketId || "");
    const cart = await transformCart(newCart);
    setCartStore(cart);
    return cart;
  } catch (error) {
    const message = "Could not create new cart.";
    throw new Error(message, { cause: error });
  }
}

async function getCartById(cartId) {
  try {
    const client = new ShopperBasketsV2(await getApiConfig());
    const salesforceCart = await client.getBasket({
      parameters: {
        basketId: cartId,
      },
    });
    const cart = await transformCart(salesforceCart);
    setCartStore(cart);
    return cart;
  } catch (error) {
    if (error.response?.status === 404) {
      clearCartId();
      return undefined;
    }
    const message = `Could not get cart with id ${cartId}.`;
    throw new Error(message, { cause: error });
  }
}

async function getCustomerCart() {
  try {
    const { customerId } = await getOrRefreshTokenInfo();
    if (!customerId) {
      return undefined;
    }
    const client = new ShopperCustomers(await getApiConfig());
    const salesforceCarts = await client.getCustomerBaskets({
      parameters: {
        customerId,
      },
    });
    const salesforceCart = salesforceCarts.baskets?.[0];
    if (!salesforceCart) {
      return undefined;
    }
    const cart = await transformCart(salesforceCart);
    setCartStore(cart);
    return cart;
  } catch (error) {
    const message = "Could not get customer cart.";
    throw new Error(message, { cause: error });
  }
}

async function getOrCreateCart() {
  try {
    const cartId = getCartId();
    console.log("cartId", cartId);
    let cart;
    // Cart ID is set, get the cart from Salesforce
    if (cartId && cartId !== "") {
      cart = await getCartById(cartId);
      console.log("cartId", cart);
      if (!cart) {
        clearCartId();
      }
    }
    // Cart is still not set, get customer cart
    if (!cart && isSignedIn()) {
      cart = await getCustomerCart();
    }
    // No existing carts, create a new one
    if (!cart) {
      cart = await createCart();
    }
    // If no cart is found, throw an error
    if (!cart || !cart.id) {
      throw new Error("Failed to get or create cart");
    }
    setCartId(cart.id);
    setCartStore(cart);
    return cart;
  } catch (error) {
    const message = "Could not get or create new cart.";
    throw new Error(message, { cause: error });
  }
}

// async function addToCart(sku, quantity, existingCart) {
//   try {
//     const cart = existingCart ?? (await getOrCreateCart());
//     const client = new ShopperBasketsV2(await getApiConfig());
//     const salesforceCart = await client.addItemToBasket({
//       parameters: {
//         basketId: cart.id,
//       },
//       body: [
//         {
//           productId: sku,
//           quantity,
//         },
//       ],
//     });
//     const salesforceCartId = salesforceCart.basketId || salesforceCart.id;
//     if (!salesforceCartId) {
//       throw new Error('Cannot add item to cart: Cart ID not found');
//     }
//     const updatedCart = await transformCart(salesforceCart);
//     setCartStore(updatedCart);
//     const product = updatedCart.items.find((item) => item.sku === sku);
//     sendAddToCartEvent(product, quantity, updatedCart);
//     await emitCartDataEvent(updatedCart);
//     return updatedCart;
//   } catch (error) {
//     const message = 'Could not add item to cart.';
//     throw new Error(message, { cause: error });
//   }
// }

async function removeFromCart(itemId, existingCart, updateCart = true) {
  // const cart = existingCart ?? (await getCartStore());
  // console.log("cart in update quantity",cart);
  // const product = cart.items.find((item) => item.itemId === itemId);
  const config = getHclConfig();
  const removeUrl =
    "https://20.40.52.251/wcs/resources/store/715842834/cart/@self/delete_order_item";

  const body = {
    calculateOrder: "1",
    calculationUsage: "-1,-2,-5,-6,-7",
    catalogId: "3074457345616692369",
    check: "*n",
    langId: "-1",
    orderId: ".",
    orderItemId: itemId,
    storeId: "715842834",
  };
  const response = await fetch(removeUrl, {
    method: "PUT", // HCL usually expects PUT for update_order_item
    headers: {
      "Content-Type": "application/json",
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HCL update_cart_quantity failed: ${response.status} – ${text}`,
    );
  }

  // const hclCart = await response.json();

  const cartInfoUrl =
    "https://20.40.52.251/wcs/resources/store/715842834/cart/@self";
  const cartResponse = await fetch(cartInfoUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
  });
  if (!cartResponse.ok) {
    const txt = await cartResponse.text();
    throw new Error(
      `Failed to fetch cart info: ${cartResponse.status} – ${txt}`,
    );
  }
  const hclCart = await cartResponse.json();
  const normalizedCart = await normalizeHclCartInfo(hclCart);

  try {
    setCartId(normalizedCart.id);
    setCartStore(normalizedCart);
  } catch (e) {
    console.warn("Could not persist normalized cart", e);
  }

  try {
    const { events } = await import("@dropins/tools/event-bus.js");
    events.emit("cart/data", normalizedCart);
  } catch (e) {
    console.warn("Could not emit cart event", e);
  }

  // console.log(JSON.parse(localStorage.getItem('shopper_cart')));

  // if (typeof window !== 'undefined') {
  //     window.location.href = '/cart';
  //   }

  // try {
  //   const cart = existingCart ?? (await getOrCreateCart());
  //   const client = new ShopperBasketsV2(await getApiConfig());
  //   const salesforceCart = await client.removeItemFromBasket({
  //     parameters: {
  //       basketId: cart.id,
  //       itemId,
  //     },
  //   });
  //   const updatedCart = await transformCart(salesforceCart);
  //   if (updateCart) {
  //     setCartStore(updatedCart);
  //     await emitCartDataEvent(updatedCart);
  //   }
  //   const product = updatedCart.items.find((item) => item.itemId === itemId);
  //   sendRemoveFromCartEvent(product, product.quantity, updatedCart);
  //   return updatedCart;
  // } catch (error) {
  //   const message = 'Could not remove item from cart.';
  //   throw new Error(message, { cause: error });
  // }
}

async function updateCartQuantity(itemId, quantity, existingCart) {
  // const cart = existingCart ?? (await getCartStore());
  // console.log("cart in update quantity",cart);
  // const product = cart.items.find((item) => item.itemId === itemId);
  // const productName = product ? product.name : 'Product';
  const config = getHclConfig();
  const updateUrl =
    "https://20.40.52.251/wcs/resources/store/715842834/cart/@self/update_order_item";

  const body = {
    x_remerge: "***",
    x_check: "*n",
    x_allocate: "***",
    x_backorder: "***",
    x_calculationUsage: "-1,-2,-3,-4,-5,-6,-7",
    x_calculateOrder: "1",
    orderId: ".",
    x_isCheckout: "true",
    orderItem: [
      {
        orderItemId: String(itemId),
        quantity: String(quantity),
      },
    ],
  };

  const response = await fetch(updateUrl, {
    method: "PUT", // HCL usually expects PUT for update_order_item
    headers: {
      "Content-Type": "application/json",
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `HCL update_cart_quantity failed: ${response.status} – ${text}`,
    );
  }

  // const hclCart = await response.json();

  const cartInfoUrl =
    "https://20.40.52.251/wcs/resources/store/715842834/cart/@self";
  const cartResponse = await fetch(cartInfoUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
  });
  if (!cartResponse.ok) {
    const txt = await cartResponse.text();
    throw new Error(
      `Failed to fetch cart info: ${cartResponse.status} – ${txt}`,
    );
  }
  const hclCart = await cartResponse.json();
  const normalizedCart = await normalizeHclCartInfo(hclCart);

  try {
    setCartId(normalizedCart.id);
    setCartStore(normalizedCart);
  } catch (e) {
    console.warn("Could not persist normalized cart", e);
  }

  try {
    const { events } = await import("@dropins/tools/event-bus.js");
    events.emit("cart/data", normalizedCart);
  } catch (e) {
    console.warn("Could not emit cart event", e);
  }

  // console.log(JSON.parse(localStorage.getItem('shopper_cart')));

  // if (typeof window !== 'undefined') {
  //     window.location.href = '/cart';
  //   }

  // // Reuse your existing normalize function
  // const normalizedCart = normalizeHclCartInfo(hclCart);

  // // Persist & broadcast the updated cart
  // try {
  //   setCartId(normalizedCart.id);
  //   setCartStore(normalizedCart);

  //   const { events } = await import("@dropins/tools/event-bus.js");
  //   events.emit("cart/data", normalizedCart);
  // } catch (e) {
  //   console.warn("Failed to persist or emit updated cart", e);
  // }

  // return normalizedCart;

  // try {
  //   const cart = existingCart ?? (await getOrCreateCart());
  //   await removeFromCart(itemId, cart, false);
  //   const sku = cart.items.find((item) => item.itemId === itemId)?.sku;
  //   console.log(cart.items);
  //   if (!sku) {
  //     throw new Error('Cannot update cart quantity: Item not found in cart');
  //   }
  //   const updatedCart = await addToCart(sku, quantity, cart);
  //   setCartStore(updatedCart);
  //   await emitCartDataEvent(updatedCart);
  //   if (quantity === 0) {
  //     const product = updatedCart.items.find((item) => item.itemId === itemId);
  //     sendRemoveFromCartEvent(product, product.quantity, updatedCart);
  //   }
  //   return updatedCart;
  // } catch (error) {
  //   const message = 'Could not update cart quantity.';
  //   throw new Error(message, { cause: error });
  // }
}

async function addShippingAddress(address, existingCart, updateCart = true) {
  try {
    const cart = existingCart ?? (await getOrCreateCart());
    const client = new ShopperBasketsV2(await getApiConfig());
    const salesforceCart = await client.updateShippingAddressForShipment({
      parameters: {
        basketId: cart.id,
        shipmentId: "me", // Current user's shipment
      },
      body: {
        firstName: address.firstName,
        lastName: address.lastName,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        stateCode: address.stateCode,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
        phone: address.phone,
      },
    });
    if (updateCart) {
      const updatedCart = await transformCart(salesforceCart);
      setCartStore(updatedCart);
      return updatedCart;
    }
    return cart;
  } catch (error) {
    const message = "Could not add shipping address to Salesforce order.";
    throw new Error(message, { cause: error });
  }
}

async function addBillingAddress(address, existingCart, updateCart = true) {
  try {
    const cart = existingCart ?? (await getOrCreateCart());
    const client = new ShopperBasketsV2(await getApiConfig());
    const salesforceCart = await client.updateBillingAddressForBasket({
      parameters: {
        basketId: cart.id,
      },
      body: {
        firstName: address.firstName,
        lastName: address.lastName,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        stateCode: address.stateCode,
        postalCode: address.postalCode,
        countryCode: address.countryCode,
        phone: address.phone,
      },
    });
    if (updateCart) {
      const updatedCart = await transformCart(salesforceCart);
      setCartStore(updatedCart);
      return updatedCart;
    }
    return cart;
  } catch (error) {
    const message = "Could not add billing address to order.";
    throw new Error(message, { cause: error });
  }
}

async function addPaymentMethod(
  paymentMethod,
  existingCart,
  updateCart = true,
) {
  try {
    const cart = existingCart ?? (await getOrCreateCart());
    const client = new ShopperBasketsV2(await getApiConfig());
    const salesforceCart = await client.addPaymentInstrumentToBasket({
      parameters: {
        basketId: cart.id,
      },
      body: {
        paymentMethodId: paymentMethod.paymentMethodId,
        paymentCard: paymentMethod.paymentCard,
      },
    });
    if (updateCart) {
      const updatedCart = await transformCart(salesforceCart);
      setCartStore(updatedCart);
      return updatedCart;
    }
    return cart;
  } catch (error) {
    const message = "Could not add payment method to order.";
    throw new Error(message, { cause: error });
  }
}

async function getShippingMethods(existingCart) {
  try {
    const cart = existingCart ?? (await getOrCreateCart());
    const client = new ShopperBasketsV2(await getApiConfig());
    const salesforceShippingMethods =
      await client.getShippingMethodsForShipment({
        parameters: {
          basketId: cart.id,
          shipmentId: "me", // Current user's shipment
        },
      });
    const shippingMethods =
      salesforceShippingMethods?.applicableShippingMethods?.map((method) => ({
        id: method.id,
        name: method.name,
        description: method.description,
        price: method.price,
        isDefault:
          salesforceShippingMethods.defaultShippingMethodId === method.id,
      }));
    return shippingMethods ?? [];
  } catch (error) {
    const message = "Could not get shipping methods for order.";
    throw new Error(message, { cause: error });
  }
}

async function updateShippingMethod(shippingMethodId, existingCart) {
  try {
    const cart = existingCart ?? (await getOrCreateCart());
    const client = new ShopperBasketsV2(await getApiConfig());
    const salesforceCart = await client.updateShippingMethodForShipment({
      parameters: {
        basketId: cart.id,
        shipmentId: "me", // Current user's shipment
      },
      body: {
        id: shippingMethodId,
      },
    });
    const updatedCart = await transformCart(salesforceCart);
    setCartStore(updatedCart);
    return updatedCart;
  } catch (error) {
    const message = "Could not update shipping method for order.";
    throw new Error(message, { cause: error });
  }
}

async function placeOrder(existingCart) {
  try {
    const cart = existingCart ?? (await getOrCreateCart());
    const client = new ShopperOrders(await getApiConfig());
    const salesforceOrder = await client.createOrder({
      body: {
        basketId: cart.id,
      },
    });
    if (!salesforceOrder.orderNo) {
      throw new Error("Order creation failed: No order number returned");
    }
    clearCart();
    const order = await transformOrderInfo(salesforceOrder);
    await sendPlaceOrderEvent(cart, order);
    return order;
  } catch (error) {
    const message = "Could not place order.";
    throw new Error(message, { cause: error });
  }
}

async function getOrder(orderNumber) {
  try {
    const client = new ShopperOrders(await getApiConfig());
    const salesforceOrder = await client.getOrder({
      parameters: {
        orderNo: orderNumber,
      },
    });
    if (!salesforceOrder.orderNo) {
      throw new Error("Order not found");
    }
    return await transformOrderInfo(salesforceOrder);
  } catch (error) {
    const message = "Could not get order information.";
    throw new Error(message, { cause: error });
  }
}

export {
  isSignedIn,
  registerNewCustomer,
  signInAsGuest,
  signIn,
  signOut,
  getCartStore,
  getOrCreateCart,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  addShippingAddress,
  addBillingAddress,
  addPaymentMethod,
  getShippingMethods,
  updateShippingMethod,
  placeOrder,
  getOrder,
};
