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
    console.log('[HCL-AUTH-ADAPTER] Response data:', JSON.stringify(data, null, 2));

    // Store token in session storage (same as Adobe Commerce would do)
    if (data.token) {
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('customer_email', email);
    }

    // CRITICAL: Also store session cookies from HCL backend
    if (data.sessionCookies) {
      console.log('[HCL-AUTH-ADAPTER] Storing session cookies:', data.sessionCookies);
      const hclAuthData = {
        token: data.token,
        userId: data.userId,
        sessionCookies: data.sessionCookies,
        storedAt: Date.now(),
      };
      console.log('[HCL-AUTH-ADAPTER] Full data being stored to sessionStorage.hcl_auth:', JSON.stringify(hclAuthData, null, 2));
      sessionStorage.setItem('hcl_auth', JSON.stringify(hclAuthData));
      
      // Verify it was stored
      const verification = sessionStorage.getItem('hcl_auth');
      console.log('[HCL-AUTH-ADAPTER] Verification - data from sessionStorage:', verification);
    } else {
      console.warn('[HCL-AUTH-ADAPTER] ⚠ No sessionCookies in login response!');
      console.warn('[HCL-AUTH-ADAPTER] Response keys:', Object.keys(data));
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

export { authApi };
