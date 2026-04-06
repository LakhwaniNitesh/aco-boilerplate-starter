export default async function decorate(block) {
  // Import CSS
  import('./commerce-mini-cart.css');
  
  const { readBlockConfig } = await import('../../scripts/aem.js');
  const { events } = await import('@dropins/tools/event-bus.js');
  const { subscribeToCart, getCartState } = await import('../../scripts/simple-cart-state.js');
  
  const config = readBlockConfig(block);

  const {
    'show-heading': showHeading = 'true',
    'max-items': maxItems = '3',
    'hide-empty': hideEmpty = 'false',
  } = config;

  console.log('[MINI-CART] Block config:', config);
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

  // Setup update display function (works with or without cartStore)
  const updateDisplay = () => {
    console.log('[MINI-CART] updateDisplay() called');
    // PRIMARY: Try simple cart state first (guaranteed to be updated)
    let simpleState = getCartState();
    let items = simpleState.items || [];
    let total = simpleState.total || 0;
    
    // FALLBACK: Try cartStore if simple state is empty
    let cartStoreState = null;
    try {
      if (typeof window !== 'undefined' && window.__cartStore__) {
        const state = window.__cartStore__.getState();
        if (state && state.cart) {
          cartStoreState = state;
          if (items.length === 0) {
            items = state.cart?.items || [];
            total = state.cart?.total || 0;
          }
        }
      }
    } catch (e) {
      console.log('[MINI-CART] CartStore not available, using simple state');
    }
    
    const count = items.length;
    console.log('[MINI-CART] Updating display - items:', items, 'count:', count, 'total:', total);

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

      // Update total (calculated from items)
      const calculatedTotal = items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
      totalPrice.textContent = `$${calculatedTotal.toFixed(2)}`;
      
      // Update cart button badge in header
      const cartButton = document.querySelector('.nav-cart-button');
      if (cartButton) {
        if (count > 0) {
          cartButton.setAttribute('data-count', count);
        } else {
          cartButton.removeAttribute('data-count');
        }
      }
    };

  // Load cartStore if available
  let cartStore = null;
  let ACTIONS = null;
  console.log('[MINI-CART] About to import cart-manager...');
  try {
    const imported = await import('../../scripts/cart-manager.js');
    cartStore = imported.cartStore;
    ACTIONS = imported.ACTIONS;
    // Store reference globally for easy access
    window.__cartStore__ = cartStore;
    console.log('[MINI-CART] Initialized with cartStore:', cartStore);
  } catch (err) {
    console.error('[MINI-CART] Error importing cart-manager:', err);
    console.log('[MINI-CART] Will use simple-cart-state only');
  }

  // Initial update
  console.log('[MINI-CART] Calling initial updateDisplay()');
  updateDisplay();

  // Subscribe to simple cart state for direct updates
  console.log('[MINI-CART] Subscribing to simple cart state');
  const unsubscribeSimple = subscribeToCart((simpleState) => {
    console.log('[MINI-CART] Received simple cart state update:', simpleState);
    updateDisplay();
  });

  // Subscribe to cartStore if available
  if (cartStore) {
    console.log('[MINI-CART] Subscribing to cartStore');
    const unsubscribe = cartStore.subscribe(updateDisplay);
    
    // Also listen to cart/update events from the event bus (fallback mechanism)
    events.on('cart/update', (data) => {
      console.log('[MINI-CART] Received cart/update event:', data);
      if (data.cart && cartStore) {
        // Dispatch to cartStore to ensure state is updated
        cartStore.dispatch({
          type: ACTIONS.SET_CART,
          payload: data.cart,
        });
      }
    });

    // Listen to custom window events as extra fallback
    window.addEventListener('hcl-cart-updated', (e) => {
      console.log('[MINI-CART] Received hcl-cart-updated event:', e.detail);
      if (e.detail?.cart && cartStore) {
        cartStore.dispatch({
          type: ACTIONS.SET_CART,
          payload: e.detail.cart,
        });
      }
    });

    // Cleanup on block removal
    block.addEventListener('DOMNodeRemoved', () => {
      unsubscribe();
      unsubscribeSimple();
    });
  } else {
    console.log('[MINI-CART] CartStore not available, using simple state only');
    
    // Cleanup simple subscription on block removal
    block.addEventListener('DOMNodeRemoved', () => {
      unsubscribeSimple();
    });
  }
}
