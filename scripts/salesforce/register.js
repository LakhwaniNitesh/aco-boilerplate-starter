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

function getUrl(apiUrl, organizationId, siteId) {
  return `${apiUrl}/customer/shopper-customers/v1/organizations/${organizationId}/customers?siteId=${siteId}`;
}

async function registerCustomer(config, token, customer, password) {
  const url = getUrl(config.proxy, config.parameters.organizationId, config.parameters.siteId);
  const body = {
    password,
    customer: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      login: customer.email,
    },
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error('Could not register new customer');
  }

  const data = await res.json();
  return data;
}

export { registerCustomer };
