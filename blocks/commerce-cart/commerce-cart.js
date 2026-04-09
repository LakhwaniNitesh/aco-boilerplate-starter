import { events } from "@dropins/tools/event-bus.js";
import { render as provider } from "@dropins/storefront-cart/render.js";
import * as Cart from "@dropins/storefront-cart/api.js";

// Dropin Containers
import CartSummaryList from "@dropins/storefront-cart/containers/CartSummaryList.js";
import OrderSummary from "@dropins/storefront-cart/containers/OrderSummary.js";
import EstimateShipping from "@dropins/storefront-cart/containers/EstimateShipping.js";
import EmptyCart from "@dropins/storefront-cart/containers/EmptyCart.js";
import Coupons from "@dropins/storefront-cart/containers/Coupons.js";
import GiftCards from "@dropins/storefront-cart/containers/GiftCards.js";
import GiftOptions from "@dropins/storefront-cart/containers/GiftOptions.js";

// API
import { publishShoppingCartViewEvent } from "@dropins/storefront-cart/api.js";

// Initializers
import "../../scripts/initializers/cart.js";

import { readBlockConfig } from "../../scripts/aem.js";
import { rootLink } from "../../scripts/scripts.js";

// Import our cart system
import {
  getCartState,
  fetchCartFromHCL,
} from "../../scripts/simple-cart-state.js";

export default async function decorate(block) {
  // Configuration
  const {
    "hide-heading": hideHeading = "false",
    "max-items": maxItems,
    "hide-attributes": hideAttributes = "",
    "enable-item-quantity-update": enableUpdateItemQuantity = "false",
    "enable-item-remove": enableRemoveItem = "true",
    "enable-estimate-shipping": enableEstimateShipping = "false",
    "start-shopping-url": startShoppingURL = "",
    "checkout-url": checkoutURL = "",
  } = readBlockConfig(block);

  // Token retrieval functions (scoped to block but accessible in all handlers)
  const getAccessToken = () => {
    try {
      const authData = sessionStorage.getItem("hcl_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.token) {
            console.log("[CART] Found token in hcl_auth");
            return parsed.token;
          }
        } catch (e) {
          console.warn("[CART] Could not parse hcl_auth:", e);
        }
      }
      return (
        sessionStorage.getItem("hcl-access-token") ||
        localStorage.getItem("hcl-access-token")
      );
    } catch (e) {
      return null;
    }
  };

  const getTrustedToken = () => {
    try {
      const authData = sessionStorage.getItem("hcl_auth");
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.trustedToken) {
            console.log("[CART] Found trustedToken in hcl_auth");
            return parsed.trustedToken;
          }
        } catch (e) {
          console.warn("[CART] Could not parse hcl_auth:", e);
        }
      }
      return (
        sessionStorage.getItem("hcl-trusted-token") ||
        localStorage.getItem("hcl-trusted-token")
      );
    } catch (e) {
      return null;
    }
  };

  // Fetch cart from HCL Commerce
  let hclCart = { cartId: null, items: [], total: 0 };

  try {
    const token = getAccessToken();
    const trustedToken = getTrustedToken();

    if (token && trustedToken) {
      console.log("[CART] Syncing cart from HCL with both tokens...");
      hclCart = await fetchCartFromHCL(token, trustedToken);
    } else {
      console.warn("[CART] Missing authentication tokens, cart will be empty");
      if (!token) console.log("[CART]   - No accessToken found");
      if (!trustedToken) console.log("[CART]   - No trustedToken found");
    }
  } catch (error) {
    console.error("[CART] Failed to fetch cart from HCL:", error.message);
    hclCart = getCartState();
  }

  console.log("[CART] Loading cart page with HCL cart:", hclCart);

  const isEmptyCart = !hclCart || !hclCart.items || hclCart.items.length === 0;

  // Layout
  const fragment = document.createRange().createContextualFragment(`
    <div class="cart__wrapper">
      <div class="cart__left-column">
        <div class="cart__list"></div>
      </div>
      <div class="cart__right-column">
        <div class="cart__order-summary"></div>
        <div class="cart__gift-options"></div>
      </div>
    </div>

    <div class="cart__empty-cart"></div>
  `);

  const $wrapper = fragment.querySelector(".cart__wrapper");
  const $list = fragment.querySelector(".cart__list");
  const $summary = fragment.querySelector(".cart__order-summary");
  const $emptyCart = fragment.querySelector(".cart__empty-cart");
  const $giftOptions = fragment.querySelector(".cart__gift-options");

  block.innerHTML = "";
  block.appendChild(fragment);

  // Toggle Empty Cart
  function toggleEmptyCart(state) {
    if (state) {
      $wrapper.setAttribute("hidden", "");
      $emptyCart.removeAttribute("hidden");
    } else {
      $wrapper.removeAttribute("hidden");
      $emptyCart.setAttribute("hidden", "");
    }
  }

  toggleEmptyCart(isEmptyCart);

  // If cart is not empty, render custom cart display
  if (!isEmptyCart) {
    renderHCLCart(
      block,
      hclCart,
      {
        startShoppingURL,
        checkoutURL,
        hideHeading,
      },
      getAccessToken,
      getTrustedToken,
      hclCart,
    );
  }
}

