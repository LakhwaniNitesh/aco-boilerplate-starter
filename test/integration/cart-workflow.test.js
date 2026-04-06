import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

/**
 * Integration Tests - Full Workflow Testing
 * Tests the complete flow of cart operations from authentication through checkout
 */

// Mock implementations for integration testing
class MockBackend {
  constructor() {
    this.users = {
      'test@example.com': { password: 'password123', token: 'test-token-123' },
    };
    this.carts = {};
  }

  async login(email, password) {
    const user = this.users[email];
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }
    return { token: user.token, expiresIn: 3600 };
  }

  async getCart(token) {
    if (token !== 'test-token-123' && token !== 'another-token-456') {
      throw new Error('Unauthorized');
    }

    const cart = this.carts[token] || { items: [], totalPrice: '0.00' };
    return cart;
  }

  async addToCart(token, productId, quantity = 1) {
    if (!token) throw new Error('Unauthorized');

    if (!this.carts[token]) {
      this.carts[token] = { items: [], totalPrice: '0.00' };
    }

    const cart = this.carts[token];
    const existingItem = cart.items.find((i) => i.id === productId);

    if (existingItem) {
      existingItem.qty = (parseInt(existingItem.qty, 10) || 1) + quantity;
    } else {
      cart.items.push({
        id: productId,
        name: `Product ${productId}`,
        price: '29.99',
        qty: quantity,
      });
    }

    this.updateCartTotal(cart);
    return cart;
  }

  async removeFromCart(token, productId) {
    if (!token) throw new Error('Unauthorized');

    const cart = this.carts[token];
    if (!cart) return { items: [], totalPrice: '0.00' };

    cart.items = cart.items.filter((i) => i.id !== productId);
    this.updateCartTotal(cart);
    return cart;
  }

  async updateCartItem(token, productId, quantity) {
    if (!token) throw new Error('Unauthorized');

    const cart = this.carts[token];
    if (!cart) throw new Error('Cart not found');

    const item = cart.items.find((i) => i.id === productId);
    if (!item) throw new Error('Item not found');

    item.qty = Math.max(1, quantity);
    this.updateCartTotal(cart);
    return cart;
  }

  async checkout(token, cartId) {
    if (!token) throw new Error('Unauthorized');

    const cart = this.carts[token];
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Simulate checkout
    const orderId = `order-${Date.now()}`;
    return {
      orderId,
      status: 'confirmed',
      total: cart.totalPrice,
      itemCount: cart.items.length,
    };
  }

  updateCartTotal(cart) {
    const total = cart.items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.qty, 10));
    }, 0);
    cart.totalPrice = total.toFixed(2);
  }

  clearCart(token) {
    if (this.carts[token]) {
      this.carts[token] = { items: [], totalPrice: '0.00' };
    }
  }
}

