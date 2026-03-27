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
/* eslint-disable-next-line import/no-unresolved */
import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';

import {
  ProductViewAttributeFields,
  ProductViewBaseFields,
  ProductViewImageFields,
  ProductViewOptionFields,
  ProductViewOptionValueFields,
  ProductViewPriceFields,
  ProductViewPriceRangeFields,
} from './fragments.js';

const GET_PRODUCTS_QUERY = `
  query ProductDetails($skus: [String!]) {
    products(skus: $skus) {
      ...ProductViewBaseFields
      images(roles: []) {
        ...ProductViewImageFields
      }
      attributes(roles: []) {
        ...ProductViewAttributeFields
      }
      ... on SimpleProductView {
        price {
          ...ProductViewPriceFields
        }
      }
      ... on ComplexProductView {
        options {
          ...ProductViewOptionFields
        }
        priceRange {
          ...ProductViewPriceRangeFields
        }
      }
    }
  }

  ${ProductViewBaseFields}
  ${ProductViewImageFields}
  ${ProductViewAttributeFields}
  ${ProductViewPriceFields}
  ${ProductViewPriceRangeFields}
  ${ProductViewOptionFields}
  ${ProductViewOptionValueFields}
`;

async function fetchProducts(productIds) {
  const headers = {
    'Content-Type': 'application/json',
    ...getConfigValue('headers.cs'),
  };

  const res = await fetch(getConfigValue('commerce-endpoint'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: GET_PRODUCTS_QUERY, variables: { skus: productIds } }),
  });

  if (!res.ok) {
    throw new Error('Failed to fetch products');
  }

  const json = await res.json();
  return json.data.products;
}

export { fetchProducts };
