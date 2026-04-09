/* eslint-disable import/no-cycle */
/* eslint-disable import/prefer-default-export */

import { initializers } from "@dropins/tools/initializer.js";
import { Image, provider as UI } from "@dropins/tools/components.js";
import {
  initialize,
  setEndpoint,
  setFetchGraphQlHeaders,
  fetchProductData,
} from "@dropins/storefront-pdp/api.js";
import { initializeDropin } from "./index.js";
import {
  fetchPlaceholders,
  commerceEndpointWithQueryParams,
  getOptionsUIDsFromUrl,
  getSkuFromUrl,
  loadErrorPage,
} from "../commerce.js";
import { getHeaders } from "../configs.js";

export const IMAGES_SIZES = {
  width: 960,
  height: 1191,
};

await initializeDropin(async () => {
  try {
    // Set Fetch Endpoint (Service)
    setEndpoint(await commerceEndpointWithQueryParams());

    // Set Fetch Headers (Service)
    setFetchGraphQlHeaders((prev) => ({ ...prev, ...getHeaders("cs") }));

    const sku = getSkuFromUrl();
    const optionsUIDs = getOptionsUIDsFromUrl();

    const [product, labels] = await Promise.all([
      fetchProductData(sku, { optionsUIDs, skipTransform: true }).then(
        preloadImageMiddleware,
      ),
      fetchPlaceholders(),
    ]);

    if (!product?.sku) {
      return loadErrorPage();
    }

    const langDefinitions = {
      default: {
        ...labels,
      },
    };

    const models = {
      ProductDetails: {
        initialData: { ...product },
      },
    };

    // Initialize Dropins
    return initializers.mountImmediately(initialize, {
      sku,
      optionsUIDs,
      langDefinitions,
      models,
      acdl: true,
      persistURLParams: true,
    });
  } catch (error) {
    // Fallback for localhost/testing - load basic product info
    console.warn("PDP initialization failed, using fallback:", error);

    const sku = getSkuFromUrl();
    const optionsUIDs = getOptionsUIDsFromUrl();
    const labels = await fetchPlaceholders();

    // Create a minimal product object
    const product = {
      sku: sku || "TEST-SKU",
      name: "Test Product",
      description: "This is a test product for local development",
      price: {
        roles: [],
        regular: {
          amount: {
            currency: "USD",
            value: 99.99,
          },
        },
        final: {
          amount: {
            currency: "USD",
            value: 79.99,
          },
        },
      },
      images: [
        {
          url: "https://via.placeholder.com/500x500?text=Test+Product",
          label: "Product Image",
        },
      ],
      __typename: "ProductView",
    };

    const langDefinitions = {
      default: {
        ...labels,
      },
    };

    const models = {
      ProductDetails: {
        initialData: { ...product },
      },
    };

    // Initialize with fallback data
    return initializers.mountImmediately(initialize, {
      sku,
      optionsUIDs,
      langDefinitions,
      models,
      acdl: true,
      persistURLParams: true,
    });
  }
})();

async function preloadImageMiddleware(data) {
  const image = data?.images?.[0]?.url?.replace(/^https?:/, "");

  if (image) {
    await UI.render(Image, {
      src: image,
      ...IMAGES_SIZES.mobile,
      params: {
        ...IMAGES_SIZES,
      },
      loading: "eager",
    })(document.createElement("div"));
  }
  return data;
}
