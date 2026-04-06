/**
 * HCL Commerce Cart State Management
 *
 * Redux-style state management for HCL cart operations
 * Compatible with drop-ins and EDS components
 *
 * State Shape:
 * {
 *   cart: {
 *     id: string,
 *     items: Item[],
 *     totals: {
 *       subtotal: number,
 *       tax: number,
 *       shipping: number,
 *       total: number
 *     },
 *     isEmpty: boolean
 *   },
 *   auth: {
 *     isAuthenticated: boolean,
 *     userId: string,
 *     token: string
 *   },
 *   loading: boolean,
 *   error: Error | null,
 *   ui: {
 *     miniCartOpen: boolean,
 *     addToCartLoading: object (by product ID)
 *   }
 * }
 */

import { hclAuthService } from './hcl-commerce-auth.js';
import { hclCommerceAPI } from './hcl-commerce-api.js';

// Initial state
const initialState = {
  cart: {
    id: null,
    items: [],
    totals: {
      subtotal: 0,
      tax: 0,
      shipping: 0,
      total: 0,
    },
    isEmpty: true,
  },
  auth: {
    isAuthenticated: false,
    userId: null,
    token: null,
  },
  loading: false,
  error: null,
  ui: {
    miniCartOpen: false,
    addToCartLoading: {},
  },
};

// Action types
export const ACTIONS = {
  // Cart actions
  SET_CART: 'SET_CART',
  ADD_ITEM: 'ADD_ITEM',
  REMOVE_ITEM: 'REMOVE_ITEM',
  UPDATE_ITEM: 'UPDATE_ITEM',
  CLEAR_CART: 'CLEAR_CART',

  // Auth actions
  LOGIN: 'LOGIN',
  LOGOUT: 'LOGOUT',
  SET_AUTH: 'SET_AUTH',

  // Loading/Error
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',

  // UI actions
  TOGGLE_MINI_CART: 'TOGGLE_MINI_CART',
  SET_ADD_TO_CART_LOADING: 'SET_ADD_TO_CART_LOADING',
};

/**
 * Reducer function
 */
export function cartReducer(state = initialState, action) {
  switch (action.type) {
    case ACTIONS.SET_CART:
      return {
        ...state,
        cart: {
          id: action.payload.id,
          items: action.payload.items || [],
          totals: action.payload.totals || {},
          isEmpty: !action.payload.items || action.payload.items.length === 0,
        },
        loading: false,
        error: null,
      };

    case ACTIONS.ADD_ITEM:
      return {
        ...state,
        cart: {
          ...state.cart,
          items: [...state.cart.items, action.payload],
          isEmpty: false,
        },
        ui: {
          ...state.ui,
          addToCartLoading: {
            ...state.ui.addToCartLoading,
            [action.payload.partNumber]: false,
          },
        },
      };

    case ACTIONS.REMOVE_ITEM:
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.filter(
            (item) => item.id !== action.payload.itemId
          ),
          isEmpty:
            state.cart.items.filter((item) => item.id !== action.payload.itemId)
              .length === 0,
        },
      };

    case ACTIONS.UPDATE_ITEM:
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.map((item) =>
            item.id === action.payload.itemId
              ? { ...item, quantity: action.payload.quantity }
              : item
          ),
        },
      };

    case ACTIONS.CLEAR_CART:
      return {
        ...state,
        cart: {
          ...initialState.cart,
        },
      };

    case ACTIONS.SET_AUTH:
      return {
        ...state,
        auth: {
          isAuthenticated: true,
          userId: action.payload.userId,
          token: action.payload.token,
        },
      };

    case ACTIONS.LOGOUT:
      return {
        ...state,
        auth: initialState.auth,
        cart: initialState.cart,
      };

    case ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };

    case ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    case ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };

    case ACTIONS.TOGGLE_MINI_CART:
      return {
        ...state,
        ui: {
          ...state.ui,
          miniCartOpen: !state.ui.miniCartOpen,
        },
      };

    case ACTIONS.SET_ADD_TO_CART_LOADING:
      return {
        ...state,
        ui: {
          ...state.ui,
          addToCartLoading: {
            ...state.ui.addToCartLoading,
            [action.payload.partNumber]: action.payload.loading,
          },
        },
      };

    default:
      return state;
  }
}

