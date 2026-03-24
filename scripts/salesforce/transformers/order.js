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

function getOrderStatus(salesforceOrderStatus, salesforceShippingStatus) {
  switch (salesforceShippingStatus) {
    case 'not_shipped':
      return 'processing';
    case 'shipped':
    case 'part_shipped':
      return 'shipped';
    case 'delivered':
      return 'delivered';
    default:
  }

  if (salesforceOrderStatus === 'created' || salesforceOrderStatus === 'new') {
    return 'placed';
  }

  return 'unknown';
}

function transformOrderAddress(address) {
  return {
    firstName: address.firstName,
    lastName: address.lastName,
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    state: address.stateCode,
    postalCode: address.postalCode,
    country: address.country,
  };
}

function getPaymentMethod(paymentMethodId) {
  switch (paymentMethodId) {
    case 'CREDIT_CARD':
      return 'credit_card';
    default:
      return 'other';
  }
}

function getCardType(cardType) {
  switch (cardType) {
    case 'VISA':
      return 'visa';
    case 'MASTERCARD':
      return 'mastercard';
    case 'AMEX':
      return 'amex';
    case 'DISCOVER':
      return 'discover';
    default:
      return 'other';
  }
}

function transformOrderPaymentInfo(paymentInfo, billingAddress) {
  if (!paymentInfo) return undefined;

  return {
    billingAddress: billingAddress ? transformOrderAddress(billingAddress) : undefined,
    paymentMethod: getPaymentMethod(paymentInfo.paymentMethodId),
    cardType: getCardType(paymentInfo.paymentCard?.cardType),
    cardLast4: paymentInfo.paymentCard?.numberLastDigits,
    cardExpirationMonth: paymentInfo.paymentCard?.expirationMonth,
    cardExpirationYear: paymentInfo.paymentCard?.expirationYear,
  };
}

function transformOrderItem(product, salesforceOrderItem) {
  product.price = {
    roles: product.price?.roles ?? [],
    regular: {
      amount: {
        currency: salesforceOrderItem.currency,
        value: salesforceOrderItem.price,
      },
    },
    final: {
      amount: {
        currency: salesforceOrderItem.currency,
        value: salesforceOrderItem.price,
      },
    },
  };

  return {
    ...product,
    quantity: salesforceOrderItem.quantity ?? 1,
  };
}

async function transformOrderInfo(salesforceOrder) {
  const products = await fetchProducts(
    salesforceOrder.productItems?.map((item) => item.productId) ?? []
  );

  const items = [];
  if (products.length > 0) {
    salesforceOrder.productItems.forEach((item) => {
      const product = products.find((p) => p.sku === item.productId);
      if (!product) return;
      items.push(transformOrderItem(product, item));
    });
  }

  const status = getOrderStatus(
    salesforceOrder.status ?? 'unknown',
    salesforceOrder.shippingStatus ?? 'unknown'
  );

  return {
    number: salesforceOrder.orderNo?.toString() ?? '',
    subtotal: salesforceOrder.productSubTotal ?? 0,
    shippingTotal: salesforceOrder.shippingTotal ?? 0,
    shippingMethod: salesforceOrder.shipments?.[0]?.shippingMethod?.id ?? '',
    taxTotal: salesforceOrder.taxTotal ?? 0,
    total: salesforceOrder.orderTotal ?? 0,
    date: salesforceOrder.creationDate ?? '',
    status,
    statusStep: status,
    items,
    shippingAddress: salesforceOrder.shipments?.[0]?.shippingAddress
      ? transformOrderAddress(salesforceOrder.shipments?.[0]?.shippingAddress)
      : undefined,
    paymentInfo: transformOrderPaymentInfo(
      salesforceOrder.paymentInstruments?.[0],
      salesforceOrder.billingAddress
    ),
  };
}

export { transformOrderInfo };
