/* eslint-disable import/no-unresolved */

import {
  InLineAlert,
  Icon,
  Button,
  provider as UI,
} from '@dropins/tools/components.js';
import { events } from '@dropins/tools/event-bus.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { render as pdpRendered } from '@dropins/storefront-pdp/render.js';

// Containers
import ProductHeader from '@dropins/storefront-pdp/containers/ProductHeader.js';
import ProductPrice from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductShortDescription from '@dropins/storefront-pdp/containers/ProductShortDescription.js';
import ProductOptions from '@dropins/storefront-pdp/containers/ProductOptions.js';
import ProductQuantity from '@dropins/storefront-pdp/containers/ProductQuantity.js';
import ProductDescription from '@dropins/storefront-pdp/containers/ProductDescription.js';
import ProductAttributes from '@dropins/storefront-pdp/containers/ProductAttributes.js';
import ProductGallery from '@dropins/storefront-pdp/containers/ProductGallery.js';

// Libs
import { fetchPlaceholders, setJsonLd } from '../../scripts/commerce.js';

// Initializers
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';
import '../../scripts/initializers/cart.js';
import { rootLink } from '../../scripts/scripts.js';

// Cart state management
import { cartStore, ACTIONS } from '../../scripts/cart-manager.js';
import { updateCartState } from '../../scripts/simple-cart-state.js';

