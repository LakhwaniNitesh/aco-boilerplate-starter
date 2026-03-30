import {
  InLineAlert,
  Icon,
  Button,
  provider as UI,
} from '@dropins/tools/components.js';
import { h } from '@dropins/tools/preact.js';
import { events } from '@dropins/tools/event-bus.js';
import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import * as pdpApi from '@dropins/storefront-pdp/api.js';
import { render as pdpRendered } from '@dropins/storefront-pdp/render.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';

import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { WishlistAlert } from '@dropins/storefront-wishlist/containers/WishlistAlert.js';

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
import {
  rootLink,
  setJsonLd,
  fetchPlaceholders,
} from '../../scripts/commerce.js';

// Initializers
import { IMAGES_SIZES } from '../../scripts/initializers/pdp.js';
import '../../scripts/initializers/cart.js';
import '../../scripts/initializers/wishlist.js';

// Function to update the Add to Cart button text
function updateAddToCartButtonText(addToCartInstance, inCart, labels) {
  const buttonText = inCart
    ? labels.Global?.UpdateProductInCart
    : labels.Global?.AddProductToCart;
  if (addToCartInstance) {
    addToCartInstance.setProps((prev) => ({
      ...prev,
      children: buttonText,
    }));
  }
}

const sku = 'HLG028_281401';

// simplest: get the product model (transformed)
const product = await pdpApi.fetchProductData(sku);

