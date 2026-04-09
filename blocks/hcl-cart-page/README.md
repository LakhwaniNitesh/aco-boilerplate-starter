# Cart Page Block (HCL Commerce)

## Overview

The **Cart Page** block displays the full shopping cart with comprehensive item management features. This block serves as a dedicated cart page where users can:

- View all cart items with details (product name, SKU, price, quantity)
- Manage quantities (increase, decrease, or directly enter quantity)
- Remove items from the cart
- View order summary with subtotal, shipping, tax, and total
- Apply coupon codes
- Proceed to checkout

## Features

- **Full Item Display**: Shows all cart items in a responsive table format
- **Quantity Management**: Update quantities with +/- buttons or direct input
- **Item Removal**: Remove items with confirmation
- **Order Summary**: Real-time calculation of subtotal, shipping, tax, and total
- **Coupon Support**: Apply discount codes with validation
- **Empty State**: Friendly message with "Continue Shopping" link when cart is empty
- **Sticky Summary**: Order summary stays visible when scrolling on desktop
- **Responsive Design**: Optimized for desktop, tablet, and mobile
- **Dark Mode Support**: Automatically adjusts colors for dark mode preference
- **Accessible**: Full keyboard navigation and screen reader support
- **Real-Time Updates**: Integrates with CartStore for instant updates

## Installation

This block is included in the `blocks/hcl-cart-page/` directory. No additional installation required.

### Dependencies

- **Layer 2 Services**: `cart-manager.js` (CartStore) via dynamic import
- **Utilities**: `aem.js` for `readBlockConfig()` utility
- **Libraries**: None (vanilla JavaScript)

## Configuration

Configure the Cart Page block via authoring UI or JSON. Currently supports basic initialization (configuration options can be extended):

### Example Configuration (JSON)

```json
{
  "block": "hcl-cart-page"
}
```

### Example Configuration (Authoring UI)

```
| Setting | Value |
|---------|-------|
| (none)  | (none)|
```

## Usage

### Basic Usage

Add this block to a dedicated `/cart` page. The block will:

1. Initialize CartStore
2. Fetch current cart contents
3. Display items and summary
4. Subscribe to real-time updates
5. Handle quantity changes and removals

### Markup Structure

```html
<div class="hcl-cart-page">
  <div class="hcl-cart-page-container">
    <!-- Left Column: Items -->
    <div class="hcl-cart-items-column">
      <!-- Breadcrumb -->
      <div class="hcl-cart-breadcrumb">
        <a href="/">Home</a>
        <span>/</span>
        <span class="current">Shopping Cart</span>
      </div>

      <!-- Title -->
      <h1 class="hcl-cart-title">Shopping Cart</h1>

      <!-- Items Table -->
      <div class="hcl-cart-items-container">
        <table class="hcl-cart-items-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Price</th>
              <th>Quantity</th>
              <th>Subtotal</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Items rendered dynamically -->
          </tbody>
        </table>
      </div>
    </div>

    <!-- Right Column: Summary -->
    <div class="hcl-cart-summary-column">
      <div class="hcl-cart-summary">
        <h2>Order Summary</h2>

        <div class="hcl-cart-summary-line">
          <span class="label">Subtotal (N items)</span>
          <span class="value">$XX.XX</span>
        </div>

        <div class="hcl-cart-summary-total">
          <span class="label">Total</span>
          <span class="value">$XX.XX</span>
        </div>

        <div class="hcl-cart-actions">
          <button class="hcl-cart-checkout-btn">Proceed to Checkout</button>
          <a href="/products" class="hcl-cart-continue-link"
            >Continue Shopping</a
          >
        </div>

        <div class="hcl-cart-coupon-section">
          <input type="text" placeholder="Apply coupon code" />
          <button>Apply</button>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Empty State

When cart is empty:

```html
<div class="hcl-cart-empty-state">
  <div class="hcl-cart-empty-icon">🛒</div>
  <h2>Your cart is empty</h2>
  <p>Continue shopping to add items to your cart</p>
  <a href="/products" class="hcl-cart-continue-shopping">Continue Shopping</a>
