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

import { getCartContext, getChangedProductsContext } from './contexts/cart.js';
import getOrderContext from './contexts/order.js';
import { getProductContext } from './contexts/product.js';

const contexts = {
  SHOPPING_CART_CONTEXT: 'shoppingCartContext',
  PRODUCT_CONTEXT: 'productContext',
  CHANGED_PRODUCTS_CONTEXT: 'changedProductsContext',
  ORDER_CONTEXT: 'orderContext',
};

const events = {
  SHOPPING_CART_VIEW: 'shopping-cart-view',
  ADD_TO_CART: 'add-to-cart',
  REMOVE_FROM_CART: 'remove-from-cart',
  INITIATE_CHECKOUT: 'initiate-checkout',
  PLACE_ORDER: 'place-order',
};

function getAdobeDataLayer() {
  window.adobeDataLayer = window.adobeDataLayer || [];
  return window.adobeDataLayer;
}

function setContext(name, data) {
  const adobeDataLayer = getAdobeDataLayer();
  // Clear existing context
  adobeDataLayer.push({
    [name]: null,
  });
  // Set new context
  adobeDataLayer.push({
    [name]: data,
  });
}

async function pushEvent(event, additionalContext) {
  const adobeDataLayer = getAdobeDataLayer();
  adobeDataLayer.push((acdl) => {
    const state = acdl.getState ? acdl.getState() : {};
    acdl.push({
      event,
      eventInfo: {
        ...state,
        ...additionalContext,
      },
    });
  });
  // Give the data layer listeners time to process the event
  await new Promise((resolve) => {
    setTimeout(resolve, 500);
  });
}

async function sendCartViewEvent(cart) {
  const cartContext = getCartContext(cart);
  setContext(contexts.SHOPPING_CART_CONTEXT, cartContext);
  await pushEvent(events.SHOPPING_CART_VIEW);
}

async function sendAddToCartEvent(product, quantity, cart) {
  const cartContext = getCartContext(cart);
  const productContext = getProductContext(product);
  const changedProductsContext = getChangedProductsContext(product, quantity, cart);
  setContext(contexts.SHOPPING_CART_CONTEXT, cartContext);
  setContext(contexts.PRODUCT_CONTEXT, productContext);
  setContext(contexts.CHANGED_PRODUCTS_CONTEXT, changedProductsContext);
  await pushEvent(events.ADD_TO_CART);
}

async function sendRemoveFromCartEvent(product, quantity, cart) {
  const cartContext = getCartContext(cart);
  const changedProductsContext = getChangedProductsContext(product, quantity, cart);
  setContext(contexts.SHOPPING_CART_CONTEXT, cartContext);
  setContext(contexts.CHANGED_PRODUCTS_CONTEXT, changedProductsContext);
  await pushEvent(events.REMOVE_FROM_CART);
}

async function sendInitiateCheckoutEvent(cart) {
  const cartContext = getCartContext(cart);
  setContext(contexts.SHOPPING_CART_CONTEXT, cartContext);
  await pushEvent(events.INITIATE_CHECKOUT);
}

async function sendPlaceOrderEvent(cart, order) {
  const cartContext = getCartContext(cart);
  const orderContext = getOrderContext(order);
  setContext(contexts.SHOPPING_CART_CONTEXT, cartContext);
  setContext(contexts.ORDER_CONTEXT, orderContext);
  await pushEvent(events.PLACE_ORDER);
}

export {
  sendCartViewEvent,
  sendAddToCartEvent,
  sendRemoveFromCartEvent,
  sendInitiateCheckoutEvent,
  sendPlaceOrderEvent,
};
