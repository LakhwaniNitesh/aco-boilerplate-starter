import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock CartStore Implementation for Testing
class CartStoreMock {
  constructor() {
    this.items = [];
    this.totalPrice = "0.00";
    this.itemCount = 0;
    this.listeners = [];
  }

  addItem(item) {
    const existingItem = this.items.find((i) => i.id === item.id);
    if (existingItem) {
      existingItem.qty =
        (parseInt(existingItem.qty, 10) || 1) + (parseInt(item.qty, 10) || 1);
    } else {
      this.items.push(item);
    }
    this.updateTotals();
    this.notifyListeners();
  }

  removeItem(itemId) {
    this.items = this.items.filter((i) => i.id !== itemId);
    this.updateTotals();
    this.notifyListeners();
  }

  updateItem(itemId, qty) {
    const item = this.items.find((i) => i.id === itemId);
    if (item) {
      item.qty = Math.max(1, parseInt(qty, 10));
      this.updateTotals();
      this.notifyListeners();
    }
  }

  getCart() {
    return {
      items: this.items,
      totalPrice: this.totalPrice,
      itemCount: this.itemCount,
    };
  }

  updateTotals() {
    this.itemCount = this.items.reduce(
      (sum, item) => sum + (parseInt(item.qty, 10) || 1),
      0,
    );
    const total = this.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      const qty = parseInt(item.qty, 10) || 1;
      return sum + price * qty;
    }, 0);
    this.totalPrice = total.toFixed(2);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.getCart());
      } catch (error) {
        console.error("Error in cart listener:", error);
      }
    });
  }

  clear() {
    this.items = [];
    this.totalPrice = "0.00";
    this.itemCount = 0;
    this.notifyListeners();
  }
}

describe("CartStore Unit Tests", () => {
  let store;

  beforeEach(() => {
    store = new CartStoreMock();
  });

  afterEach(() => {
    store.clear();
  });

  // Add Item Tests
  describe("addItem()", () => {
    it("should add a single item to empty cart", () => {
      const item = { id: "1", name: "Product 1", price: "29.99", qty: 1 };
      store.addItem(item);

      expect(store.items.length).toBe(1);
      expect(store.itemCount).toBe(1);
      expect(store.totalPrice).toBe("29.99");
    });

    it("should increment quantity when adding duplicate item", () => {
      const item = { id: "1", name: "Product 1", price: "29.99", qty: 1 };
      store.addItem(item);
      store.addItem({ ...item, qty: 2 });

      expect(store.items.length).toBe(1);
      expect(store.items[0].qty).toBe(3);
      expect(store.itemCount).toBe(3);
      expect(store.totalPrice).toBe("89.97");
    });

    it("should handle multiple different items", () => {
      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });
      store.addItem({ id: "2", name: "Product 2", price: "49.99", qty: 2 });

      expect(store.items.length).toBe(2);
      expect(store.itemCount).toBe(3);
      expect(store.totalPrice).toBe("129.97");
    });

    it("should trigger listeners on item add", () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        items: expect.any(Array),
        totalPrice: "29.99",
        itemCount: 1,
      });
    });
  });

  // Remove Item Tests
  describe("removeItem()", () => {
    beforeEach(() => {
      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });
      store.addItem({ id: "2", name: "Product 2", price: "49.99", qty: 2 });
    });

    it("should remove item from cart", () => {
      store.removeItem("1");

      expect(store.items.length).toBe(1);
      expect(store.items[0].id).toBe("2");
      expect(store.itemCount).toBe(2);
      expect(store.totalPrice).toBe("99.98");
    });

    it("should handle removing non-existent item gracefully", () => {
      const originalLength = store.items.length;
      store.removeItem("999");

      expect(store.items.length).toBe(originalLength);
    });

    it("should trigger listeners on item removal", () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.removeItem("1");

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // Update Item Tests
  describe("updateItem()", () => {
    beforeEach(() => {
      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 2 });
    });

    it("should update item quantity", () => {
      store.updateItem("1", 5);

      expect(store.items[0].qty).toBe(5);
      expect(store.itemCount).toBe(5);
      expect(store.totalPrice).toBe("149.95");
    });

    it("should enforce minimum quantity of 1", () => {
      store.updateItem("1", 0);

      expect(store.items[0].qty).toBe(1);
      expect(store.itemCount).toBe(1);
    });

    it("should handle invalid quantity input", () => {
      store.updateItem("1", "invalid");

      expect(store.items[0].qty).toBe(1);
    });

    it("should trigger listeners on quantity update", () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.updateItem("1", 10);

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  // Get Cart Tests
  describe("getCart()", () => {
    it("should return empty cart structure", () => {
      const cart = store.getCart();

      expect(cart).toEqual({
        items: [],
        totalPrice: "0.00",
        itemCount: 0,
      });
    });

    it("should return current cart state", () => {
      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });
      store.addItem({ id: "2", name: "Product 2", price: "49.99", qty: 2 });

      const cart = store.getCart();

      expect(cart.items.length).toBe(2);
      expect(cart.itemCount).toBe(3);
      expect(cart.totalPrice).toBe("129.97");
    });
  });

  // Subscription Tests
  describe("subscribe()", () => {
    it("should notify multiple listeners on change", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);
      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should unsubscribe listener when returned function called", () => {
      const listener = jest.fn();
      const unsubscribe = store.subscribe(listener);

      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      store.addItem({ id: "2", name: "Product 2", price: "49.99", qty: 1 });
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("should handle listener errors gracefully", () => {
      const badListener = jest.fn(() => {
        throw new Error("Listener error");
      });
      const goodListener = jest.fn();

      store.subscribe(badListener);
      store.subscribe(goodListener);

      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 1 });

      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1); // Should still be called
    });
  });

  // Price Calculation Tests
  describe("Price Calculations", () => {
    it("should calculate correct total for multiple items with different quantities", () => {
      store.addItem({ id: "1", name: "Product 1", price: "10.00", qty: 2 });
      store.addItem({ id: "2", name: "Product 2", price: "15.50", qty: 3 });
      store.addItem({ id: "3", name: "Product 3", price: "5.25", qty: 1 });

      // (10 * 2) + (15.50 * 3) + (5.25 * 1) = 20 + 46.50 + 5.25 = 71.75
      expect(store.totalPrice).toBe("71.75");
    });

    it("should format price to 2 decimal places", () => {
      store.addItem({ id: "1", name: "Product 1", price: "9.99", qty: 3 });

      // 9.99 * 3 = 29.97
      expect(store.totalPrice).toBe("29.97");
      expect(store.totalPrice).toMatch(/^\d+\.\d{2}$/);
    });

    it("should handle price rounding correctly", () => {
      store.addItem({ id: "1", name: "Product 1", price: "0.01", qty: 3 });

      expect(store.totalPrice).toBe("0.03");
    });
  });

  // Clear Tests
  describe("clear()", () => {
    beforeEach(() => {
      store.addItem({ id: "1", name: "Product 1", price: "29.99", qty: 2 });
      store.addItem({ id: "2", name: "Product 2", price: "49.99", qty: 1 });
    });

    it("should clear all items from cart", () => {
      store.clear();

      expect(store.items).toEqual([]);
      expect(store.itemCount).toBe(0);
      expect(store.totalPrice).toBe("0.00");
    });

    it("should notify listeners when clearing", () => {
      const listener = jest.fn();
      store.subscribe(listener);

      store.clear();

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({
        items: [],
        totalPrice: "0.00",
        itemCount: 0,
      });
    });
  });
});