if (product) {
  console.log('name', product.name);
  console.log('sku', product.sku);
  // images is an array of image objects (check product.images[0].url)
  let imageUrl = product.images?.[0]?.url || product.image?.url || null;
  imageUrl = `https:${imageUrl}`;
  console.log('image', imageUrl);
  // price / availability
  console.log('price', product.price);
  console.log('inStock', product.inStock);
}
export default async function decorate(block) {
  const product = events.lastPayload('pdp/data') ?? null;
  // --- Force HTTPS for all product image URLs ---
  if (product?.images && Array.isArray(product.images)) {
    product.images = product.images.map((img) => {
      if (!img.url) return img;

      let cleanUrl = img.url.trim();

      // If the image URL starts with "http://", convert it to "https://"
      cleanUrl = cleanUrl.replace(/^http:\/\//i, 'https://');

      // (Optional) also fix any accidental double slashes
      cleanUrl = cleanUrl.replace(/([^:])\/{2,}/g, '$1/');
      cleanUrl = `https:${cleanUrl}`;

      return { ...img, url: cleanUrl };
    });
  }
  // console.log("new",product);
  //   console.log(product?.name);
  const labels = await fetchPlaceholders();

  // Read itemUid from URL
  const urlParams = new URLSearchParams(window.location.search);
  const itemUidFromUrl = urlParams.get('itemUid');

  // State to track if we are in update mode
  let isUpdateMode = false;

  // Layout
  const fragment = document.createRange().createContextualFragment(`
    <div class="product-details__alert"></div>
    <div class="product-details__wrapper">
      <div class="product-details__left-column">
        <div class="product-details__gallery"></div>
      </div>
      <div class="product-details__right-column">
        <div class="product-details__header"></div>
        <div class="product-details__price"></div>  
        <div class="product-details__brand"></div> <!-- added code -->
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
  const $brand = fragment.querySelector('.product-details__brand'); // added code
  const $galleryMobile = fragment.querySelector(
    '.product-details__right-column .product-details__gallery',
  );
  const $shortDescription = fragment.querySelector(
    '.product-details__short-description',
  );
  const $options = fragment.querySelector('.product-details__options');
  const $quantity = fragment.querySelector('.product-details__quantity');
  const $addToCart = fragment.querySelector(
    '.product-details__buttons__add-to-cart',
  );
  const $wishlistToggleBtn = fragment.querySelector(
    '.product-details__buttons__add-to-wishlist',
  );
  const $description = fragment.querySelector('.product-details__description');
  const $attributes = fragment.querySelector('.product-details__attributes');

  block.replaceChildren(fragment);

  const gallerySlots = {
    CarouselThumbnail: (ctx) => {
      tryRenderAemAssetsImage(ctx, {
        ...imageSlotConfig(ctx),
        wrapper: document.createElement('span'),
      });
    },

    CarouselMainImage: (ctx) => {
      tryRenderAemAssetsImage(ctx, {
        ...imageSlotConfig(ctx),
      });
    },
  };

  // console.log('Product attributes:', product?.attributes);

  // console.log('Product attributes:', product?.attributes);

  // Alert
  let inlineAlert = null;
  const routeToWishlist = '/wishlist';

  const [
    _galleryMobile,
    _gallery,
    _header,
    _price,
    _shortDescription,
    _options,
    _quantity,
    _description,
    _attributes,
    wishlistToggleBtn,
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

      slots: gallerySlots,
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

      slots: gallerySlots,
    })($gallery),

    // Header
    pdpRendered.render(ProductHeader, {})($header),

    // Price
    pdpRendered.render(ProductPrice, {})($price),

    // Brand added code
    (async () => {
      const brandAttr = product?.attributes?.find(
        (attr) => attr.id === 'brand',
      );
      if (brandAttr?.value) {
        const brandDiv = document.createElement('div');
        brandDiv.className = 'product-brand';
        brandDiv.textContent = `Brand: ${brandAttr.value}`;
        $brand.appendChild(brandDiv);
      }
    })(),

    // Short Description
    pdpRendered.render(ProductShortDescription, {})($shortDescription),

    // Configuration - Swatches
    pdpRendered.render(ProductOptions, {
      hideSelectedValue: false,
      slots: {
        SwatchImage: (ctx) => {
          tryRenderAemAssetsImage(ctx, {
            ...imageSlotConfig(ctx),
            wrapper: document.createElement('span'),
          });
        },
      },
    })($options),

    // Configuration  Quantity
    pdpRendered.render(ProductQuantity, {})($quantity),

    // Description
    pdpRendered.render(ProductDescription, {})($description),

    // Attributes
    pdpRendered.render(ProductAttributes, {})($attributes),

    // Wishlist button - WishlistToggle Container
    wishlistRender.render(WishlistToggle, {
      product,
    })($wishlistToggleBtn),
  ]);
  // console.log("hi",product?.name);
  // Configuration – Button - Add to Cart
  const addToCart = await UI.render(Button, {
    children: labels.Global?.AddProductToCart,
    icon: h(Icon, { source: 'Cart' }),
    onClick: async () => {
      const buttonActionText = isUpdateMode
        ? labels.Global?.UpdatingInCart
        : labels.Global?.AddingToCart;
      try {
        addToCart.setProps((prev) => ({
          ...prev,
          children: buttonActionText,
          disabled: true,
        }));

        // get the current selection values
        const values = pdpApi.getProductConfigurationValues();
        const valid = pdpApi.isProductConfigurationValid();

        // add or update the product in the cart
        if (valid) {
          if (isUpdateMode) {
            // --- Update existing item ---
            // const { updateProductsFromCart } = await import("../../scripts/salesforce/api.js"
            //   //'@dropins/storefront-cart/test.js'
            // );

            // await updateProductsFromCart([{ ...values, uid: itemUidFromUrl }]);
            // --- Update existing item ---
            const { updateCartQuantity } = await import('../../scripts/salesforce/api.js');
            await updateCartQuantity(values.sku, values.quantity);

            // --- START REDIRECT ON UPDATE ---
            const updatedSku = values?.sku;
            if (updatedSku) {
              const cartRedirectUrl = new URL(
                rootLink('/cart'),
                window.location.origin,
              );
              cartRedirectUrl.searchParams.set('itemUid', itemUidFromUrl);
              window.location.href = cartRedirectUrl.toString();
            } else {
              // Fallback if SKU is somehow missing (shouldn't happen in normal flow)
              console.warn(
                'Could not retrieve SKU for updated item. Redirecting to cart without parameter.',
              );
              window.location.href = rootLink('/cart');
            }
            return;
          }
          // --- Add new item ---
          // const { addProductsToCart} = await import(
          //   //"../../scripts/salesforce/api.js"
          //   '@dropins/storefront-cart/test.js'
          // );
          // await addProductsToCart([{ ...values}]);

          // --- Add new item ---
          const { addToCart: addToCartSalesforce } = await import('../../scripts/salesforce/api.js');
          await addToCartSalesforce(values.sku, values.quantity);
        }

        // reset any previous alerts if successful
        inlineAlert?.remove();
      } catch (error) {
        // add alert message
        inlineAlert = await UI.render(InLineAlert, {
          heading: 'Error',
          description: error.message,
          icon: h(Icon, { source: 'Warning' }),
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
        // Reset button text using the helper function which respects the current mode
        updateAddToCartButtonText(addToCart, isUpdateMode, labels);
        // Re-enable button
        addToCart.setProps((prev) => ({
          ...prev,
          disabled: false,
        }));
      }
    },
  })($addToCart);
  // console.log("hello",product);
  // Lifecycle Events
  events.on(
    'pdp/valid',
    (valid) => {
      // update add to cart button disabled state based on product selection validity
      addToCart.setProps((prev) => ({ ...prev, disabled: !valid }));
    },
    { eager: true },
  );

  // Handle option changes
  events.on(
    'pdp/values',
    () => {
      if (wishlistToggleBtn) {
        const configValues = pdpApi.getProductConfigurationValues();

        // Check URL parameter for empty optionsUIDs
        const urlOptionsUIDs = urlParams.get('optionsUIDs');

        // If URL has empty optionsUIDs parameter, treat as base product (no options)
        const optionUIDs = urlOptionsUIDs === ''
          ? undefined
          : configValues?.optionsUIDs || undefined;

        wishlistToggleBtn.setProps((prev) => ({
          ...prev,
          product: {
            ...product,
            optionUIDs,
          },
        }));
      }
    },
    { eager: true },
  );

  events.on('wishlist/alert', ({ action, item }) => {
    wishlistRender.render(WishlistAlert, {
      action,
      item,
      routeToWishlist,
    })($alert);

    setTimeout(() => {
      $alert.innerHTML = '';
    }, 5000);

    setTimeout(() => {
      $alert.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }, 0);
  });

  // --- Add new event listener for cart/data ---
  events.on(
    'cart/data',
    (cartData) => {
      let itemIsInCart = false;
      if (itemUidFromUrl && cartData?.items) {
        itemIsInCart = cartData.items.some(
          (item) => item.uid === itemUidFromUrl,
        );
      }
      // Set the update mode state
      isUpdateMode = itemIsInCart;

      // Update button text based on whether the item is in the cart
      updateAddToCartButtonText(addToCart, itemIsInCart, labels);
    },
    { eager: true },
  );

  // Set JSON-LD and Meta Tags
  events.on(
    'aem/lcp',
    () => {
      if (product) {
        setJsonLdProduct(product);
        setMetaTags(product);
        document.title = product.name;
      }
    },
    { eager: true },
  );

  return Promise.resolve();
}

// Fetch product details by part number (SKU) via storefront GraphQL
async function fetchProductDetailsByPartNumber(partNumber) {
  if (!partNumber) return null;

  // sanitize input
  const sku = String(partNumber).trim();

  const query = `
    query GetProductBySku($sku: String!) {
      products(filter: { sku: { eq: $sku } }) {
        items {
          sku
          name
          url_key
          meta_title
          short_description
          description
          image { url }
          media_gallery { url }
          price_range {
            minimum_price {
              regular_price { value currency }
              final_price { value currency }
            }
          }
          stock_status: stock_status
          attributes {
            attribute_code
            value
            label
          }
        }
      }
    }
  `;

  try {
    const { data } = await pdpApi.fetchGraphQl(query, {
      variables: { sku },
      method: 'GET', // adjust if your helper needs POST
    });

    const item = data?.products?.items?.[0];
    if (!item) return null;

    // Prefer the explicit image fields, then fallback to media_gallery
    const mainImage = item.image?.url || item.media_gallery?.[0]?.url || '';

    const priceObj = item.price_range?.minimum_price?.final_price
      ?? item.price_range?.minimum_price?.regular_price
      ?? null;

    return {
      sku: item.sku,
      name: item.name,
      urlKey: item.url_key,
      metaTitle: item.meta_title,
      shortDescription: item.short_description,
      description: item.description,
      image: mainImage,
      price: priceObj
        ? { value: priceObj.value, currency: priceObj.currency }
        : null,
      inStock: item.stock_status ? item.stock_status === 'IN_STOCK' : undefined,
      attributes: item.attributes || [],
      raw: item, // keep raw payload for additional fields if needed
    };
  } catch (err) {
    // centralize logging/warn and return null to the caller
    console.warn(`Product lookup failed for ${partNumber}:`, err);
    return null;
  }
}

const productInfo = await fetchProductDetailsByPartNumber('CLA022_220601');
if (productInfo) {
  console.log('productInfo', productInfo);
  // populate UI, set meta tags, etc.
}
// async function fetchProductDetails(partNumber) {
//     const query = `
//       query GetProduct($sku: String!) {
//         products(filter: { sku: { eq: $sku } }) {
//           items {
//             sku
//             name
//             image {
//               url
//             }
//             media_gallery {
//               url
//             }
//           }
//         }
//       }
//     `;
//     try {
//       const { data } = await pdpApi.fetchGraphQl(query, {
//         variables: { sku: partNumber },
//       });

//       const product = data?.products?.items?.[0];
//       if (!product) return null;

//       return {
//         name: product.name,
//         image: product.image?.url || product.media_gallery?.[0]?.url || "",
//       };
//     } catch (err) {
//       console.warn(`❌ Product lookup failed for ${partNumber}:`, err);
//       return null;
//     }
//   }  (async () => {
//   const result = await fetchProductDetails(CLA022_220601);
//   console.log('Fetched Product Details →', result);
// })();

//   const productData = await fetchProductDetails('CLA022_220601');
//   console.log("helllllllo",productData );

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
  const { data } = await pdpApi.fetchGraphQl(
    `
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
  `,
    {
      method: 'GET',
      variables: { sku },
    },
  );

  console.log('he;llokds vd', data);
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
    ldJson.offers.push(
      ...variants.map((variant) => ({
        '@type': 'Offer',
        name: variant.product.name,
        image: variant.product.images[0]?.url,
        price: variant.product.price.final.amount.value,
        priceCurrency: variant.product.price.final.amount.currency,
        availability: variant.product.inStock
          ? 'http://schema.org/InStock'
          : 'http://schema.org/OutOfStock',
        sku: variant.product.sku,
      })),
    );
  } else {
    ldJson.offers.push({
      '@type': 'Offer',
      price: amount?.value,
      priceCurrency: amount?.currency,
      availability: inStock
        ? 'http://schema.org/InStock'
        : 'http://schema.org/OutOfStock',
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

/**
 * Returns the configuration for an image slot.
 * @param ctx - The context of the slot.
 * @returns The configuration for the image slot.
 */
function imageSlotConfig(ctx) {
  const { data, defaultImageProps } = ctx;
  return {
    alias: data.sku,
    imageProps: defaultImageProps,

    params: {
      width: defaultImageProps.width,
      height: defaultImageProps.height,
    },
  };
}
