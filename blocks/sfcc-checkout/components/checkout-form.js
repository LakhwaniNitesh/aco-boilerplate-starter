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

import { rootLink } from '../../../scripts/scripts.js';
import {
  updateShippingMethod,
  addShippingAddress,
  addBillingAddress,
  addPaymentMethod,
  placeOrder,
} from '../../../scripts/salesforce/api.js';
import { formatCurrency } from '../../../scripts/salesforce/utils.js';
import { maskCardNumber, detectCardType } from '../utils.js';
import { CheckoutSummary, renderSummaryDetails } from './checkout-summary.js';

function extractFormData(form) {
  const data = {};
  // For some reason the FormData API is returning an empty object,
  // so we need to parse the DOM to get the data manually.
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    if (input.name) {
      if (input.type === 'radio') {
        if (input.checked) {
          data[input.name] = input.value;
        }
      } else if (input.type === 'checkbox') {
        data[input.name] = input.checked;
      } else {
        data[input.name] = input.value;
      }
    }
  });
  return data;
}

function parseExpirationDate(expiry) {
  const [month, year] = expiry.split('/').map((s) => s.trim());
  const fullYear = year.length === 2 ? `20${year}` : year;
  return { month: parseInt(month, 10), year: parseInt(fullYear, 10) };
}

function setFormLoading(form, isLoading) {
  const submitButton = form.querySelector('.place-order-btn');
  const inputs = form.querySelectorAll('input, select, button');

  inputs.forEach((input) => {
    input.disabled = isLoading;
  });

  if (submitButton) {
    submitButton.textContent = isLoading ? 'Processing...' : 'Place order';
  }
}

