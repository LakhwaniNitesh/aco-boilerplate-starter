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
  
  // Intercept requests to the drop-in auth endpoint
  if (typeof resource === 'string' && resource.includes('/auth') && config?.method === 'POST') {
    try {
      console.log('[HCL-AUTH-ADAPTER] Intercepted auth request to:', resource);
      
      // Parse the request body to see if it's a login request
      const body = config.body ? JSON.parse(config.body) : {};
      
      // If this looks like a login request (has email/username and password)
      if ((body.email || body.username) && body.password) {
        console.log('[HCL-AUTH-ADAPTER] Detected login request for:', body.email || body.username);
        isAuthInProgress = true;
        
        try {
          // Call our HCL login endpoint instead
          const hclResponse = await originalFetch.call(window, '/api/hcl/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: body.email || body.username,
              password: body.password,
            }),
          });

          if (!hclResponse.ok) {
            throw new Error(`HCL Login failed: ${hclResponse.status}`);
          }

          const hclData = await hclResponse.json();
          console.log('[HCL-AUTH-ADAPTER] Login successful from HCL');
          console.log('[HCL-AUTH-ADAPTER] Response data has sessionCookies:', !!hclData.sessionCookies);

          // CRITICAL: Store session cookies to sessionStorage
          if (hclData.sessionCookies) {
            console.log('[HCL-AUTH-ADAPTER] Storing session cookies:', hclData.sessionCookies);
            const hclAuthData = {
              token: hclData.token || hclData.accessToken,
              userId: hclData.userId,
              sessionCookies: hclData.sessionCookies,
              storedAt: Date.now(),
            };
            console.log('[HCL-AUTH-ADAPTER] Full data being stored to sessionStorage.hcl_auth:', JSON.stringify(hclAuthData, null, 2));
            sessionStorage.setItem('hcl_auth', JSON.stringify(hclAuthData));
            
            // Verify it was stored
            const verification = sessionStorage.getItem('hcl_auth');
            console.log('[HCL-AUTH-ADAPTER] Verification - data from sessionStorage:', verification);
          } else {
            console.warn('[HCL-AUTH-ADAPTER] ⚠ No sessionCookies in login response!');
            console.warn('[HCL-AUTH-ADAPTER] Response keys:', Object.keys(hclData));
          }

          // Return response in format expected by drop-in auth
          // Wrap in a Response object so the drop-in gets what it expects
          const responseData = {
            customer: {
              email: body.email || body.username,
              firstname: hclData.firstName || '',
              lastname: hclData.lastName || '',
            },
            token: hclData.token || hclData.accessToken,
          };

          return new Response(JSON.stringify(responseData), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (error) {
          console.error('[HCL-AUTH-ADAPTER] Login failed:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        } finally {
          isAuthInProgress = false;
        }
      }
    } catch (error) {
      console.warn('[HCL-AUTH-ADAPTER] Error intercepting request:', error);
      // Fall through to original fetch if not a login request
    }
  }

  // For all other requests, use original fetch
  return originalFetch.apply(window, args);
};
