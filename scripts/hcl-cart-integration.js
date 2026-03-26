/**
 * HCL Commerce Integration for Cart Page
 * Displays HCL Commerce cart items and manages cart operations
 */

import HclSession from './hcl-commerce-api.js';

/**
 * Update cart display with HCL data
 * Fetches current cart from HCL and renders items
 */
export async function updateHclCartDisplay(block) {
  try {
    const session = new HclSession();
    
    // Ensure valid session
    if (!session.isValid()) {
      await session.createSession();
    }

    // Get cart from HCL
    const hclCart = await session.getCart();
    
    if (!hclCart || !hclCart.items || hclCart.items.length === 0) {
      showEmptyCart(block);
      return;
    }

    // Render cart items
    renderCartItems(block, hclCart);
    renderCartSummary(block, hclCart);
  } catch (error) {
    console.error('[HCL Cart] Error updating cart display:', error);
    showErrorMessage(block, 'Failed to load cart');
  }
}

/**
 * Render cart items in the page
 */
function renderCartItems(block, hclCart) {
  const itemsContainer = block.querySelector('.cart__items') || createItemsContainer(block);
  itemsContainer.innerHTML = '';

  hclCart.items.forEach((item) => {
    const itemElement = createCartItemElement(item);
    itemsContainer.appendChild(itemElement);
  });
}

/**
 * Create a single cart item element
 */
function createCartItemElement(item) {
  const div = document.createElement('div');
  div.className = 'cart-item';
  div.innerHTML = `
    <div class="cart-item__product">
      <img src="${item.image || ''}" alt="${item.name}" class="cart-item__image">
      <div class="cart-item__info">
        <h3 class="cart-item__name">${item.name}</h3>
        <p class="cart-item__sku">SKU: ${item.sku}</p>
        <p class="cart-item__price">$${(item.price || 0).toFixed(2)}</p>
      </div>
    </div>
    <div class="cart-item__quantity">
      <label>Qty:</label>
      <input type="number" value="${item.quantity}" min="1" class="cart-item__qty-input" data-item-id="${item.id}">
    </div>
    <div class="cart-item__total">
      <p>$${((item.price || 0) * item.quantity).toFixed(2)}</p>
    </div>
    <button class="cart-item__remove" data-item-id="${item.id}">Remove</button>
  `;

  // Add event listeners
  const qtyInput = div.querySelector('.cart-item__qty-input');
  const removeBtn = div.querySelector('.cart-item__remove');

  qtyInput.addEventListener('change', async (e) => {
    await updateItemQuantity(item.id, parseInt(e.target.value, 10));
  });

  removeBtn.addEventListener('click', async () => {
    await removeCartItem(item.id);
  });

  return div;
}

/**
 * Render cart summary (totals)
 */
function renderCartSummary(block, hclCart) {
  const summaryContainer = block.querySelector('.cart__summary') || createSummaryContainer(block);
  
  const subtotal = (hclCart.subtotal || 0).toFixed(2);
  const tax = (hclCart.tax || 0).toFixed(2);
  const shipping = (hclCart.shipping || 0).toFixed(2);
  const total = (hclCart.total || 0).toFixed(2);

  summaryContainer.innerHTML = `
    <div class="cart-summary">
      <div class="cart-summary__row">
        <span>Subtotal:</span>
        <span>$${subtotal}</span>
      </div>
      <div class="cart-summary__row">
        <span>Shipping:</span>
        <span>$${shipping}</span>
      </div>
      <div class="cart-summary__row">
        <span>Tax:</span>
        <span>$${tax}</span>
      </div>
      <div class="cart-summary__row cart-summary__total">
        <span><strong>Total:</strong></span>
        <span><strong>$${total}</strong></span>
      </div>
      <button class="cart-summary__checkout-btn">Proceed to Checkout</button>
    </div>
  `;

  // Add checkout button event listener
  const checkoutBtn = summaryContainer.querySelector('.cart-summary__checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      // Redirect to checkout
      window.location.href = '/checkout';
    });
  }
}

/**
 * Update item quantity
 */
async function updateItemQuantity(itemId, quantity) {
  try {
    const session = new HclSession();
    if (!session.isValid()) {
      await session.createSession();
    }

    console.log(`[HCL Cart] Updating item ${itemId} to quantity ${quantity}`);
    
    await session.updateHclOrderItem(itemId, quantity);
    
    // Refresh display
    const block = document.querySelector('[class*="commerce-cart"]');
    if (block) {
      await updateHclCartDisplay(block);
    }

    // Emit event for mini-cart to update
    window.dispatchEvent(new CustomEvent('hcl:cartUpdated'));
  } catch (error) {
    console.error('[HCL Cart] Error updating quantity:', error);
    showErrorMessage(null, 'Failed to update quantity');
  }
}

/**
 * Remove item from cart
 */