export default async function decorate(block) {
  try {
    // eslint-disable-next-line no-underscore-dangle
    const product = events._lastEvent?.['pdp/data']?.payload ?? null;
    const labels = await fetchPlaceholders();

    // Layout
    const fragment = document.createRange().createContextualFragment(`
      <div class="product-details__wrapper">
        <div class="product-details__alert"></div>
        <div class="product-details__left-column">
          <div class="product-details__gallery"></div>
        </div>
        <div class="product-details__right-column">
          <div class="product-details__header"></div>
          <div class="product-details__price"></div>
          <div class="product-details__gallery"></div>
          <div class="product-details__short-description"></div>
          <div class="product-details__configuration">
            <div class="product-details__options"></div>
            <div class="product-details__quantity"></div>
            <div class="product-details__buttons">
              <div class="product-details__buttons__add-to-cart"></div>
              <div class="product-details__buttons__add-to-wishlist"></div>
            </div>
          </div>
          <div class="product-details__description"></div>
          <div class="product-details__attributes"></div>
        </div>
      </div>
    `);

    const $alert = fragment.querySelector('.product-details__alert');
    const $gallery = fragment.querySelector('.product-details__gallery');
    const $header = fragment.querySelector('.product-details__header');
    const $price = fragment.querySelector('.product-details__price');
    const $galleryMobile = fragment.querySelector('.product-details__right-column .product-details__gallery');
    const $shortDescription = fragment.querySelector('.product-details__short-description');
    const $options = fragment.querySelector('.product-details__options');
    const $quantity = fragment.querySelector('.product-details__quantity');
    const $addToCart = fragment.querySelector('.product-details__buttons__add-to-cart');
    const $addToWishlist = fragment.querySelector('.product-details__buttons__add-to-wishlist');
    const $description = fragment.querySelector('.product-details__description');
    const $attributes = fragment.querySelector('.product-details__attributes');

    block.appendChild(fragment);

    // Alert
    let inlineAlert = null;

    // Render Containers
    const [
      _galleryMobile,
      _gallery,
      _header,
      _price,
      _shortDescription,
      _options,
      _quantity,
      addToCart,
      addToWishlist,
      _description,
      _attributes,
    ] = await Promise.all([
    // Gallery (Mobile)
    pdpRendered.render(ProductGallery, {
      controls: 'dots',
      arrows: true,
      peak: false,
      gap: 'small',
      loop: false,
      imageParams: {
        ...IMAGES_SIZES,
      },
    })($galleryMobile),

    // Gallery (Desktop)
    pdpRendered.render(ProductGallery, {
      controls: 'thumbnailsColumn',
      arrows: true,
      peak: true,
      gap: 'small',
      loop: false,
      imageParams: {
        ...IMAGES_SIZES,
      },
    })($gallery),

    // Header
    pdpRendered.render(ProductHeader, {})($header),

    // Price
    pdpRendered.render(ProductPrice, {})($price),

    // Short Description
    pdpRendered.render(ProductShortDescription, {})($shortDescription),

    // Configuration - Swatches
    pdpRendered.render(ProductOptions, { hideSelectedValue: false })($options),

    // Configuration  Quantity
    pdpRendered.render(ProductQuantity, {})($quantity),

    // Configuration – Button - Add to Cart
    UI.render(Button, {
      children: labels.PDP?.Product?.AddToCart?.label,
      icon: Icon({ source: 'Cart' }),
      onClick: async () => {
        try {
          addToCart.setProps((prev) => ({
            ...prev,
            children: labels.Custom?.AddingToCart?.label,
            disabled: true,
          }));

          // get the current selection values
          const values = pdpApi.getProductConfigurationValues();
          const valid = pdpApi.isProductConfigurationValid();

          // add the product to the cart
          if (valid) {
            // Use HCL backend proxy instead of drop-in cart API
            console.log('[PDP] Product data available:', { 
              name: product?.name, 
              priceRange: product?.priceRange,
              price: product?.price,
              allKeys: product ? Object.keys(product) : 'no product'
            });
            
            // Log full product structure for debugging
            console.log('[PDP] Full product object:', product);
            console.log('[PDP] Product keys:', product ? Object.keys(product) : 'N/A');
            console.log('[PDP] Prices object:', product?.prices);
            console.log('[PDP] Regular price:', product?.prices?.regular);
            console.log('[PDP] Final price:', product?.prices?.final);
            
            const cartResponse = await fetch('http://localhost:3001/api/hcl/cart/add', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                partNumber: values?.sku,
                sku: values?.sku,
                quantity: values?.quantity || 1,
                name: product?.name || values?.name || 'Product',
                price: product?.priceRange?.minimum?.regularPrice || product?.price || 0,
              }),
            });

            if (!cartResponse.ok) {
              throw new Error(`Failed to add product to cart: ${cartResponse.statusText}`);
            }

            const result = await cartResponse.json();
            console.log('[PDP] Raw API response:', result);
            
            if (!result.success) {
              throw new Error(result.error || result.message || 'Failed to add product to cart');
            }

            console.log('[PDP] API success, result object:', result);
            console.log('[PDP] result.cart exists?', !!result.cart);
            console.log('[PDP] result.cart value:', result.cart);

            // Success! Show success message and update mini-cart
            inlineAlert?.remove();
            inlineAlert = await UI.render(InLineAlert, {
              heading: 'Success',
              description: `${values?.name || 'Product'} added to cart!`,
              icon: Icon({ source: 'CheckCircle' }),
              'aria-live': 'polite',
              role: 'status',
              onDismiss: () => {
                inlineAlert.remove();
              },
            })($alert);

            // Scroll alert into view
            $alert.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });

            // Update cart state to sync mini-cart
            console.log('[PDP] About to check if result.cart exists');
            if (result.cart) {
              console.log('[PDP] ✓ result.cart exists, proceeding with updates');
              console.log('[PDP] Dispatching SET_CART action with cart:', result.cart);
              cartStore.dispatch({
                type: ACTIONS.SET_CART,
                payload: result.cart,
              });
              
              // Also update simple cart state for direct updates
              console.log('[PDP] Calling updateCartState with:', result.cart);
              updateCartState(result.cart);
              console.log('[PDP] updateCartState called successfully');
              
              // Also dispatch a custom event for extra reliability
              window.dispatchEvent(new CustomEvent('hcl-cart-updated', {
                detail: { cart: result.cart }
              }));
            } else {
              console.error('[PDP] ✗ result.cart does NOT exist! Cannot update cart state');
              console.log('[PDP] Full result object:', JSON.stringify(result, null, 2));
            }

            // Also emit event for other subscribers
            events.emit('cart/update', { cart: result.cart });
            
            // Wait a moment before resetting button
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            return; // Exit early on success
          }

          // If not valid, throw error
          throw new Error('Please select all required options before adding to cart');
        } catch (error) {
          // add alert message
          inlineAlert?.remove();
          inlineAlert = await UI.render(InLineAlert, {
            heading: 'Error',
            description: error.message,
            icon: Icon({ source: 'Warning' }),
            'aria-live': 'assertive',
            role: 'alert',
            onDismiss: () => {
              inlineAlert.remove();
            },
          })($alert);

          // Scroll the alertWrapper into view
          $alert.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        } finally {
          addToCart.setProps((prev) => ({
            ...prev,
            children: labels.PDP?.Product?.AddToCart?.label,
            disabled: false,
          }));
        }
      },
    })($addToCart),

    // Configuration - Add to Wishlist
    UI.render(Button, {
      icon: Icon({ source: 'Heart' }),
      variant: 'secondary',
      'aria-label': labels.Custom?.AddToWishlist?.label,
      onClick: async () => {
        try {
          addToWishlist.setProps((prev) => ({
            ...prev,
            disabled: true,
            'aria-label': labels.Custom?.AddingToWishlist?.label,
          }));

          const values = pdpApi.getProductConfigurationValues();

          if (values?.sku) {
            const wishlist = await import('../../scripts/wishlist/api.js');
            await wishlist.addToWishlist(values.sku);
          }
        } catch (error) {
          console.error(error);
        } finally {
          addToWishlist.setProps((prev) => ({
            ...prev,
            disabled: false,
            'aria-label': labels.Custom?.AddToWishlist?.label,
          }));
        }
      },
    })($addToWishlist),

    // Description
    pdpRendered.render(ProductDescription, {})($description),

    // Attributes
    pdpRendered.render(ProductAttributes, {})($attributes),
  ]);

  // Lifecycle Events
  events.on('pdp/valid', (valid) => {
    // update add to cart button disabled state based on product selection validity
    addToCart.setProps((prev) => ({ ...prev, disabled: !valid }));
  }, { eager: true });

  // Set JSON-LD and Meta Tags
  events.on('aem/lcp', () => {
    if (product) {
      setJsonLdProduct(product);
      setMetaTags(product);
      document.title = product.name;
    }
  }, { eager: true });

  return Promise.resolve();
  } catch (error) {
    console.error('Error rendering product details:', error);
    // Show error message to user
    const $alert = block.querySelector('.product-details__alert');
    if ($alert) {
      const errorFragment = document.createRange().createContextualFragment(`
        <div class="product-details__error" style="padding: 1rem; background-color: #fff3cd; border: 1px solid #ffc107; color: #856404; border-radius: 0.25rem;">
          <p><strong>Error loading product details:</strong></p>
          <p>${error.message || 'Unable to load product information. Please try again later.'}</p>
        </div>
      `);
      $alert.appendChild(errorFragment);
    }
  }
}

