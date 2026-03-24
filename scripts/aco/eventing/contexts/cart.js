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

import { getProductContext } from './product.js';

function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0);
}

function getCartContext(cart) {
  const products = cart.items;
  const cartId = cart.id;

  return {
    id: cartId,
    items: products.map((product) => getShoppingCartItem(product)),
    totalQuantity: cart.totalQuantity,
  };
}

function getChangedProductsContext(product, quantity, cart) {
  const cartItem = {
    ...product,
    quantity,
    itemId: cart.items.find((item) => item.sku === product.sku)?.itemId ?? '',
  };
  return {
    items: [getShoppingCartItem(cartItem)],
  };
}

function getShoppingCartItem(cartItem) {
  return {
    canApplyMsrp: false,
    formattedPrice: formatCurrency(cartItem.price?.final?.amount?.value ?? 0),
    id: cartItem.sku,
    prices: {
      price: {
        value: cartItem.price?.final?.amount?.value ?? 0,
        currency: cartItem.price?.final?.amount?.currency ?? undefined,
        regularPrice: cartItem.price?.regular?.amount?.value ?? undefined,
      },
    },
    product: getProductContext(cartItem),
    quantity: cartItem.quantity,
  };
}

export { getCartContext, getChangedProductsContext };
