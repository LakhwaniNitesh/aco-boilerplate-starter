import { readBlockConfig } from '../../scripts/aem.js';
import { events } from '@dropins/tools/event-bus.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);

  const {
    'show-heading': showHeading = 'true',
    'max-items': maxItems = '3',
    'hide-empty': hideEmpty = 'false',
  } = config;

  block.classList.add('hcl-mini-cart');

  // Create container
  const container = document.createElement('div');
  container.className = 'hcl-mini-cart-container';

  // Create header
  const header = document.createElement('div');
  header.className = 'hcl-mini-cart-header';

  if (showHeading === 'true') {
    const title = document.createElement('h3');
    title.className = 'hcl-mini-cart-title';
    title.textContent = 'Cart';
    header.appendChild(title);
  }

  const badge = document.createElement('span');
  badge.className = 'hcl-mini-cart-badge';
  badge.textContent = '0';
  header.appendChild(badge);

  container.appendChild(header);

  // Create items list
  const itemsList = document.createElement('div');
  itemsList.className = 'hcl-mini-cart-items';

  // Create empty state
  const emptyState = document.createElement('div');
  emptyState.className = 'hcl-mini-cart-empty';
  emptyState.textContent = 'Your cart is empty';

  container.appendChild(itemsList);
  container.appendChild(emptyState);

  // Create summary
  const summary = document.createElement('div');
  summary.className = 'hcl-mini-cart-summary';

  const totalLabel = document.createElement('span');
  totalLabel.textContent = 'Total:';

  const totalPrice = document.createElement('span');
  totalPrice.className = 'hcl-mini-cart-total';
  totalPrice.textContent = '$0.00';

  summary.appendChild(totalLabel);
  summary.appendChild(totalPrice);

  // Create view cart link
  const viewCart = document.createElement('a');
  viewCart.href = '/cart';
  viewCart.className = 'hcl-mini-cart-link';
  viewCart.textContent = 'View Cart';

  container.appendChild(summary);
  container.appendChild(viewCart);

  block.innerHTML = '';
  block.appendChild(container);

  // Load and subscribe to cart updates
  try {
    const { cartStore, ACTIONS } = await import('../../scripts/cart-manager.js');

    const updateDisplay = () => {
      const state = cartStore.getState();
      const items = state.cart?.items || [];
      const count = items.length;
      console.log('[MINI-CART] Updating display with items:', items, 'count:', count);

      // Update badge
      badge.textContent = count;
      badge.className = `hcl-mini-cart-badge ${count > 0 ? 'has-items' : ''}`;

      // Update visibility
      if (hideEmpty === 'true' && count === 0) {
        block.style.display = 'none';
      } else {
        block.style.display = 'block';
      }

      // Update items list
      itemsList.innerHTML = '';
      const displayItems = items.slice(0, parseInt(maxItems, 10));

      if (count === 0) {
        emptyState.style.display = 'block';
      } else {
        emptyState.style.display = 'none';

        displayItems.forEach((item) => {
          const itemEl = document.createElement('div');
          itemEl.className = 'hcl-mini-cart-item';

          const itemName = document.createElement('div');
          itemName.className = 'hcl-mini-cart-item-name';
          itemName.textContent = item.name || 'Product';

          const itemQty = document.createElement('span');
          itemQty.className = 'hcl-mini-cart-item-qty';
          itemQty.textContent = `× ${item.quantity || 1}`;

          const itemPrice = document.createElement('span');
          itemPrice.className = 'hcl-mini-cart-item-price';
          itemPrice.textContent = `$${(item.price || 0).toFixed(2)}`;

          itemEl.appendChild(itemName);
          itemEl.appendChild(itemQty);
          itemEl.appendChild(itemPrice);

          itemsList.appendChild(itemEl);
        });

        if (count > parseInt(maxItems, 10)) {
          const moreItems = document.createElement('div');
          moreItems.className = 'hcl-mini-cart-more';
          moreItems.textContent = `+${count - parseInt(maxItems, 10)} more`;
          itemsList.appendChild(moreItems);
        }
      }

      // Update total
      const total = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      totalPrice.textContent = `$${total.toFixed(2)}`;
    };

    // Initial update
    updateDisplay();

    // Subscribe to cart changes
    const unsubscribe = cartStore.subscribe(updateDisplay);

    // Also listen to cart/update events from the event bus (fallback mechanism)
    events.on('cart/update', (data) => {
      console.log('[MINI-CART] Received cart/update event:', data);
      if (data.cart) {
        // Dispatch to cartStore to ensure state is updated
        cartStore.dispatch({
          type: ACTIONS.SET_CART,
          payload: data.cart,
        });
      }
    });

    // Cleanup on block removal
    block.addEventListener('DOMNodeRemoved', () => {
      unsubscribe();
    });
  } catch (error) {
    console.error('Failed to load cart manager:', error);
    emptyState.textContent = 'Cart unavailable';
  }
}
