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

import { fetchProducts } from '../../aco/api/products.js';

async function transformCart(salesforceCart) {
  const salesforceCartId = salesforceCart.basketId || salesforceCart.id;
  if (!salesforceCartId) {
    throw new Error('Cannot transform cart: Cart ID not found');
  }
  if (!salesforceCart.productItems || salesforceCart.productItems.length === 0) {
    return {
      id: salesforceCartId,
      items: [],
      totalQuantity: 0,
      subtotal: 0,
      productTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      total: 0,
    };
  }

  const cartProductIds = salesforceCart.productItems?.map((item) => item.productId) ?? [];
  const products = await fetchProducts(cartProductIds);

  const items = [];
  if (products.length > 0) {
    // match product to salesforceCartItem by sku === productId
    salesforceCart.productItems.forEach((item) => {
      const product = products.find((p) => p.sku === item.productId);
      if (!product) return;
      items.push(transformCartItem(product, item));
    });
  }

  let { taxTotal } = salesforceCart;
  if (!taxTotal) {
    taxTotal = salesforceCart.adjustedMerchandizeTotalTax ?? 0;
  }
  let total = salesforceCart.orderTotal;
  if (!total) {
    total = (salesforceCart.productTotal ?? 0) + taxTotal + (salesforceCart.shippingTotal ?? 0);
  }

  return {
    id: salesforceCartId,
    items,
    totalQuantity:
      salesforceCart.productItems?.reduce((acc, item) => acc + (item?.quantity ?? 0), 0) ?? 0,
    subtotal: salesforceCart.productSubTotal ?? 0,
    productTotal: salesforceCart.productTotal ?? 0,
    shippingTotal: salesforceCart.shippingTotal ?? 0,
    taxTotal,
    total,
    discountCode: salesforceCart.couponItems?.[0]?.code,
    discountAmount: salesforceCart.discountAmount,
  };
}

function transformCartItem(product, salesforceCartItem) {
  product.price = {
    roles: product.price?.roles ?? [],
    regular: {
      amount: {
        currency: salesforceCartItem.currency,
        value: salesforceCartItem.price,
      },
    },
    final: {
      amount: {
        currency: salesforceCartItem.currency,
        value: salesforceCartItem.price,
      },
    },
  };

  return {
    ...product,
    quantity: salesforceCartItem.quantity ?? 1,
    itemId: salesforceCartItem.itemId ?? '',
  };
}

export { transformCart };
