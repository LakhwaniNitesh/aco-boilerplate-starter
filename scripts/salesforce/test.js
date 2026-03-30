import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';

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

// Ensure a URL is https and idempotent. Returns original value when falsy.
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

// added function for attocart API call to HCL
async function addToCart(sku, quantity) {
  quantity = quantity.toString();

  const config = getHclConfig();
  // HCL Commerce expects orderItem array in the body
  const body = {
    orderId: '.',
    x_calculateOrder: '0',
    orderItem: [
      {
        quantity,
        partNumber: sku,
      },
    ],
    x_inventoryValidation: true,
  };

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      WCToken: config.WCToken,
      WCTrustedToken: config.WCTrustedToken,
      Cookie: config.Cookie,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error('Could not add item to cart.');
  }

  // code for cart info
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

  try {
    const { events } = await import('@dropins/tools/event-bus.js');
    events.emit('cart/data', normalizedCart);
  } catch (e) {
    console.warn('Could not emit cart event', e);
  }

  console.log(JSON.parse(localStorage.getItem('shopper_cart')));

  if (typeof window !== 'undefined') {
    window.location.href = '/cart';
  }

  return hclCart;
}

function setCartId(cartId) {
  localStorage.setItem('shopper_cart_id', cartId);
}

function getCartStore() {
  try {
    const v = localStorage.getItem('shopper_cart');
    return v ? JSON.parse(v) : null;
  } catch (e) {
    return null;
  }
  // return JSON.parse(localStorage.getItem('shopper_cart') || '{}');
}

function setCartStore(cart) {
  try {
    localStorage.setItem('shopper_cart', JSON.stringify(cart));
  } catch (e) {
    /* ignore storage errors */
  }
  // localStorage.setItem('shopper_cart', JSON.stringify(cart));
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
        type: 'guest',
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
        parameters: { refreshToken: tokenInfo.refreshToken || '' },
      });
      // TODO Check if refresh token worked
      tokenInfo = {
        token,
        expiresAt: getExpiresAt(expiresIn),
        refreshToken,
        refreshTokenExpiresAt: getExpiresAt(refreshTokenExpiresIn),
        customerId,
        type: 'registered',
      };
    }
    setTokenInfo(tokenInfo);
    return tokenInfo;
  } catch (error) {
    const message = 'Could not get auth token from Salesforce.';
    throw new Error(message, { cause: error });
  }
}
