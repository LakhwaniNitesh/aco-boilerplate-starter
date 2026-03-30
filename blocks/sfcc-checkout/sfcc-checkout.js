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

import { sendInitiateCheckoutEvent } from '../../scripts/aco/eventing/api.js';
import {
  getOrCreateCart,
  getShippingMethods,
  updateShippingMethod,
} from '../../scripts/salesforce/api.js';
import CheckoutForm from './components/checkout-form.js';

export default async function decorate(block) {
  let cart = await getOrCreateCart();
  sendInitiateCheckoutEvent(cart);

  // Fetch shipping methods and sort so default is first
  const shippingMethods = await getShippingMethods(cart);
  const sortedShippingMethods = [...shippingMethods].sort(
    (a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0),
  );
  // Set default shipping method to cart
  cart = await updateShippingMethod(sortedShippingMethods[0].id, cart);

  block.innerHTML = '<h3>Checkout</h3><hr/>';

  const container = document.createElement('div');
  container.className = 'checkout-container';
  container.appendChild(await CheckoutForm(cart, sortedShippingMethods));

  block.appendChild(container);
}