</div>
```

## Styling & Customization

### CSS Variables

The Cart Page uses CSS variables for easy theme customization:

```css
/* Colors */
--text-color: #000; /* Primary text color */
--text-secondary: #666; /* Secondary text color */
--bg-color: #fff; /* Background color */
--header-bg: #f5f5f5; /* Table header background */
--summary-bg: #f9f9f9; /* Summary container background */
--border-color: #e0e0e0; /* Border color */
--border-light: #f0f0f0; /* Light border color */
--price-color: #e63946; /* Price text color */
--primary-color: #0066cc; /* Primary button color */
--danger-color: #e63946; /* Danger button color */
--link-color: #0066cc; /* Link color */

/* Dark Mode */
--text-color-dark: #fff;
--header-bg-dark: #2a2a2a;
--summary-bg-dark: #2a2a2a;
--bg-color-dark: #1a1a1a;
--border-color-dark: #333;

/* Interactions */
--primary-hover: #004499;
--link-hover: #004499;
--row-hover-bg: #fafafa;
--button-hover-bg: #f5f5f5;
--focus-color: #0066cc;
```

### Responsive Breakpoints

- **Desktop (>1024px)**: Two-column layout (items + sticky summary)
- **Tablet (≤1024px)**: Single column, summary below items
- **Mobile (≤768px)**: Single column, compact spacing, scrollable table
- **Small Mobile (≤480px)**: Minimal spacing, horizontal scroll for table

### Customizing Styles

Override default styles in your theme's main CSS file:

```css
/* Example: Change primary color to green */
.hcl-cart-checkout-btn {
  background-color: #28a745;
}

.hcl-cart-checkout-btn:hover {
  background-color: #218838;
}

/* Example: Adjust table styling */
.hcl-cart-items-table tbody tr {
  border-bottom: 2px dashed #ccc;
}
```

## Item Management

### Quantity Updates

Users can update quantity via:

1. **+/- buttons**: Quick increment/decrement
2. **Direct input**: Type desired quantity in input field
3. **Minimum validation**: Prevents quantity < 1

### Item Removal

Click "Remove" button to:

1. Remove item from cart
2. Update CartStore
3. Trigger real-time UI refresh

### Quantity Change Logic

```javascript
// User changes quantity
→ updateItemQuantity(itemId, newQuantity)
→ CartStore.updateCart()
→ Auto-recalculate subtotal
→ UI updates in real-time
```

## Order Summary

The summary section displays:

| Line Item | Calculation               | Notes                           |
| --------- | ------------------------- | ------------------------------- |
| Subtotal  | Item prices × quantities  | Shows item count                |
| Shipping  | $0.00 (placeholder)       | Can integrate with shipping API |
| Tax       | $0.00 (placeholder)       | Can integrate with tax API      |
| **Total** | Subtotal + Shipping + Tax | Bold, prominent display         |

## Coupon System

The coupon section allows users to:

1. Enter coupon code
2. Click "Apply" to validate and apply
3. See discount reflected in total (when implemented)

**Current Status**: Placeholder implementation. To integrate:

- Add API endpoint for coupon validation
- Verify coupon eligibility
- Calculate discount amount
- Update order summary

## Integration with CartStore

The Cart Page automatically subscribes to CartStore changes. When users:

- Modify quantity
- Remove items
- Clear cart

The page updates instantly via subscription callback.

### Hook Used Internally

```javascript
import { useCart } from "../cart-manager.js";

const cart = useCart(); // Subscribe to cart changes

