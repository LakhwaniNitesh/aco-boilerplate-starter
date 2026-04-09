# Mini-Cart Block (HCL Commerce)

## Overview

The **Mini-Cart** block displays a compact summary of the current shopping cart, including item count, list of items, total price, and a "View Cart" link. This block is ideal for headers, sidebars, or any compact cart display location.

The Mini-Cart integrates seamlessly with the **CartStore** (Layer 2 service), providing real-time updates whenever items are added, removed, or modified in the cart.

## Features

- **Real-Time Updates**: Automatically reflects cart state changes via CartStore subscription
- **Item Count Badge**: Displays total number of items in cart with a visual badge
- **Item List Display**: Shows item names, quantities, and prices (scrollable for many items)
- **Total Price Calculation**: Displays cart total with formatted currency
- **Empty State Handling**: Shows friendly message when cart is empty
- **Responsive Design**: Optimized for desktop, tablet, and mobile viewports
- **Dark Mode Support**: Automatically adjusts colors for dark mode preference
- **Configurable**: Supports 3 configuration options via block properties
- **Accessibility**: Full keyboard navigation and screen reader support

## Installation

This block is included in the `blocks/hcl-mini-cart/` directory. No additional installation required.

### Dependencies

- **Layer 2 Services**: `cart-manager.js` (CartStore) via dynamic import
- **Utilities**: `aem.js` for `readBlockConfig()` utility
- **Libraries**: None (vanilla JavaScript)

## Configuration

Configure the Mini-Cart block via authoring UI or JSON. Supported options:

| Option         | Type    | Default | Description                                                        |
| -------------- | ------- | ------- | ------------------------------------------------------------------ |
| `show-heading` | boolean | `true`  | Display "Your Cart" header above the mini-cart                     |
| `max-items`    | number  | `3`     | Maximum number of items to display before "X more items" indicator |
| `hide-empty`   | boolean | `false` | If `true`, hides entire mini-cart when cart is empty               |

### Example Configuration (JSON)

```json
{
  "block": "hcl-mini-cart",
  "show-heading": "false",
  "max-items": "5",
  "hide-empty": "false"
}
```

### Example Configuration (Authoring UI)

```
| Setting | Value |
|---------|-------|
| show-heading | true |
| max-items | 3 |
| hide-empty | false |
```

## Usage

### Basic Usage

Add the block to a page via the authoring interface. The block will automatically:

1. Initialize the CartStore
2. Fetch current cart contents
3. Subscribe to real-time updates
4. Display cart items and total

### Markup Structure

```html
<div class="hcl-mini-cart">
  <div class="hcl-mini-cart-container">
    <!-- Header (if show-heading=true) -->
    <div class="hcl-mini-cart-header">
      <h3>Your Cart</h3>
      <span class="hcl-mini-cart-badge">3</span>
    </div>

    <!-- Items List -->
    <div class="hcl-mini-cart-items">
      <div class="hcl-mini-cart-item">
        <div class="hcl-mini-cart-item-details">
          <div class="hcl-mini-cart-item-name">Product Name</div>
          <div class="hcl-mini-cart-item-qty">Qty: 2</div>
        </div>
        <div class="hcl-mini-cart-item-price">$49.99</div>
      </div>
      <!-- More items... -->
      <div class="hcl-mini-cart-more">+1 more item</div>
    </div>

    <!-- Summary -->
    <div class="hcl-mini-cart-summary">
      <span class="hcl-mini-cart-summary-label">Total:</span>
      <span class="hcl-mini-cart-summary-total">$149.99</span>
    </div>

    <!-- Actions -->
    <div class="hcl-mini-cart-actions">
      <a href="/cart" class="hcl-mini-cart-view-link">View Full Cart</a>
    </div>
  </div>
</div>
```

### Empty State

When cart is empty:

```html
<div class="hcl-mini-cart hcl-mini-cart-empty">
  <div class="hcl-mini-cart-empty-icon">🛒</div>
  <div>Your cart is empty</div>
</div>
```

## Styling & Customization

### CSS Variables

The Mini-Cart uses CSS variables for easy theme customization:

```css
/* Colors */
--text-color: #000; /* Primary text color */
--text-secondary: #666; /* Secondary text color */
--bg-color: #fff; /* Background color */
--border-color: #e0e0e0; /* Border color */
--badge-bg: #e63946; /* Badge background */
--badge-color: #fff; /* Badge text color */
--price-color: #e63946; /* Price text color */
--link-color: #0066cc; /* Link color */

/* Dark Mode */
--text-color-dark: #fff;
--text-secondary-dark: #999;
--bg-color-dark: #1a1a1a;
--border-color-dark: #333;

/* Interactions */
--link-hover-bg: #0066cc;
--link-hover-color: #fff;
--focus-color: #0066cc;

/* Scrollbars */
--scroll-track: #f1f1f1;
--scroll-thumb: #888;
--scroll-thumb-hover: #555;
```

