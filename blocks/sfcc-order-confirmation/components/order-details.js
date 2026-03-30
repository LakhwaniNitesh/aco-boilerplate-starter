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

import { formatDate } from '../../../scripts/salesforce/utils.js';

export default function OrderDetails(order) {
  const component = document.createElement('div');
  component.className = 'order-details-header';

  component.innerHTML = `
    <div class="order-details-info">
      <span class="order-details-label">Order number</span>
      <span class="order-details-number">${order.number}</span>
      <span class="order-details-date">${formatDate(order.date)}</span>
    </div>
  `;

  return component;
}
