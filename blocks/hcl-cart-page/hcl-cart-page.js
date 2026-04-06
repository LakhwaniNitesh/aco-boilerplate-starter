import { readBlockConfig } from '../../scripts/aem.js';

/**
 * HCL Cart Page Block
 * Full-page cart display with item management and checkout
 */

async function renderCartItems(container, cart) {
  const itemsContainer = document.createElement('div');
  itemsContainer.className = 'hcl-cart-items-container';

  if (!cart.items || cart.items.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.className = 'hcl-cart-empty-state';
    emptyState.innerHTML = `
      <div class="hcl-cart-empty-icon">🛒</div>
      <h2>Your cart is empty</h2>
      <p>Continue shopping to add items to your cart</p>
      <a href="/products" class="hcl-cart-continue-shopping">Continue Shopping</a>
    `;
    container.appendChild(emptyState);
    return;
  }

  // Items table header
  const table = document.createElement('table');
  table.className = 'hcl-cart-items-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th class="col-product">Product</th>
        <th class="col-price">Price</th>
        <th class="col-quantity">Quantity</th>
        <th class="col-subtotal">Subtotal</th>
        <th class="col-actions">Actions</th>
      </tr>
    </thead>
    <tbody id="cart-items-body"></tbody>
  `;
  itemsContainer.appendChild(table);

  // Add items to table
  const tbody = table.querySelector('tbody');
  cart.items.forEach((item, index) => {
    const row = document.createElement('tr');
    row.className = 'hcl-cart-item-row';
    row.dataset.itemId = item.id;

    const itemPrice = parseFloat(item.price) || 0;
    const itemQty = parseInt(item.qty, 10) || 1;
    const itemSubtotal = (itemPrice * itemQty).toFixed(2);

    row.innerHTML = `
      <td class="col-product">
        <div class="hcl-cart-item-info">
          <div class="hcl-cart-item-name">${item.name || 'Unknown Product'}</div>
          <div class="hcl-cart-item-sku">SKU: ${item.sku || 'N/A'}</div>
        </div>
      </td>
      <td class="col-price">$${itemPrice.toFixed(2)}</td>
      <td class="col-quantity">
        <div class="hcl-cart-quantity-control">
          <button class="qty-decrease" aria-label="Decrease quantity">-</button>
          <input 
            type="number" 
            class="qty-input" 
            value="${itemQty}" 
            min="1" 
            max="999" 
            aria-label="Item quantity"
          />
          <button class="qty-increase" aria-label="Increase quantity">+</button>
        </div>
      </td>
      <td class="col-subtotal">$${itemSubtotal}</td>
      <td class="col-actions">
        <button class="hcl-cart-remove-btn" aria-label="Remove item">
          <span>Remove</span>
        </button>
      </td>
    `;

    // Quantity change handlers
    const qtyInput = row.querySelector('.qty-input');
    const decreaseBtn = row.querySelector('.qty-decrease');
    const increaseBtn = row.querySelector('.qty-increase');

    decreaseBtn.addEventListener('click', () => {
      const current = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = Math.max(1, current - 1);
      updateItemQuantity(item.id, qtyInput.value);
    });

    increaseBtn.addEventListener('click', () => {
      const current = parseInt(qtyInput.value, 10) || 1;
      qtyInput.value = current + 1;
      updateItemQuantity(item.id, qtyInput.value);
    });

    qtyInput.addEventListener('change', () => {
      const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
      qtyInput.value = qty;
      updateItemQuantity(item.id, qty);
    });

    // Remove button
    const removeBtn = row.querySelector('.hcl-cart-remove-btn');
    removeBtn.addEventListener('click', () => {
      removeFromCart(item.id);
    });

    tbody.appendChild(row);
  });

  container.appendChild(itemsContainer);
}

async function renderCartSummary(container, cart) {
  const summaryContainer = document.createElement('div');
  summaryContainer.className = 'hcl-cart-summary-container';

  const subtotal = cart.totalPrice || '0.00';
  const shipping = '0.00'; // Would come from shipping calculation
  const tax = '0.00'; // Would come from tax calculation
  const total = cart.totalPrice || '0.00';

  summaryContainer.innerHTML = `
    <div class="hcl-cart-summary">
      <h2>Order Summary</h2>
      
      <div class="hcl-cart-summary-line">
        <span class="label">Subtotal (${cart.items?.length || 0} items)</span>
        <span class="value">$${subtotal}</span>
      </div>
      
      <div class="hcl-cart-summary-line">
        <span class="label">Shipping</span>
        <span class="value">$${shipping}</span>
      </div>
      
      <div class="hcl-cart-summary-line">
        <span class="label">Tax</span>
        <span class="value">$${tax}</span>
      </div>
      
      <div class="hcl-cart-summary-total">
        <span class="label">Total</span>
        <span class="value">$${total}</span>
      </div>
      
      <div class="hcl-cart-actions">
        <button class="hcl-cart-checkout-btn">Proceed to Checkout</button>
        <a href="/products" class="hcl-cart-continue-link">Continue Shopping</a>
      </div>
      
      <div class="hcl-cart-coupon-section">
        <input 
          type="text" 
          class="hcl-cart-coupon-input" 
          placeholder="Apply coupon code" 
          aria-label="Coupon code"
        />
        <button class="hcl-cart-apply-coupon-btn">Apply</button>
      </div>
    </div>
  `;

  // Checkout button
  const checkoutBtn = summaryContainer.querySelector('.hcl-cart-checkout-btn');
  checkoutBtn.addEventListener('click', () => {
    window.location.href = '/checkout';
  });

  // Apply coupon
  const applyCouponBtn = summaryContainer.querySelector('.hcl-cart-apply-coupon-btn');
  applyCouponBtn.addEventListener('click', () => {
    const couponInput = summaryContainer.querySelector('.hcl-cart-coupon-input');
    const couponCode = couponInput.value.trim();
    if (couponCode) {
      applyCoupon(couponCode);
      couponInput.value = '';
    }
  });

  container.appendChild(summaryContainer);
}

async function updateItemQuantity(itemId, quantity) {
  try {
    const { useAddToCart } = await import('../../scripts/cart-manager.js');
    const { updateCart } = useAddToCart();

    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    await updateCart(itemId, quantity);
  } catch (error) {
    console.error('Error updating cart item:', error);
    alert('Failed to update item quantity. Please try again.');
  }
}

async function removeFromCart(itemId) {
  try {
    const { useAddToCart } = await import('../../scripts/cart-manager.js');
    const { removeItem } = useAddToCart();

    await removeItem(itemId);
  } catch (error) {
    console.error('Error removing cart item:', error);
    alert('Failed to remove item. Please try again.');
  }
}

async function applyCoupon(couponCode) {
  try {
    // This would call an API to validate and apply the coupon
    // For now, show a placeholder message
    alert(`Coupon "${couponCode}" applied! (This is a placeholder)`);
  } catch (error) {
    console.error('Error applying coupon:', error);
    alert('Failed to apply coupon. Please try again.');
  }
}

async function fetchAndRenderCart(block) {
  try {
    const { useCart } = await import('../../scripts/cart-manager.js');
    const cart = useCart();

    // Clear block
    block.innerHTML = '';

    // Create main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'hcl-cart-page-container';

    // Create two-column layout
    const itemsColumn = document.createElement('div');
    itemsColumn.className = 'hcl-cart-items-column';

    const summaryColumn = document.createElement('div');
    summaryColumn.className = 'hcl-cart-summary-column';

    // Add breadcrumb
    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'hcl-cart-breadcrumb';
    breadcrumb.innerHTML = `
      <a href="/">Home</a>
      <span>/</span>
      <span class="current">Shopping Cart</span>
    `;
    itemsColumn.appendChild(breadcrumb);

    // Add page title
    const title = document.createElement('h1');
    title.className = 'hcl-cart-title';
    title.textContent = 'Shopping Cart';
    itemsColumn.appendChild(title);

    // Render items and summary
    await renderCartItems(itemsColumn, cart);
    await renderCartSummary(summaryColumn, cart);

    mainContainer.appendChild(itemsColumn);
    mainContainer.appendChild(summaryColumn);
    block.appendChild(mainContainer);

    // Subscribe to cart updates
    const unsubscribe = cart.subscribe(() => {
      fetchAndRenderCart(block);
    });

    // Cleanup on block removal
    block.dataset.unsubscribe = unsubscribe;
  } catch (error) {
    console.error('Error rendering cart page:', error);
    block.innerHTML = '<div class="hcl-cart-error">Failed to load cart. Please refresh the page.</div>';
  }
}

export default async function decorate(block) {
  block.classList.add('hcl-cart-page');
  const config = readBlockConfig(block);

  // Initialize cart page
  await fetchAndRenderCart(block);
}