async function setJsonLdProduct(product) {
  const {
    name,
    inStock,
    description,
    sku,
    urlKey,
    price,
    priceRange,
    images,
    attributes,
  } = product;
  const amount = priceRange?.minimum?.final?.amount || price?.final?.amount;
  const brand = attributes.find((attr) => attr.name === 'brand');

  // get variants
  const { data } = await pdpApi.fetchGraphQl(`
    query GET_PRODUCT_VARIANTS($sku: String!) {
      variants(sku: $sku) {
        variants {
          product {
            sku
            name
            inStock
            images(roles: ["image"]) {
              url
            }
            ...on SimpleProductView {
              price {
                final { amount { currency value } }
              }
            }
          }
        }
      }
    }
  `, {
    method: 'GET',
    variables: { sku },
  });

  const variants = data?.variants?.variants || [];

  const ldJson = {
    '@context': 'http://schema.org',
    '@type': 'Product',
    name,
    description,
    image: images[0]?.url,
    offers: [],
    productID: sku,
    brand: {
      '@type': 'Brand',
      name: brand?.value,
    },
    url: new URL(rootLink(`/products/${urlKey}/${sku}`), window.location),
    sku,
    '@id': new URL(rootLink(`/products/${urlKey}/${sku}`), window.location),
  };

  if (variants.length > 1) {
    ldJson.offers.push(...variants.map((variant) => ({
      '@type': 'Offer',
      name: variant.product.name,
      image: variant.product.images[0]?.url,
      price: variant.product.price.final.amount.value,
      priceCurrency: variant.product.price.final.amount.currency,
      availability: variant.product.inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
      sku: variant.product.sku,
    })));
  } else {
    ldJson.offers.push({
      '@type': 'Offer',
      price: amount?.value,
      priceCurrency: amount?.currency,
      availability: inStock ? 'http://schema.org/InStock' : 'http://schema.org/OutOfStock',
    });
  }

  setJsonLd(ldJson, 'product');
}

function createMetaTag(property, content, type) {
  if (!property || !type) {
    return;
  }
  let meta = document.head.querySelector(`meta[${type}="${property}"]`);
  if (meta) {
    if (!content) {
      meta.remove();
      return;
    }
    meta.setAttribute(type, property);
    meta.setAttribute('content', content);
    return;
  }
  if (!content) {
    return;
  }
  meta = document.createElement('meta');
  meta.setAttribute(type, property);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function setMetaTags(product) {
  if (!product) {
    return;
  }

  const price = product.prices.final.minimumAmount ?? product.prices.final.amount;

  createMetaTag('title', product.metaTitle || product.name, 'name');
  createMetaTag('description', product.metaDescription, 'name');
  createMetaTag('keywords', product.metaKeyword, 'name');

  createMetaTag('og:type', 'product', 'property');
  createMetaTag('og:description', product.shortDescription, 'property');
  createMetaTag('og:title', product.metaTitle || product.name, 'property');
  createMetaTag('og:url', window.location.href, 'property');
  const mainImage = product?.images?.filter((image) => image.roles.includes('thumbnail'))[0];
  const metaImage = mainImage?.url || product?.images[0]?.url;
  createMetaTag('og:image', metaImage, 'property');
  createMetaTag('og:image:secure_url', metaImage, 'property');
  createMetaTag('product:price:amount', price.value, 'property');
  createMetaTag('product:price:currency', price.currency, 'property');
}
