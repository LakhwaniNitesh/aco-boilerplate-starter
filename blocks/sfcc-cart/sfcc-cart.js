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
/* eslint-disable import/no-unresolved */

import { events } from '@dropins/tools/event-bus.js';
import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { sendCartViewEvent } from '../../scripts/aco/eventing/api.js';
import { getOrCreateCart } from '../../scripts/salesforce/api.js';
import EmptyCart from './components/empty-cart.js';
import CartList from './components/cart-list.js';
import CartSummary from './components/cart-summary.js';

function getHclConfig() {
  const configObject = getConfigValue('hcl-commerce');
  return {
    apiUrl: configObject['api-url'],
    WCToken: sessionStorage.getItem('hcl-wctoken'),
    WCTrustedToken: sessionStorage.getItem('hcl-wctrustedtoken'),
    userId: configObject.userId,
    storeId: configObject['store-id'],
    locale: configObject.locale,
    Cookie: configObject.Cookie,
  };
}

function ensureHttps(url) {
  if (!url || typeof url !== 'string') return url;
  const s = url.trim();
  if (s.startsWith('https://')) return s;
  if (s.startsWith('//')) return `https:${s}`;
  if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, 'https://');
  // No scheme, assume https
  if (!/^[a-z0-9+.-]+:\/\//i.test(s)) return `https://${s}`;
  return s;
}

async function normalizeHclCartInfo(hclCartResponse) {
  if (!hclCartResponse) return null;

  const items = await Promise.all((hclCartResponse.orderItem || []).map(async (item, idx) => {
    const sku = item.partNumber || item.productId || `itm-${idx}`;
    let nproduct = null;
    try {
      // Use storefront GraphQL endpoint to fetch product details by SKU
      // Set the required headers for the storefront GraphQL call
      pdpApi.setFetchGraphQlHeaders((prev) => ({
        ...prev,
        'AC-Environment-Id': 'QLAfBfzromvPvMhhu1D5vN',
        'AC-View-Id': '8b16cfa2-dd8d-4eda-9e70-64ba7dc2bdce',
        'AC-Price-Book-ID': 'west_coast_inc',
        'AC-Source-Locale': 'en-US',
      }));

      const query = `query Products { products(skus: ["${String(sku).replace(/"/g, '\\"')}"]) { sku id url description images { label roles url } name shortDescription } }`;
      const { data } = await pdpApi.fetchGraphQl(query, { method: 'POST' });
      // GraphQL returns { data: { products: [...] } }
      nproduct = (data && (data.products || data.data?.products)) ? (data.products && data.products[0]) || (data.data?.products && data.data.products[0]) : null;
      // If fetchGraphQl returns wrapped differently, try direct properties
      if (!nproduct && data && data.products && data.products.length) nproduct = data.products[0];
    } catch (e) {
      nproduct = null;
    }

    // Prefer storefront PDP image, then HCL item image, then productContext, then passed-in product, then previous cart entry, then item.image
    let imageUrl = nproduct?.images?.[0]?.url || nproduct?.image?.url || null;
    if (!imageUrl && nproduct?.productContext && Array.isArray(nproduct.productContext) && nproduct.productContext[0]) {
      imageUrl = nproduct.productContext[0]?.images?.[0]?.url || null;
    }
    if (!imageUrl) imageUrl = item?.image || null;
    imageUrl = ensureHttps(imageUrl);
    const images = imageUrl ? [{ url: imageUrl, roles: ['thumbnail'] }] : [];

    // Name fallback: PDP -> passed product -> previous cart -> HCL
    let name = nproduct?.name || null;
    if (!name) name = item.productName || item.partNumber || 'Product';

    return {
      itemId: item.orderItemId || item.itemId || `${item.partNumber || 'itm'}-${idx}`,
      sku,
      name,
      quantity: Number(item.quantity) || 1,
      inStock: item.orderItemInventoryStatus === 'Available',

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
        { name: 'brand', value: item.brand || '' },
        { name: 'model', value: item.model || '' },
      ],

      // Provide images as an array of objects so UI .find works
      images,

      // Fallbacks
      productUrl: item.productUrl || '',
      raw: item,
    };
  }));

  const normalizedCart = {
    id: hclCartResponse.orderId || `HCL_CART_${Date.now()}`,
    items,
    totalItems: items.reduce((sum, it) => sum + (it.quantity || 0), 0),
    totals: {
      productTotal: Number(hclCartResponse.totalProductPrice || 0),
      shippingTotal: Number(hclCartResponse.totalShippingCharge || 0),
      taxTotal: Number(hclCartResponse.totalSalesTax || 0),
      grandTotal: Number(hclCartResponse.grandTotal || 0),
      currency: hclCartResponse.grandTotalCurrency || 'USD',
    },
    raw: hclCartResponse,
  };

  return normalizedCart;
}

const config = getHclConfig();
const cartInfoUrl = 'https://20.40.52.251/wcs/resources/store/715842834/cart/@self';
const cartResponse = await fetch(cartInfoUrl, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    WCToken: config.WCToken,
    WCTrustedToken: config.WCTrustedToken,
    Cookie: config.Cookie,
  },
});
if (!cartResponse.ok) {
  const txt = await cartResponse.text();
  throw new Error(`Failed to fetch cart info: ${cartResponse.status} – ${txt}`);
}
const hclCart = await cartResponse.json();
const normalizedCart = await normalizeHclCartInfo(hclCart);

try {
  setCartId(normalizedCart.id);
  setCartStore(normalizedCart);
} catch (e) {
  console.warn('Could not persist normalized cart', e);
}

function setCartId(cartId) {
  localStorage.setItem('shopper_cart_id', cartId);
}

function setCartStore(cart) {
  try {
    localStorage.setItem('shopper_cart', JSON.stringify(cart));
  } catch (e) {
    /* ignore storage errors */
  }
  // localStorage.setItem('shopper_cart', JSON.stringify(cart));
}
try {
  // eslint-disable-next-line no-shadow
  const { events: eventsApi } = await import('@dropins/tools/event-bus.js');
  eventsApi.emit('cart/data', normalizedCart);
} catch (e) {
  console.warn('Could not emit cart event', e);
}

async function renderCart(container) {
  // added code
  let cart = null;
  const hclCartData = localStorage.getItem('shopper_cart');
  // eslint-disable-next-line no-console
  if (hclCartData) {
    try {
      cart = JSON.parse(hclCartData);
    } catch {
      cart = null;
    }
  }
  if (!cart) {
    cart = await getOrCreateCart();
  }
  // added code end
  sendCartViewEvent(cart);

  container.innerHTML = '<h3>Shopping Cart</h3><hr/>';

  if (!cart || !cart.items || cart.items.length === 0) {
    container.appendChild(EmptyCart());
  } else {
    const cartContainer = document.createElement('div');
    cartContainer.className = 'cart-container';
    const itemsList = CartList(cart);
    cartContainer.appendChild(itemsList);

    const sidebar = document.createElement('div');
    sidebar.className = 'cart-sidebar';
    sidebar.appendChild(CartSummary(cart));
    cartContainer.appendChild(sidebar);

    container.appendChild(cartContainer);
  }
}

export default async function decorate(block) {
  const container = document.createElement('div');
  block.appendChild(container);
  await renderCart(container);

  events.on('cart/data', async () => {
    // renderCart(document.querySelector("#main-cart-container"), updatedCart);
    await renderCart(container);
  });
}