/**
 * Redux-compatible store with context/hooks
 */
class CartStore {
  constructor() {
    this.state = initialState;
    this.listeners = new Set();
  }

  getState() {
    return this.state;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispatch(action) {
    this.state = cartReducer(this.state, action);
    this.listeners.forEach((listener) => listener(this.state));
    return action;
  }

  // Thunk-like actions
  async login(username, password) {
    this.dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const result = await hclAuthService.login(username, password);
      this.dispatch({
        type: ACTIONS.SET_AUTH,
        payload: {
          userId: result.userId,
          token: result.token,
        },
      });
      return result;
    } catch (error) {
      this.dispatch({
        type: ACTIONS.SET_ERROR,
        payload: error,
      });
      throw error;
    }
  }

  async logout() {
    hclAuthService.logout();
    this.dispatch({ type: ACTIONS.LOGOUT });
  }

  async loadCart() {
    this.dispatch({ type: ACTIONS.SET_LOADING, payload: true });
    try {
      const result = await hclCommerceAPI.getCart();
      this.dispatch({
        type: ACTIONS.SET_CART,
        payload: {
          id: result.cartId,
          items: result.items,
          totals: {
            subtotal: result.cart?.orderTotals?.subtotal || 0,
            tax: result.cart?.orderTotals?.tax || 0,
            shipping: result.cart?.orderTotals?.shipping || 0,
            total: result.cart?.orderTotals?.total || 0,
          },
        },
      });
      return result;
    } catch (error) {
      this.dispatch({
        type: ACTIONS.SET_ERROR,
        payload: error,
      });
      throw error;
    }
  }

  async addToCart(partNumber, quantity = 1) {
    this.dispatch({
      type: ACTIONS.SET_ADD_TO_CART_LOADING,
      payload: { partNumber, loading: true },
    });

    try {
      const result = await hclCommerceAPI.addToCart(partNumber, quantity);
      await this.loadCart(); // Refresh cart
      return result;
    } catch (error) {
      this.dispatch({
        type: ACTIONS.SET_ERROR,
        payload: error,
      });
      throw error;
    }
  }

  async removeFromCart(orderId, itemId) {
    try {
      const result = await hclCommerceAPI.removeFromCart(orderId, itemId);
      this.dispatch({
        type: ACTIONS.REMOVE_ITEM,
        payload: { itemId },
      });
      return result;
    } catch (error) {
      this.dispatch({
        type: ACTIONS.SET_ERROR,
        payload: error,
      });
      throw error;
    }
  }

  toggleMiniCart() {
    this.dispatch({ type: ACTIONS.TOGGLE_MINI_CART });
  }

  clearError() {
    this.dispatch({ type: ACTIONS.CLEAR_ERROR });
  }
}

// Export singleton store
export const cartStore = new CartStore();

/**
 * React Hook for cart state
 * Usage:
 *   const [state, dispatch] = useCartState();
 */
export function useCartState() {
  const [state, setState] = window.React?.useState(
    cartStore.getState()
  ) || [cartStore.getState()];

  window.React?.useEffect?.(() => {
    const unsubscribe = cartStore.subscribe((newState) => {
      setState(newState);
    });
    return unsubscribe;
  }, []);

  return [state, (action) => cartStore.dispatch(action)];
}

/**
 * Helper hooks for common operations
 */
export function useCart() {
  const [state] = useCartState();
  return state.cart;
}

export function useAuth() {
  const [state] = useCartState();
  return state.auth;
}

export function useCartError() {
  const [state, dispatch] = useCartState();
  return [state.error, () => dispatch({ type: ACTIONS.CLEAR_ERROR })];
}

export function useAddToCart() {
  const [, dispatch] = useCartState();
  return (partNumber, quantity) => {
    dispatch({
      type: ACTIONS.SET_ADD_TO_CART_LOADING,
      payload: { partNumber, loading: true },
    });
    return cartStore.addToCart(partNumber, quantity).catch(() => {
      dispatch({
        type: ACTIONS.SET_ADD_TO_CART_LOADING,
        payload: { partNumber, loading: false },
      });
    });
  };
}
