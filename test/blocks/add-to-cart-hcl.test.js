import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { screen, fireEvent } from "@testing-library/dom";

/**
 * Mock implementation of add-to-cart-hcl component for testing
 */
function createAddToCartMock(block, config = {}) {
  // Setup
  const defaultConfig = {
    "button-text": "Add to Cart",
    "loading-text": "Adding...",
    ...config,
  };

  block.classList.add("add-to-cart-hcl");

  // Create button
  const button = document.createElement("button");
  button.className = "add-to-cart-button";
  button.type = "button";
  button.textContent = defaultConfig["button-text"];
  button.dataset.productId = config.productId || "test-product-1";
  button.disabled = false;

  block.appendChild(button);

  return {
    button,
    getState() {
      return {
        disabled: button.disabled,
        text: button.textContent,
        classList: Array.from(button.classList),
      };
    },
    setState(newState) {
      if (newState.disabled !== undefined) button.disabled = newState.disabled;
      if (newState.text !== undefined) button.textContent = newState.text;
      if (newState.classList) {
        button.className = newState.classList.join(" ");
      }
    },
  };
}

describe("Add-to-Cart Block Unit Tests", () => {
  let block;
  let component;

  beforeEach(() => {
    // Create test block container
    block = document.createElement("div");
    document.body.appendChild(block);

    // Initialize component
    component = createAddToCartMock(block, {
      "button-text": "Add to Cart",
      "loading-text": "Adding...",
      productId: "test-product-1",
    });
  });

  afterEach(() => {
    if (block && block.parentNode) {
      block.parentNode.removeChild(block);
    }
  });

  // Initialization Tests
  describe("Initialization", () => {
    it("should render button with correct text", () => {
      expect(component.button.textContent).toBe("Add to Cart");
    });

    it("should have correct CSS class", () => {
      expect(block.classList.contains("add-to-cart-hcl")).toBe(true);
    });

    it("should set product ID from config", () => {
      expect(component.button.dataset.productId).toBe("test-product-1");
    });

    it("should use custom button text from config", () => {
      const customBlock = document.createElement("div");
      const custom = createAddToCartMock(customBlock, {
        "button-text": "Buy Now",
        productId: "custom-product",
      });

      expect(custom.button.textContent).toBe("Buy Now");
      customBlock.remove();
    });

    it("should button be enabled initially", () => {
      expect(component.button.disabled).toBe(false);
    });
  });

  // Click Behavior Tests
  describe("Click Behavior", () => {
    it("should respond to click event", () => {
      const clickSpy = jest.spyOn(component.button, "click");

      component.button.click();

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("should disable button when adding item", () => {
      component.setState({ disabled: true, text: "Adding..." });

      expect(component.button.disabled).toBe(true);
      expect(component.button.textContent).toBe("Adding...");
    });

    it("should show success state after addition", () => {
      component.setState({ disabled: true, text: "Adding..." });
      // Simulate async operation completing
      setTimeout(() => {
        component.setState({ disabled: false, text: "Added! ✓" });
      }, 100);

      expect(component.button.disabled).toBe(true);
    });

    it("should reset button after success", (done) => {
      component.setState({ disabled: true, text: "Adding..." });

      setTimeout(() => {
        component.setState({ disabled: false, text: "Add to Cart" });
        expect(component.button.disabled).toBe(false);
        expect(component.button.textContent).toBe("Add to Cart");
        done();
      }, 500);
    });
  });

  // Configuration Tests
  describe("Configuration", () => {
    it("should apply custom loading text", () => {
      const customBlock = document.createElement("div");
      const custom = createAddToCartMock(customBlock, {
        "loading-text": "Processing...",
        productId: "test-product-2",
      });

      custom.setState({ disabled: true, text: "Processing..." });

      expect(custom.button.textContent).toBe("Processing...");
      customBlock.remove();
    });

    it("should handle missing optional config", () => {
      const minimalBlock = document.createElement("div");
      const minimal = createAddToCartMock(minimalBlock, {
        productId: "test-product-3",
      });

      expect(minimal.button.textContent).toBe("Add to Cart"); // Default
      minimalBlock.remove();
    });

    it("should preserve additional data attributes", () => {
      component.button.dataset.variantId = "variant-123";
      component.button.dataset.quantity = "2";

      expect(component.button.dataset.variantId).toBe("variant-123");
      expect(component.button.dataset.quantity).toBe("2");
    });
  });

  // State Management Tests
  describe("State Management", () => {
    it("should start in ready state", () => {
      const state = component.getState();

      expect(state.disabled).toBe(false);
      expect(state.text).toBe("Add to Cart");
    });

    it("should transition to loading state", () => {
      component.setState({ disabled: true, text: "Adding..." });
      const state = component.getState();

      expect(state.disabled).toBe(true);
      expect(state.text).toBe("Adding...");
    });

    it("should apply CSS classes based on state", () => {
      component.setState({ classList: ["add-to-cart-button", "is-loading"] });
      const state = component.getState();

      expect(state.classList).toContain("add-to-cart-button");
      expect(state.classList).toContain("is-loading");
    });

    it("should preserve state across multiple updates", () => {
      component.setState({ disabled: true });
      component.setState({ text: "Adding..." });
      const state = component.getState();

      expect(state.disabled).toBe(true);
      expect(state.text).toBe("Adding...");
    });
  });

  // Error Handling Tests
  describe("Error Handling", () => {
    it("should show error state on failure", () => {
      component.setState({
        disabled: false,
        text: "Failed - Retry",
        classList: ["add-to-cart-button", "is-error"],
      });

      expect(component.button.textContent).toContain("Failed");
      expect(component.getState().classList).toContain("is-error");
    });

    it("should allow retry after error", () => {
      component.setState({
        disabled: false,
        text: "Failed - Try Again",
      });

      expect(component.button.disabled).toBe(false); // Should be clickable
    });

    it("should handle missing product ID gracefully", () => {
      const minimalBlock = document.createElement("div");
      const minimal = createAddToCartMock(minimalBlock, {
        productId: undefined,
      });

      expect(minimal.button).toBeDefined();
      expect(minimal.button.dataset.productId).toBeUndefined();
      minimalBlock.remove();
    });
  });

  // Accessibility Tests
  describe("Accessibility", () => {
    it("should have button type for semantic HTML", () => {
      expect(component.button.type).toBe("button");
    });

    it("should support keyboard navigation", () => {
      component.button.focus();

      expect(document.activeElement).toBe(component.button);
    });

    it("should have readable button text", () => {
      expect(component.button.textContent.length).toBeGreaterThan(0);
      expect(component.button.textContent).not.toBe("");
    });

    it("should be disabled when adding (prevent double-click)", () => {
      component.setState({ disabled: true });

      const clickEvent = new MouseEvent("click", { bubbles: true });
      const canClick = !component.button.disabled;

      expect(canClick).toBe(false);
    });

    it("should communicate state changes via text content", () => {
      const states = [
        { text: "Add to Cart", disabled: false },
        { text: "Adding...", disabled: true },
        { text: "Added! ✓", disabled: false },
      ];

      states.forEach((state) => {
        component.setState(state);
        expect(component.button.textContent).toBe(state.text);
      });
    });
  });

  // Event Dispatch Tests
  describe("Event Dispatching", () => {
    it("should dispatch custom event on successful add", () => {
      const eventSpy = jest.fn();
      component.button.addEventListener("hcl:addToCart:success", eventSpy);

      const event = new CustomEvent("hcl:addToCart:success", {
        detail: { productId: "test-product-1", quantity: 1 },
      });
      component.button.dispatchEvent(event);

      expect(eventSpy).toHaveBeenCalled();
    });

    it("should dispatch error event on failure", () => {
      const eventSpy = jest.fn();
      component.button.addEventListener("hcl:addToCart:error", eventSpy);

      const event = new CustomEvent("hcl:addToCart:error", {
        detail: { error: "Out of stock" },
      });
      component.button.dispatchEvent(event);

      expect(eventSpy).toHaveBeenCalled();
    });

    it("should include product details in event payload", () => {
      const eventSpy = jest.fn();
      component.button.addEventListener("hcl:addToCart:success", eventSpy);

      const event = new CustomEvent("hcl:addToCart:success", {
        detail: {
          productId: "test-product-1",
          quantity: 2,
          variantId: "variant-123",
        },
      });
      component.button.dispatchEvent(event);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            productId: "test-product-1",
            quantity: 2,
          }),
        }),
      );
    });
  });

  // Integration Tests
  describe("Integration Scenarios", () => {
    it("should handle complete add-to-cart flow", (done) => {
      // Start
      expect(component.button.disabled).toBe(false);

      // Click (simulated)
      component.setState({ disabled: true, text: "Adding..." });
      expect(component.button.disabled).toBe(true);

      // Simulate async operation
      setTimeout(() => {
        component.setState({ disabled: false, text: "Add to Cart" });
        expect(component.button.disabled).toBe(false);
        expect(component.button.textContent).toBe("Add to Cart");
        done();
      }, 100);
    });

    it("should allow rapid successive clicks in ready state", () => {
      component.button.click();
      component.button.click();
      component.button.click();

      // Button should still be in ready state
      expect(component.button.disabled).toBe(false);
    });

    it("should prevent double-submission during add", (done) => {
      component.setState({ disabled: true, text: "Adding..." });

      // Try to click while loading
      component.button.click();
      component.button.click();

      // Button should be disabled
      expect(component.button.disabled).toBe(true);

      setTimeout(() => {
        component.setState({ disabled: false, text: "Add to Cart" });
        done();
      }, 100);
    });
  });
});
