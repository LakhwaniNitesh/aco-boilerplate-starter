# Add to Cart HCL Block

## Overview

The Add to Cart HCL block provides a configurable button component for adding products to the HCL Commerce shopping cart. It integrates seamlessly with the storefront's Layer 2 services (authentication, cart management) and provides visual feedback through loading states, success messages, and error handling.

## Features

- **Configuration-driven**: Button text, variant, behavior controlled via Word document config
- **State Management**: Integrates with CartStore Redux-style state management
- **Loading Feedback**: Optional animated loading indicator during add-to-cart operation
- **Error Handling**: Graceful error messages with retry capability
- **Authentication**: Automatically disables for unauthenticated users
- **Responsive Design**: Mobile-first styling with 100% button width on small screens
- **Accessibility**: Keyboard navigation, focus states, semantic HTML
- **Custom Events**: Dispatches `addedToCart` event for tracking and analytics

## Configuration

Configure the block using a Word document table with the following options:

| Property | Description | Default | Type |
|----------|-------------|---------|------|
| `sku` | Product SKU identifier (required) | None | String |
| `button-text` | Button display text | "Add to Cart" | String |
| `button-variant` | Button style (primary, secondary) | primary | String |
| `show-loading` | Show animated loading state | true | Boolean |
| `redirect-on-success` | Redirect to /cart after add | false | Boolean |
| `success-message` | Success notification text | "Added to cart!" | String |
| `error-message` | Error notification prefix | "Failed to add to cart" | String |

## Usage Examples

### Basic Add to Cart Button

```
Block title: Add to Cart HCL
Columns:    SKU          | Button Text
Data:       PROD12345    | Add to Cart
```

### With Redirect to Cart

```
Block title: Add to Cart HCL
Columns:    SKU          | Button Text     | Redirect on Success
Data:       PROD12345    | Buy Now         | true
```

### Secondary Variant

```
Block title: Add to Cart HCL
Columns:    SKU          | Button Variant
Data:       PROD12345    | secondary
```

### With Custom Messages

```
Block title: Add to Cart HCL
Columns:    SKU          | Success Message        | Error Message
Data:       PROD12345    | Item added to cart     | Unable to add item
```

## Integration with Product Blocks

This block is designed to work alongside product display blocks like `product-teaser`. When placed next to a product block, the button automatically adds that product to the cart.

### HTML Structure

```html
<div class="add-to-cart-hcl">
  <button class="add-to-cart-hcl__button primary" type="button">
    Add to Cart
  </button>
  <span class="add-to-cart-hcl__loader" style="display: none">...</span>
  <div class="add-to-cart-hcl__message" style="display: none"></div>
</div>
```

## State Flow

### 1. Initial Load
- Button enabled if user is authenticated
- Button disabled with tooltip if user is not authenticated
- All messages hidden

### 2. Click Handler
- Button becomes disabled
- Loading indicator visible (if enabled)
- Click events ignored (debounced)

### 3. Request Processing
- `CartStore.addToCart()` called with SKU and quantity
- Communicates with HCL Commerce API via Layer 2 service
- Backend proxy handles authentication and API interaction

### 4. Success State
- Success message displayed: "Added to cart!"
- Button re-enabled after 2 seconds
- Custom `addedToCart` event dispatched
- Optional redirect to `/cart` page

### 5. Error State
- Error message displayed with error details
- Button immediately re-enabled
- Error logged to console for debugging
- User can retry immediately

## Events

### Custom Events

**Event Name**: `addedToCart`
**Fired When**: Product successfully added to cart
**Payload**:
```javascript
{
  detail: {
    sku: "PROD12345",
    quantity: 1
  }
}
```

### Usage Example

```javascript
document.addEventListener('addedToCart', (event) => {
  console.log(`Added ${event.detail.quantity} of ${event.detail.sku} to cart`);
  // Track in analytics, update UI, etc.
});
```

## Styling & CSS Classes

### Button Classes
- `.add-to-cart-hcl__button` - Base button style
- `.add-to-cart-hcl__button.primary` - Primary variant (blue)
- `.add-to-cart-hcl__button.secondary` - Secondary variant (outlined)
- `.add-to-cart-hcl__button:disabled` - Disabled state

### Message Classes
- `.add-to-cart-hcl__message` - Base message container
- `.add-to-cart-hcl__message--success` - Success message (green)
- `.add-to-cart-hcl__message--error` - Error message (red)

### Container Classes
- `.add-to-cart-hcl` - Block container
- `.add-to-cart-error` - Error state for entire block

## Authentication Integration

The block automatically checks authentication status via the CartStore service:

- **Unauthenticated users**: Button disabled with "Please login to add items to cart" tooltip
- **Authenticated users**: Button enabled and fully functional
- **Real-time sync**: Button state updates when authentication status changes

This ensures users must be logged in before adding items to cart, meeting HCL Commerce security requirements.

## Error Handling

### Common Error Scenarios

| Error | Cause | User Experience |
|-------|-------|-----------------|
| "Failed to add to cart: Unauthorized" | User session expired | Button re-enabled, user should re-login |
| "Failed to add to cart: Product not found" | Invalid SKU | Check product configuration |
| "Failed to add to cart: Network error" | Backend proxy unavailable | Show retry message |
| "Cart system unavailable" | CartStore failed to load | Button disabled, informational message |

### Debugging

Enable console logging for troubleshooting:
```javascript
// Open browser DevTools (F12)
// Go to Console tab
// Look for "Add to cart failed:" messages with error details
```

## Performance Considerations

- **Lazy Loading**: CartStore loaded dynamically to avoid circular dependencies
- **No UI Blocking**: All cart operations are async, button remains responsive
- **Error Resilience**: Failed operations automatically re-enable button for retry
- **Message Auto-Hide**: Error/success messages stay visible for user review, then fade on retry

## Testing

### Manual Testing Checklist

- [ ] Button renders with correct text and variant
- [ ] Button disabled on page load if not authenticated
- [ ] Button enabled after successful authentication
- [ ] Click triggers loading state (if enabled)
- [ ] Success message displays after successful add
- [ ] Error message displays on failure with details
- [ ] Button re-enables after 2 seconds (success) or immediately (error)
- [ ] Custom event dispatches with correct SKU and quantity
- [ ] Responsive on mobile (100% width, larger touch target)
- [ ] Keyboard navigation works (Tab to button, Enter to activate)

### Example Test HTML

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="add-to-cart-hcl.css">
</head>
<body>
  <div class="add-to-cart-hcl" data-sku="TEST-SKU-001"></div>
  
  <script>
    // Simulate block initialization
    import('./add-to-cart-hcl.js').then(module => {
      const block = document.querySelector('.add-to-cart-hcl');
      module.default(block);
    });
  </script>
</body>
</html>
```

## Compatibility

- **Browser Support**: All modern browsers (Chrome, Firefox, Safari, Edge)
- **EDS**: Compatible with Edge Delivery Services authoring
- **Drop-ins**: Compatible with EDS Drop-in infrastructure
- **Layer 2 Services**: Requires CartStore and HCLAuthService from `scripts/`

## Known Limitations

- Button text cannot contain HTML (sanitized automatically)
- Quantity is always 1 or from parent block's `[data-quantity]` field
- Cart operations require backend proxy to be running on port 3001
- Authentication via HCLAuthService (sessionStorage-based, single tab only)

## Future Enhancements

- [ ] Quantity selector integration
- [ ] Variant/color selection
- [ ] Wishlist integration
- [ ] Product comparison
- [ ] Analytics event tracking
- [ ] A/B testing hooks