function showError(form, message) {
  let errorDiv = form.querySelector('.checkout-error');
  if (!errorDiv) {
    errorDiv = document.createElement('div');
    errorDiv.className = 'checkout-error';
    const formColumn = form.querySelector('.checkout-form-column');
    if (formColumn) {
      formColumn.insertBefore(errorDiv, formColumn.firstChild);
    } else {
      form.insertBefore(errorDiv, form.firstChild);
    }
  }
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function hideError(form) {
  const errorDiv = form.querySelector('.checkout-error');
  if (errorDiv) {
    errorDiv.style.display = 'none';
  }
}

async function handleSubmit(event, cart) {
  event.preventDefault();
  const form = event.target;

  hideError(form);
  setFormLoading(form, true);

  try {
    const formData = extractFormData(form);

    // Add shipping address
    await addShippingAddress(
      {
        firstName: formData['first-name'],
        lastName: formData['last-name'],
        address1: formData.address,
        address2: formData.apartment || '',
        city: formData.city,
        stateCode: formData.state,
        postalCode: formData['postal-code'],
        countryCode: formData.country,
      },
      cart,
      false,
    );

    // Add billing address
    await addBillingAddress(
      {
        firstName: formData['first-name'],
        lastName: formData['last-name'],
        address1: formData.address,
        address2: formData.apartment || '',
        city: formData.city,
        stateCode: formData.state,
        postalCode: formData['postal-code'],
        countryCode: formData.country,
      },
      cart,
      false,
    );

    // Add payment method
    const cardType = detectCardType(formData['card-number']);
    const maskedNumber = maskCardNumber(formData['card-number']);
    const { month, year } = parseExpirationDate(formData.expiry);

    await addPaymentMethod(
      {
        paymentMethodId: 'CREDIT_CARD',
        paymentCard: {
          cardType,
          expirationMonth: month,
          expirationYear: year,
          holder: formData['card-name'],
          maskedNumber,
        },
      },
      cart,
      false,
    );

    // Place order
    const order = await placeOrder(cart);

    // Redirect to order confirmation
    window.location.href = rootLink(`/order-confirmation?orderNo=${order.number}`);
  } catch (error) {
    console.error('Checkout failed:', error);
    showError(form, 'Checkout failed. Please check your information and try again.');
  } finally {
    setFormLoading(form, false);
  }
}

export async function CheckoutForm(cart, shippingMethods = []) {
  const form = document.createElement('form');
  form.className = 'checkout-form';

  const formColumn = document.createElement('div');
  formColumn.className = 'checkout-form-column';
  formColumn.innerHTML = `
    <section class="checkout-section">
      <h2>Contact information</h2>
      <div class="form-group">
        <label for="email">Email address</label>
        <input type="email" id="email" name="email" required />
      </div>
    </section>

    <section class="checkout-section">
      <h2>Shipping method</h2>
      <div class="shipping-options">
        ${shippingMethods
    .map(
      (method) => `
          <label class="shipping-option ${method.isDefault ? 'selected' : ''}" data-method-id="${method.id}">
            <input type="radio" name="shipping" value="${method.id}" ${method.isDefault ? 'checked' : ''} required />
            <div class="shipping-option-content">
              <div class="shipping-option-header">
                <span class="shipping-option-name">${method.name}</span>
                <span class="shipping-option-price">${formatCurrency(method.price)}</span>
              </div>
              ${method.description ? `<span class="shipping-option-delivery">${method.description}</span>` : ''}
            </div>
          </label>
        `,
    )
    .join('')}
      </div>
    </section>

    <section class="checkout-section">
      <h2>Shipping information</h2>
      <div class="form-row">
        <div class="form-group">
          <label for="first-name">First name</label>
          <input type="text" id="first-name" name="first-name" required />
        </div>
        <div class="form-group">
          <label for="last-name">Last name</label>
          <input type="text" id="last-name" name="last-name" required />
        </div>
      </div>
      <div class="form-group">
        <label for="address">Address</label>
        <input type="text" id="address" name="address" required />
      </div>
      <div class="form-group">
        <label for="apartment">Apartment, suite, etc. (optional)</label>
        <input type="text" id="apartment" name="apartment" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="city">City</label>
          <input type="text" id="city" name="city" required />
        </div>
        <div class="form-group">
          <label for="country">Country</label>
          <select id="country" name="country" required>
            <option value="US">United States</option>
            <option value="ES">Spain</option>
            <option value="RO">Romania</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="state">State / Province</label>
          <input type="text" id="state" name="state" required />
        </div>
        <div class="form-group">
          <label for="postal-code">Postal code</label>
          <input type="text" id="postal-code" name="postal-code" required />
        </div>
      </div>
    </section>

    <section class="checkout-section">
      <h2>Payment</h2>
      <div class="form-group">
        <label for="card-name">Name on card</label>
        <input type="text" id="card-name" name="card-name" required />
      </div>
      <div class="form-group">
        <label for="card-number">Card number</label>
        <input type="text" id="card-number" name="card-number" pattern="[0-9\\s]{13,19}" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="expiry">Expiration date (MM/YY)</label>
          <input type="text" id="expiry" name="expiry" placeholder="MM/YY" pattern="(0[1-9]|1[0-2])\\/[0-9]{2}" required />
        </div>
        <div class="form-group">
          <label for="cvc">CVC</label>
          <input type="text" id="cvc" name="cvc" pattern="[0-9]{3,4}" required />
        </div>
      </div>
    </section>
  `;

  // Create order summary column
  const summaryColumn = document.createElement('div');
  summaryColumn.className = 'checkout-summary-column';
  summaryColumn.appendChild(CheckoutSummary(cart));
  form.appendChild(formColumn);
  form.appendChild(summaryColumn);

  // Handle shipping option selection
  const shippingOptions = form.querySelectorAll('.shipping-option');
  shippingOptions.forEach((option) => {
    option.addEventListener('click', async () => {
      shippingOptions.forEach((opt) => opt.classList.remove('selected'));
      option.classList.add('selected');

      // Update shipping method and recalculate totals
      const { methodId } = option.dataset;
      const radioInput = option.querySelector('input[type="radio"]');
      if (radioInput) {
        radioInput.checked = true;
      }

      try {
        const updatedCart = await updateShippingMethod(methodId, cart);

        // Update order summary with new values
        const summaryDetails = form.querySelector('.order-summary-details');
        if (summaryDetails) {
          summaryDetails.innerHTML = renderSummaryDetails(updatedCart);
        }
      } catch (error) {
        console.error('Failed to update shipping method:', error);
      }
    });
  });

  // Handle form submission
  form.addEventListener('submit', (event) => handleSubmit(event, cart));

  return form;
}