// cart object provides:
// - cart.items[] → Array of cart items
// - cart.totalPrice → Formatted total price
// - cart.itemCount → Total number of items
// - cart.subscribe(callback) → Listen to changes
```

## Error Handling

### Network Errors

If fetching cart data fails:

1. Display error message with reload option
2. Log error to console
3. Provide option to retry

### Quantity Update Errors

If quantity update fails:

1. Revert quantity to previous value
2. Show error alert
3. Log error for debugging

### Remove Errors

If item removal fails:

1. Show error message
2. Keep item in cart
3. Suggest retry

## Performance Considerations

- **Sticky Summary**: Uses CSS sticky positioning (performant, no JavaScript)
- **Responsive Table**: Scrolls horizontally on mobile (better than overflow hidden)
- **Real-Time Updates**: CartStore uses subscriptions for minimal re-renders
- **Lazy Loading**: CartStore loaded via dynamic import

## Accessibility

- **Semantic HTML**: Tables for structured data, buttons for actions
- **ARIA Labels**: Labels on quantity input and action buttons
- **Keyboard Navigation**: All controls keyboard-accessible
- **Focus Management**: Clear focus indicators on all interactive elements
- **Screen Readers**: Proper heading hierarchy (h1 for title)
- **Color Contrast**: WCAG AA compliant color ratios
- **Responsive Text**: Font sizes scale with viewport

### ARIA Labels

```html
<input aria-label="Item quantity" type="number" />
<button aria-label="Decrease quantity">-</button>
<button aria-label="Increase quantity">+</button>
<button aria-label="Remove item">Remove</button>
```

## Testing

### Unit Tests

Located at: `test/blocks/hcl-cart-page.test.js`

Test coverage includes:

- Block initialization
- Item rendering
- Quantity updates
- Item removal
- Empty state handling
- Summary calculations
- Coupon application

### Integration Tests

Located at: `test/integration/hcl-cart-page.integration.test.js`

Test coverage includes:

- Full user workflow (add items → cart page → modify → checkout)
- Real CartStore integration
- Backend API calls
- Real-time updates
- Error scenarios

### Manual Testing Checklist

- [ ] Page displays all cart items
- [ ] Quantity increase/decrease buttons work
- [ ] Direct quantity input works
- [ ] Removing item updates cart
- [ ] Order summary updates in real-time
- [ ] Empty state displays when no items
- [ ] "Proceed to Checkout" navigates to checkout
- [ ] "Continue Shopping" navigates to products
- [ ] Coupon code input accepts input
- [ ] Dark mode colors apply correctly
- [ ] Layout is responsive on mobile
- [ ] All links are keyboard-accessible
- [ ] Screen reader announces items and totals

## Troubleshooting

### Items Not Displaying

**Symptom**: Cart page shows but no items

**Solution**:

1. Check browser console for errors
2. Verify CartStore initialized
3. Check backend `/cart/get` endpoint
4. Verify item data format matches expectations

### Quantity Updates Not Working

**Symptom**: Clicking +/- buttons doesn't change quantity

**Solution**:

1. Check browser console for errors
2. Verify CartStore subscription active
3. Check backend `/cart/add` endpoint
4. Verify network requests completing

### Summary Not Updating

**Symptom**: Total doesn't change when items modified

**Solution**:

1. Verify backend returns correct totalPrice
2. Check CartStore value calculation
3. Verify real-time subscription firing

### Styling Issues on Mobile

**Symptom**: Table doesn't fit or layout broken

**Solution**:

1. Check device viewport width
2. Verify CSS media queries loading
3. Test on actual mobile device or DevTools
4. Check for CSS variable overrides

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## File Structure

```
blocks/hcl-cart-page/
├── hcl-cart-page.js       # Component logic & cart management
├── hcl-cart-page.css      # Styling & responsive design
└── README.md              # This documentation file
```

## Related Components

- **hcl-mini-cart**: Compact cart display (header/sidebar)
- **add-to-cart-hcl**: Button component for adding items
- **cart-manager.js**: CartStore state management (Layer 2)
- **hcl-commerce-api.js**: API client for cart operations

## Version History

### v1.0.0 (Initial Release)

- Full cart page display
- Quantity management
- Item removal
- Order summary
- Coupon placeholder
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