// Integration test suite
describe('E2E Cart Workflow Integration Tests', () => {
  let backend;

  beforeEach(() => {
    backend = new MockBackend();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // Authentication Flow
  describe('Authentication & Cart Access', () => {
    it('should complete full authentication flow', async () => {
      // 1. User logs in
      const loginResult = await backend.login('test@example.com', 'password123');
      expect(loginResult.token).toBe('test-token-123');

      // 2. Store token
      sessionStorage.setItem('hcl_token', loginResult.token);

      // 3. User can access cart
      const token = sessionStorage.getItem('hcl_token');
      const cart = await backend.getCart(token);

      expect(cart).toBeDefined();
      expect(cart.items).toEqual([]);
      expect(cart.totalPrice).toBe('0.00');
    });

    it('should prevent unauthenticated cart access', async () => {
      await expect(backend.getCart(null)).rejects.toThrow('Unauthorized');
    });

    it('should reject invalid credentials', async () => {
      await expect(backend.login('test@example.com', 'wrongpassword')).rejects.toThrow(
        'Invalid credentials',
      );
    });

    it('should reject unknown user', async () => {
      await expect(backend.login('unknown@example.com', 'password123')).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  // Product Addition Flow
  describe('Adding Products to Cart', () => {
    let token;

    beforeEach(async () => {
      const loginResult = await backend.login('test@example.com', 'password123');
      token = loginResult.token;
      sessionStorage.setItem('hcl_token', token);
    });

    it('should add first product to empty cart', async () => {
      const cart = await backend.addToCart(token, 'prod-001', 1);

      expect(cart.items.length).toBe(1);
      expect(cart.items[0].id).toBe('prod-001');
      expect(cart.items[0].qty).toBe(1);
      expect(cart.totalPrice).toBe('29.99');
    });

    it('should add multiple different products', async () => {
      await backend.addToCart(token, 'prod-001', 1);
      await backend.addToCart(token, 'prod-002', 2);
      const cart = await backend.addToCart(token, 'prod-003', 1);

      expect(cart.items.length).toBe(3);
      expect(cart.totalPrice).toBe('119.96'); // 29.99 + (29.99*2) + 29.99
    });

    it('should increment quantity for duplicate product', async () => {
      await backend.addToCart(token, 'prod-001', 2);
      const cart = await backend.addToCart(token, 'prod-001', 3);

      expect(cart.items.length).toBe(1);
      expect(cart.items[0].qty).toBe(5);
      expect(cart.totalPrice).toBe('149.95'); // 29.99 * 5
    });

    it('should maintain product order', async () => {
      await backend.addToCart(token, 'prod-001', 1);
      await backend.addToCart(token, 'prod-002', 1);
      await backend.addToCart(token, 'prod-003', 1);
      const cart = await backend.getCart(token);

      expect(cart.items[0].id).toBe('prod-001');
      expect(cart.items[1].id).toBe('prod-002');
      expect(cart.items[2].id).toBe('prod-003');
    });
  });

  // Cart Management Flow
  describe('Managing Cart Items', () => {
    let token;

    beforeEach(async () => {
      const loginResult = await backend.login('test@example.com', 'password123');
      token = loginResult.token;

      // Pre-populate cart
      await backend.addToCart(token, 'prod-001', 2);
      await backend.addToCart(token, 'prod-002', 1);
      await backend.addToCart(token, 'prod-003', 3);
    });

    it('should update item quantity', async () => {
      const cart = await backend.updateCartItem(token, 'prod-001', 5);

      const item = cart.items.find((i) => i.id === 'prod-001');
      expect(item.qty).toBe(5);
      expect(cart.totalPrice).toBe('179.94'); // (29.99*5) + 29.99 + (29.99*3)
    });

    it('should enforce minimum quantity of 1', async () => {
      const cart = await backend.updateCartItem(token, 'prod-001', 0);

      const item = cart.items.find((i) => i.id === 'prod-001');
      expect(item.qty).toBe(1);
    });

    it('should remove item from cart', async () => {
      const cart = await backend.removeFromCart(token, 'prod-002');

      expect(cart.items.length).toBe(2);
      expect(cart.items.map((i) => i.id)).toEqual(['prod-001', 'prod-003']);
      expect(cart.totalPrice).toBe('119.97'); // (29.99*2) + (29.99*3)
    });

    it('should handle removing non-existent item gracefully', async () => {
      const initialCart = await backend.getCart(token);
      const originalLength = initialCart.items.length;

      const cart = await backend.removeFromCart(token, 'prod-999');

      expect(cart.items.length).toBe(originalLength);
    });

    it('should update cart total after all modifications', async () => {
      await backend.updateCartItem(token, 'prod-001', 1);
      await backend.removeFromCart(token, 'prod-003');
      const cart = await backend.addToCart(token, 'prod-004', 2);

      // (29.99*1) + 29.99 + (29.99*2) = 119.96
      expect(cart.totalPrice).toBe('119.96');
    });
  });

  // Checkout Flow
  describe('Checkout Process', () => {
    let token;
    let cartWithItems;

    beforeEach(async () => {
      const loginResult = await backend.login('test@example.com', 'password123');
      token = loginResult.token;

      // Add items to cart
      cartWithItems = await backend.addToCart(token, 'prod-001', 2);
      await backend.addToCart(token, 'prod-002', 1);
    });

    it('should proceed to checkout with items', async () => {
      const order = await backend.checkout(token, 'cart-id');

      expect(order.orderId).toBeDefined();
      expect(order.status).toBe('confirmed');
      expect(order.itemCount).toBe(3);
      expect(order.total).toBe('89.97');
    });

    it('should prevent checkout with empty cart', async () => {
      // Clear cart
      backend.clearCart(token);

      await expect(backend.checkout(token, 'cart-id')).rejects.toThrow('Cart is empty');
    });

    it('should require authentication for checkout', async () => {
      await expect(backend.checkout(null, 'cart-id')).rejects.toThrow('Unauthorized');
    });

    it('should generate unique order IDs', async () => {
      const order1 = await backend.checkout(token, 'cart-id');
      
      // Reset cart for second order
      backend.clearCart(token);
      await backend.addToCart(token, 'prod-001', 1);
      
      const order2 = await backend.checkout(token, 'cart-id');

      expect(order1.orderId).not.toBe(order2.orderId);
    });
  });

  // Complete User Journey
  describe('Complete User Journey', () => {
    it('should handle full customer flow: login → add items → modify → checkout', async () => {
      // 1. Login
      const loginResult = await backend.login('test@example.com', 'password123');
      const token = loginResult.token;
      sessionStorage.setItem('hcl_token', token);

      // 2. Verify empty cart
      let cart = await backend.getCart(token);
      expect(cart.items).toEqual([]);

      // 3. Add first product
      cart = await backend.addToCart(token, 'laptop-001', 1);
      expect(cart.items.length).toBe(1);

      // 4. Add more products
      await backend.addToCart(token, 'mouse-001', 2);
      await backend.addToCart(token, 'keyboard-001', 1);
      cart = await backend.getCart(token);
      expect(cart.items.length).toBe(3);

      // 5. Modify quantities
      cart = await backend.updateCartItem(token, 'laptop-001', 2);
      expect(cart.items[0].qty).toBe(2);

      // 6. Remove one item
      cart = await backend.removeFromCart(token, 'keyboard-001');
      expect(cart.items.length).toBe(2);

      // 7. Final cart review
      cart = await backend.getCart(token);
      expect(cart.items.length).toBe(2);
      expect(cart.items[0].id).toBe('laptop-001');
      expect(cart.items[0].qty).toBe(2);

      // 8. Checkout
      const order = await backend.checkout(token, 'cart-id');
      expect(order.status).toBe('confirmed');
      expect(order.itemCount).toBe(3); // 2 laptops + 2 mice
    });

    it('should handle multiple users with separate carts', async () => {
      // User 1
      const user1Login = await backend.login('test@example.com', 'password123');
      const user1Token = user1Login.token;

      // User 2 (different token in real scenario)
      const user2Token = 'another-token-456';
      backend.users['user2@example.com'] = { password: 'pass456', token: user2Token };

      // User 1 adds items
      let user1Cart = await backend.addToCart(user1Token, 'prod-001', 1);
      expect(user1Cart.items.length).toBe(1);

      // User 2 adds different items
      let user2Cart = await backend.addToCart(user2Token, 'prod-002', 2);
      expect(user2Cart.items.length).toBe(1);

      // Verify isolation
      user1Cart = await backend.getCart(user1Token);
      user2Cart = await backend.getCart(user2Token);

      expect(user1Cart.items[0].id).toBe('prod-001');
      expect(user2Cart.items[0].id).toBe('prod-002');
    });
  });

  // Error Handling & Edge Cases
  describe('Error Handling & Edge Cases', () => {
    let token;

    beforeEach(async () => {
      const loginResult = await backend.login('test@example.com', 'password123');
      token = loginResult.token;
    });

    it('should handle rapid successive operations', async () => {
      const operations = [
        backend.addToCart(token, 'prod-001', 1),
        backend.addToCart(token, 'prod-002', 1),
        backend.addToCart(token, 'prod-003', 1),
        backend.addToCart(token, 'prod-001', 2),
      ];

      const results = await Promise.all(operations);
      const finalCart = results[results.length - 1];

      expect(finalCart.items.length).toBe(3);
      expect(finalCart.items[0].qty).toBe(3); // 1 + 2
    });

    it('should handle missing cart gracefully', async () => {
      const cart = await backend.removeFromCart(token, 'non-existent');

      expect(cart).toEqual({ items: [], totalPrice: '0.00' });
    });

    it('should maintain data integrity through operations', async () => {
      // Add items
      await backend.addToCart(token, 'prod-001', 1);
      await backend.addToCart(token, 'prod-002', 1);

      // Get cart
      const cart1 = await backend.getCart(token);
      const total1 = cart1.totalPrice;

      // Modify
      await backend.updateCartItem(token, 'prod-001', 2);

      // Get again
      const cart2 = await backend.getCart(token);
      const total2 = cart2.totalPrice;

      // Verify total recalculated correctly
      expect(parseFloat(total2)).toBeGreaterThan(parseFloat(total1));
      expect(cart2.totalPrice).toBe('89.97');
    });
  });

  // Performance & Load Tests
  describe('Performance Scenarios', () => {
    it('should handle cart with many items', async () => {
      const token = (await backend.login('test@example.com', 'password123')).token;

      // Add 50 items
      for (let i = 0; i < 50; i++) {
        await backend.addToCart(token, `prod-${i}`, 1);
      }

      const cart = await backend.getCart(token);

      expect(cart.items.length).toBe(50);
      expect(parseFloat(cart.totalPrice)).toBe(50 * 29.99);
    });

    it('should handle large quantities', async () => {
      const token = (await backend.login('test@example.com', 'password123')).token;

      const cart = await backend.addToCart(token, 'prod-001', 1000);

      expect(cart.items[0].qty).toBe(1000);
      expect(cart.totalPrice).toBe('29990.00');
    });
  });
});
