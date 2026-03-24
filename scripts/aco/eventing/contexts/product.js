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

function getProductContext(product) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  console.log("hello",product);
  return {
    productId: 1,
    name: product.name,
    sku: product.sku,
    topLevelSku: product.sku,
    productType: 'simple',
    mainImageUrl: product.images.url,
    canonicalUrl: `${origin}/p/${product.sku}`,
    pricing: {
      regularPrice: product.price?.regular?.amount?.value ?? 0,
      minimalPrice: product.price?.final?.amount?.value ?? 0,
      maximalPrice: product.price?.final?.amount?.value ?? 0,
      currencyCode: product.price?.final?.amount?.currency ?? null,
    },
  };
}

export { getProductContext };
