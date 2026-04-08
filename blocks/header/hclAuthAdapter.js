/**
 * HCL Commerce Auth Adapter
 * 
 * Intercepts drop-in auth API calls and routes them to HCL REST API
 * instead of the default Adobe Commerce GraphQL API.
 * 
 * Uses event-based interception pattern (proper for ES modules)
 * instead of trying to mutate imported modules (which is forbidden).
 */

import { events } from '@dropins/tools/event-bus.js';

/**
 * Intercept authentication via event bus
 * When drop-in auth sends an authentication request, we catch it here
 * and redirect to our HCL REST API endpoint
 */

// Store the original fetch to avoid infinite loops
const originalFetch = window.fetch;

// Flag to track if we're in an auth flow to avoid intercepting unrelated requests
let isAuthInProgress = false;

/**
 * Monkey-patch fetch to intercept auth API calls
 * This is the proper way to intercept in ES modules
 */
window.fetch = async function(...args) {
  const [resource, config] = args;
  
  // Check if this is a call to our /api/hcl/login endpoint
  const isHclLoginRequest = typeof resource === 'string' && 
                            resource.includes('/api/hcl/login') && 
                            config?.method === 'POST';
  
  if (isHclLoginRequest) {
    console.log('[HCL-AUTH-ADAPTER] Intercepted /api/hcl/login request');
    
    // Call original fetch to hit the backend
    const response = await originalFetch.apply(window, args);
    
    // Clone the response so we can read it and still return it
    const responseClone = response.clone();
    
    try {
      const responseData = await response.json();
      console.log('[HCL-AUTH-ADAPTER] /api/hcl/login response received');
      console.log('[HCL-AUTH-ADAPTER] Response has sessionCookies:', !!responseData.sessionCookies);
      
      // CRITICAL: If response has sessionCookies, store them immediately
      if (responseData.sessionCookies) {
        console.log('[HCL-AUTH-ADAPTER] ✓ Found sessionCookies in response, storing to sessionStorage');
        const hclAuthData = {
          token: responseData.token || responseData.accessToken || responseData.wcToken,
          userId: responseData.userId,
          sessionCookies: responseData.sessionCookies,
          storedAt: Date.now(),
        };
        console.log('[HCL-AUTH-ADAPTER] Full auth data:', JSON.stringify(hclAuthData, null, 2));
        sessionStorage.setItem('hcl_auth', JSON.stringify(hclAuthData));
        
        // Verify storage
        const stored = sessionStorage.getItem('hcl_auth');
        console.log('[HCL-AUTH-ADAPTER] ✓ Verification - stored to sessionStorage:', !!stored);
      } else {
        console.warn('[HCL-AUTH-ADAPTER] ⚠ No sessionCookies found in response');
        console.log('[HCL-AUTH-ADAPTER] Response keys:', Object.keys(responseData));
      }
    } catch (e) {
      console.warn('[HCL-AUTH-ADAPTER] Error parsing response:', e);
    }
    
    // Return the original response (not the clone)
    return responseClone;
  }

  // For all other requests, use original fetch
  return originalFetch.apply(window, args);
};