/**
 * Render custom HCL cart display
 */
function renderHCLCart(
  block,
  cart,
  options,
  getAccessToken,
  getTrustedToken,
  hclCartRef,
) {
  const { hideHeading, startShoppingURL, checkoutURL } = options;

  // Find the list and summary containers
  const $list = block.querySelector(".cart__list");
  const $summary = block.querySelector(".cart__order-summary");

  if (!$list || !$summary) {
    console.warn("[CART] Cart containers not found");
    return;
  }

  // Render cart items
  const itemsHTML = cart.items
    .map(
      (item) => `
      <div class="cart-item" data-sku="${item.sku}" data-order-item-id="${item.orderItemId}">
        <div class="cart-item__content">
          <div class="cart-item__name">${item.name}</div>
          <div class="cart-item__details">
            <span class="cart-item__quantity">Qty: ${item.quantity}</span>
            <span class="cart-item__price">$${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        </div>
        <button class="cart-item__remove" data-order-item-id="${item.orderItemId}" title="Remove item">×</button>
      </div>
    `,
    )
    .join("");

  // Render order summary
  const summaryHTML = `
    <div class="order-summary">
      <div class="order-summary__row">
        <span>Subtotal:</span>
        <span>$${cart.total.toFixed(2)}</span>
      </div>
      <div class="order-summary__row">
        <span>Shipping:</span>
        <span>$0.00</span>
      </div>
      <div class="order-summary__row order-summary__total">
        <span>Total:</span>
        <span>$${cart.total.toFixed(2)}</span>
      </div>
      ${
        checkoutURL
          ? `<a href="${checkoutURL}" class="button button-primary">Proceed to Checkout</a>`
          : ""
      }
    </div>
  `;

  $list.innerHTML = itemsHTML;
  $summary.innerHTML = summaryHTML;

  // Add remove button click handlers
  const removeButtons = $list.querySelectorAll(".cart-item__remove");
  removeButtons.forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const orderItemId = btn.dataset.orderItemId;
      const cartItem = btn.closest(".cart-item");

      console.log("[CART] Remove button clicked");
      console.log("[CART] Dataset:", btn.dataset);
      console.log("[CART] orderItemId:", orderItemId);

      if (!orderItemId) {
        console.error("[CART] No orderItemId found for item");
        alert("Cannot remove item: missing item ID");
        return;
      }

      try {
        console.log("[CART] Removing item:", orderItemId);
        const token = getAccessToken();
        const trustedToken = getTrustedToken();

        console.log("[CART] Token available?", !!token);
        console.log("[CART] TrustedToken available?", !!trustedToken);

        if (!token || !trustedToken) {
          console.error("[CART] Missing tokens, cannot remove item");
          alert("Missing authentication tokens");
          return;
        }
        // Get cart ID
        const cartId = hclCartRef?.cartId;
        console.log("[CART] Cart ID:", cartId);

        const requestBody = {
          orderItemId,
          cartId,
          accessToken: token,
          trustedToken,
        };

        console.log("[CART] Sending remove request:", requestBody);

        const response = await fetch(`/api/hcl/cart/remove`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        console.log("[CART] Remove response:", result);

        if (!response.ok) {
          console.error("[CART] Remove failed:", result);
          throw new Error(result.error || `HTTP ${response.status}`);
        }

        if (result.success && result.cart) {
          console.log("[CART] Item removed successfully");
          // Update the hclCart reference with new data
          hclCartRef.cartId = result.cart.cartId;
          hclCartRef.items = result.cart.items;
          hclCartRef.total = result.cart.total;
          renderHCLCart(
            block,
            result.cart,
            {
              startShoppingURL,
              checkoutURL,
              hideHeading,
            },
            getAccessToken,
            getTrustedToken,
            hclCartRef,
          );
        }
      } catch (error) {
        console.error("[CART] Error removing item:", error);
        alert("Failed to remove item from cart: " + error.message);
      }
    });
  });

  console.log("[CART] Rendered HCL cart with", cart.items.length, "items");
}
