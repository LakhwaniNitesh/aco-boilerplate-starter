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

import { getOrder } from '../../scripts/salesforce/api.js';
import OrderDetails from './components/order-details.js';
import OrderList from './components/order-list.js';
import OrderSummary from './components/order-summary.js';

function getOrderNumberFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('orderNo');
}

async function renderOrderConfirmation(container, orderNumber) {
  try {
    const order = await getOrder(orderNumber);

    container.innerHTML = '<h3>Order Details</h3><hr/>';
    container.appendChild(OrderDetails(order));
    container.appendChild(OrderList(order));
    container.appendChild(OrderSummary(order));
  } catch (error) {
    container.innerHTML = `
      <h3>Order Not Found</h3>
      <hr/>
      <p>Please check your order number and try again.</p>
    `;
  }
}

export default async function decorate(block) {
  const container = document.createElement('div');
  block.appendChild(container);

  const orderNumber = getOrderNumberFromUrl();

  if (!orderNumber) {
    container.innerHTML = `
      <h3>Order Confirmation</h3>
      <hr/>
      <p>No order number provided. Please check your confirmation email for the order details link.</p>
    `;
    return;
  }

  await renderOrderConfirmation(container, orderNumber);
}