### Responsive Breakpoints

- **Desktop**: Full layout, all information visible
- **Tablet (≤768px)**: Slightly reduced font sizes, adjusted spacing
- **Mobile (≤480px)**: Compact layout, minimal padding, optimized for small screens

### Customizing Styles

Override default styles in your theme's main CSS file:

```css
/* Example: Change badge color to blue */
.hcl-mini-cart-badge {
  background-color: #0066cc;
}

/* Example: Increase max height for items list */
.hcl-mini-cart-items {
  max-height: 300px;
}
```

## Integration with CartStore

The Mini-Cart automatically subscribes to CartStore changes. When users:

- Add items via "Add to Cart" button
- Update quantities
- Remove items
- Clear cart

The Mini-Cart updates instantly without page reload.

### Hook Used Internally

```javascript
import { useCart } from "../cart-manager.js";

const cart = useCart(); // Subscribe to cart changes
```

The component listens to:

- `cart.items[]` - Array of cart items
- `cart.totalPrice` - Formatted total price
- `cart.itemCount` - Total number of items

## Error Handling

### Network Errors

If fetching cart data fails:

1. Block displays empty state
2. Error logged to console
3. Retry automatically on next CartStore subscription update

### Authentication Errors

If user is not authenticated:

1. CartStore returns empty cart
2. Block displays empty state
3. "View Cart" link available (authentication required on cart page)

## Performance Considerations

- **Lazy Loading**: CartStore uses dynamic imports to avoid circular dependencies
- **Subscription-Based**: Minimal re-renders using CartStore hooks
- **Memory Efficient**: Max items limited to prevent DOM bloat
- **Scroll Performance**: Items list has scrollbar with limited height

## Accessibility

- **Keyboard Navigation**: All links and buttons keyboard-accessible
- **Focus Indicators**: Clear focus states on interactive elements
- **Screen Readers**: Semantic HTML, ARIA labels where needed
- **Color Contrast**: WCAG AA compliant color ratios
- **Responsive Text**: Font sizes scale with viewport

### ARIA Labels

```html
<span aria-label="3 items in cart" class="hcl-mini-cart-badge">3</span>
<a href="/cart" aria-label="View full shopping cart">View Full Cart</a>
```

## Testing

### Unit Tests

Located at: `test/blocks/hcl-mini-cart.test.js`

Test coverage includes:

- Block initialization
- Configuration parsing
- CartStore subscription
- Item display and formatting
- Empty state rendering
- Total price calculation
- Link generation

### Integration Tests

Located at: `test/integration/hcl-mini-cart.integration.test.js`

Test coverage includes:

- Real CartStore integration
- Item add/remove updates
- Quantity change reflection
- Total price accuracy
- Real-time updates

### Manual Testing Checklist

- [ ] Block displays on page
- [ ] Item count badge shows correct number
- [ ] Items list displays correctly
- [ ] Total price formatted correctly
- [ ] "View Cart" link navigates to `/cart`
- [ ] Empty state shows when no items
- [ ] Adding item to cart updates mini-cart immediately
- [ ] Removing item from cart updates mini-cart immediately
- [ ] Responsive on mobile (≤480px)
- [ ] Responsive on tablet (≤768px)
- [ ] Dark mode colors apply correctly
- [ ] All links keyboard-accessible
- [ ] Screen reader announces item count

## Troubleshooting

### Mini-Cart Not Updating

**Symptom**: Items added but mini-cart doesn't reflect changes

**Solution**:

1. Check browser console for errors
2. Verify CartStore is initialized
3. Verify backend `/cart/get` endpoint is responding
4. Check network tab for failed requests

### Items Not Displaying

**Symptom**: Mini-cart shows item count but items list empty

**Solution**:

1. Check that backend returns items in response
2. Verify item data structure matches expected format
3. Check browser console for parsing errors

### Styles Not Applying

**Symptom**: Styling looks wrong or broken

**Solution**:

1. Verify CSS file loaded in browser DevTools
2. Check CSS variable overrides in parent styles
3. Verify no conflicting global styles

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## File Structure

```
blocks/hcl-mini-cart/
├── hcl-mini-cart.js       # Component logic & initialization
├── hcl-mini-cart.css      # Styling & responsive design
└── README.md              # This documentation file
```

## Related Components

- **add-to-cart-hcl**: Button component for adding items to cart
- **hcl-cart-page**: Full cart page showing all items and checkout
- **cart-manager.js**: CartStore state management (Layer 2 service)
- **hcl-commerce-api.js**: API client for cart operations

## Version History

### v1.0.0 (Initial Release)

- Real-time cart display
- Configuration options
- Responsive design
- Dark mode support
- Accessibility features

## License

See LICENSE file in project root.

## Support

For issues, feature requests, or questions:

1. Check this README
2. Review test files for usage examples
3. Check browser console for error messages
4. Contact development team