async function removeCartItem(itemId) {
  try {
    const session = new HclSession();
    if (!session.isValid()) {
      await session.createSession();
    }

    console.log(`[HCL Cart] Removing item ${itemId}`);
    
    await session.removeFromCart(itemId);
    
    // Refresh display
    const block = document.querySelector('[class*="commerce-cart"]');
    if (block) {
      await updateHclCartDisplay(block);
    }

    // Emit event for mini-cart to update
    window.dispatchEvent(new CustomEvent('hcl:itemRemoved', {
      detail: { itemId }
    }));
  } catch (error) {
    console.error('[HCL Cart] Error removing item:', error);
    showErrorMessage(null, 'Failed to remove item');
  }
}

/**
 * Show empty cart message
 */
function showEmptyCart(block) {
  const emptyContainer = block.querySelector('.cart__empty-cart') || createEmptyContainer(block);
  emptyContainer.innerHTML = `
    <div class="cart-empty">
      <p>Your cart is empty</p>
      <a href="/" class="cart-empty__link">Continue Shopping</a>
    </div>
  `;
  
  // Hide items and summary
  const itemsContainer = block.querySelector('.cart__items');
  const summaryContainer = block.querySelector('.cart__summary');
  if (itemsContainer) itemsContainer.style.display = 'none';
  if (summaryContainer) summaryContainer.style.display = 'none';
}

/**
 * Show error message
 */
function showErrorMessage(block, message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'hcl-cart-error';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    background-color: #f44336;
    color: white;
    padding: 12px 16px;
    border-radius: 4px;
    margin-bottom: 16px;
  `;

  if (block) {
    block.insertBefore(errorDiv, block.firstChild);
  } else {
    document.body.insertBefore(errorDiv, document.body.firstChild);
  }

  setTimeout(() => errorDiv.remove(), 5000);
}

/**
 * Create container for cart items
 */
function createItemsContainer(block) {
  const container = document.createElement('div');
  container.className = 'cart__items';
  block.appendChild(container);
  return container;
}

/**
 * Create container for cart summary
 */
function createSummaryContainer(block) {
  const container = document.createElement('div');
  container.className = 'cart__summary';
  block.appendChild(container);
  return container;
}

/**
 * Create empty cart container
 */
function createEmptyContainer(block) {
  const container = document.createElement('div');
  container.className = 'cart__empty-cart';
  block.appendChild(container);
  return container;
}

/**
 * Inject CSS styles for cart
 */
export function injectHclCartStyles() {
  const styleId = 'hcl-cart-styles';
  
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .cart-item {
      display: grid;
      grid-template-columns: 1fr auto auto auto;
      gap: 16px;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #eee;
    }

    .cart-item__product {
      display: flex;
      gap: 12px;
    }

    .cart-item__image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
    }

    .cart-item__info {
      flex: 1;
    }

    .cart-item__name {
      margin: 0 0 8px;
      font-size: 16px;
      font-weight: 500;
    }

    .cart-item__sku {
      margin: 0 0 4px;
      font-size: 12px;
      color: #666;
    }

    .cart-item__price {
      margin: 0;
      font-weight: 600;
    }

    .cart-item__quantity {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cart-item__qty-input {
      width: 60px;
      padding: 6px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .cart-item__total {
      text-align: right;
      font-weight: 600;
      min-width: 80px;
    }

    .cart-item__remove {
      padding: 8px 12px;
      background-color: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    .cart-item__remove:hover {
      background-color: #da192c;
    }

    .cart-summary {
      padding: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      max-width: 400px;
    }

    .cart-summary__row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .cart-summary__total {
      border-top: 2px solid #ddd;
      padding-top: 12px;
      font-size: 16px;
    }

    .cart-summary__checkout-btn {
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      background-color: #4caf50;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    .cart-summary__checkout-btn:hover {
      background-color: #45a049;
    }

    .cart-empty {
      text-align: center;
      padding: 40px 20px;
    }

    .cart-empty__link {
      display: inline-block;
      margin-top: 16px;
      padding: 12px 24px;
      background-color: #4caf50;
      color: white;
      text-decoration: none;
      border-radius: 4px;
    }

    .cart-empty__link:hover {
      background-color: #45a049;
    }

    @media (max-width: 768px) {
      .cart-item {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}

/**
 * Initialize HCL cart integration
 */
export async function initializeHclCart(block) {
  try {
    console.log('[HCL Cart] Initializing HCL cart integration...');

    // Inject styles
    injectHclCartStyles();

    // Load and display cart
    await updateHclCartDisplay(block);

    // Listen for cart updates from other components
    window.addEventListener('hcl:cartUpdated', async () => {
      await updateHclCartDisplay(block);
    });

    console.log('[HCL Cart] Initialization complete');
  } catch (error) {
    console.error('[HCL Cart] Initialization error:', error);
  }
}

export default {
  initializeHclCart,
  updateHclCartDisplay,
  injectHclCartStyles,
};
