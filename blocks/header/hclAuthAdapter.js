/**
 * HCL Commerce Auth Adapter
 * 
 * Intercepts drop-in auth API calls and routes them to HCL REST API
 * instead of the default Adobe Commerce GraphQL API.
 * 
 * This allows us to use the beautiful drop-in auth UI (modal, forms, validation)
 * while authenticating against HCL Commerce backend.
 */

import * as authApi from '@dropins/storefront-auth/api.js';

// Store original auth API methods before overriding
const originalAuthApi = { ...authApi };

/**
 * Override the authenticateCustomer method to use HCL REST API
 * Called when user submits login form in the modal
 */
authApi.authenticateCustomer = async (email, password) => {
  try {
    console.log('[HCL-AUTH-ADAPTER] authenticateCustomer called', { email });

    // Call your backend proxy which connects to HCL
    const response = await fetch('/api/hcl/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: email, // HCL uses username, not email
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Authentication failed: ${response.status}`);
    }

    const data = await response.json();

    console.log('[HCL-AUTH-ADAPTER] Login successful', { email });

    // Store token in session storage (same as Adobe Commerce would do)
    if (data.token) {
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('customer_email', email);
    }

    // Return success response in format expected by drop-in auth
    return {
      customer: {
        email,
        firstname: data.firstName || '',
        lastname: data.lastName || '',
      },
      token: data.token,
    };
  } catch (error) {
    console.error('[HCL-AUTH-ADAPTER] Login failed:', error);
    throw new Error(error.message || 'Authentication failed. Please try again.');
  }
};

/**
 * Override the createCustomer method to use HCL REST API
 * Called when user submits sign-up form in the modal
 */
authApi.createCustomer = async (customer, password) => {
  try {
    console.log('[HCL-AUTH-ADAPTER] createCustomer called', { 
      email: customer.email,
      firstname: customer.firstname,
    });

    // Call your backend proxy which connects to HCL
    const response = await fetch('/api/hcl/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: customer.email,
        firstName: customer.firstname,
        lastName: customer.lastname,
        password,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `Registration failed: ${response.status}`);
    }

    const data = await response.json();

    console.log('[HCL-AUTH-ADAPTER] Registration successful', { email: customer.email });

    // Store token in session storage
    if (data.token) {
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('customer_email', customer.email);
    }

    // Return success response in format expected by drop-in auth
    return {
      customer: {
        email: customer.email,
        firstname: customer.firstname,
        lastname: customer.lastname,
      },
      token: data.token,
    };
  } catch (error) {
    console.error('[HCL-AUTH-ADAPTER] Registration failed:', error);
    throw new Error(error.message || 'Registration failed. Please try again.');
  }
};

/**
 * Override getCustomerToken to retrieve stored token from sessionStorage
 */
authApi.getCustomerToken = async () => {
  const token = sessionStorage.getItem('auth_token');
  if (token) {
    return token;
  }
  return null;
};

/**
 * Override revokeCustomerToken to clear session
 */
authApi.revokeCustomerToken = async () => {
  sessionStorage.removeItem('auth_token');
  sessionStorage.removeItem('customer_email');
  return true;
};

/**
 * Override fetchCustomer to retrieve customer data from backend
 */
authApi.fetchCustomer = async () => {
  try {
    const token = sessionStorage.getItem('auth_token');
    const email = sessionStorage.getItem('customer_email');

    if (!token || !email) {
      return null;
    }

    // Optionally fetch customer details from backend
    const response = await fetch('/api/hcl/customer', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('customer_email');
        return null;
      }
      throw new Error(`Failed to fetch customer: ${response.status}`);
    }

    const customer = await response.json();
    return customer;
  } catch (error) {
    console.error('[HCL-AUTH-ADAPTER] fetchCustomer failed:', error);
    return null;
  }
};

export { authApi };
