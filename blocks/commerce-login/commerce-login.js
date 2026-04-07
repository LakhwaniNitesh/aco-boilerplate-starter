/**/* eslint-disable import/no-unresolved */

 * Commerce Login Block - Adobe EDS Storefront/* eslint-disable import/no-extraneous-dependencies */

 * import { SignIn } from '@dropins/storefront-auth/containers/SignIn.js';

 * Provides authentication UI for HCL Commerce wcToken management.import { render as authRenderer } from '@dropins/storefront-auth/render.js';

 * Implements login form and logout button with session persistence.import { checkIsAuthenticated } from '../../scripts/configs.js';

 * import { CUSTOMER_FORGOTPASSWORD_PATH, CUSTOMER_ACCOUNT_PATH } from '../../scripts/constants.js';

 * Features:import { rootLink } from '../../scripts/scripts.js';

 * - Login with username/password

 * - Store wcToken in sessionStorage// Initialize

 * - Display logged-in user informationimport '../../scripts/initializers/auth.js';

 * - Logout with token invalidation

 * - Error message displayexport default async function decorate(block) {

 * - Custom events for other components  if (checkIsAuthenticated()) {

 *     window.location.href = rootLink(CUSTOMER_ACCOUNT_PATH);

 * Usage in AEM:  } else {

 * Create a new page section with block type "commerce-login"    await authRenderer.render(SignIn, {

 * No configuration needed - uses sessionStorage automatically      routeForgotPassword: () => rootLink(CUSTOMER_FORGOTPASSWORD_PATH),

 *       routeRedirectOnSignIn: () => rootLink(CUSTOMER_ACCOUNT_PATH),

 * Usage in HTML:    })(block);

 * <div class="commerce-login"></div>  }

 */}


export default async function decorate(block) {
  // ====================================
  // 1. CHECK IF USER IS ALREADY LOGGED IN
  // ====================================
  
  const wcToken = getStoredToken();
  
  if (wcToken && !isTokenExpired()) {
    // User has valid token - show logout UI
    renderLogoutUI(block);
  } else {
    // No token or expired - show login form
    if (wcToken && isTokenExpired()) {
      clearStoredToken(); // Clean up expired token
    }
    renderLoginUI(block);
  }
}

/**
 * Get stored wcToken from sessionStorage
 */
function getStoredToken() {
  try {
    return sessionStorage.getItem('hcl_wcToken');
  } catch (e) {
    console.warn('[LOGIN-BLOCK] sessionStorage not available:', e);
    return null;
  }
}

/**
 * Check if token has expired
 */
function isTokenExpired() {
  try {
    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);
    if (!expiresAt || isNaN(expiresAt)) {
      return true; // No expiry set, consider expired
    }
    return Date.now() > expiresAt;
  } catch (e) {
    console.warn('[LOGIN-BLOCK] Error checking expiry:', e);
    return true;
  }
}

/**
 * Clear all stored authentication data
 */
function clearStoredToken() {
  try {
    sessionStorage.removeItem('hcl_wcToken');
    sessionStorage.removeItem('hcl_userId');
    sessionStorage.removeItem('hcl_displayName');
    sessionStorage.removeItem('hcl_firstName');
    sessionStorage.removeItem('hcl_lastName');
    sessionStorage.removeItem('hcl_email');
    sessionStorage.removeItem('hcl_tokenExpires');
  } catch (e) {
    console.warn('[LOGIN-BLOCK] Error clearing tokens:', e);
  }
}

/**
 * Store authentication data in sessionStorage
 */
function storeAuthData(authResponse) {
  try {
    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);
    sessionStorage.setItem('hcl_userId', authResponse.userId);
    sessionStorage.setItem('hcl_displayName', authResponse.displayName || authResponse.email);
    sessionStorage.setItem('hcl_firstName', authResponse.firstName || '');
    sessionStorage.setItem('hcl_lastName', authResponse.lastName || '');
    sessionStorage.setItem('hcl_email', authResponse.email || '');
    
    // Calculate expiry time (current time + expiresIn seconds)
    const expiresAt = Date.now() + ((authResponse.expiresIn || 3600) * 1000);
    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());
  } catch (e) {
    console.error('[LOGIN-BLOCK] Error storing auth data:', e);
  }
}

/**
 * Dispatch custom event for other components to listen
 */
function dispatchAuthEvent(eventType, data = {}) {
  const eventName = eventType === 'login' ? 'hcl-user-logged-in' : 'hcl-user-logged-out';
  const event = new CustomEvent(eventName, {
    detail: {
      timestamp: Date.now(),
      ...data,
    },
  });
  window.dispatchEvent(event);
  console.log(`[LOGIN-BLOCK] Event dispatched: ${eventName}`);
}

/**
 * RENDER LOGIN FORM
 * Shows when user is not authenticated
 */
function renderLoginUI(block) {
  block.innerHTML = `
    <div class="commerce-login-container login-form">
      <div class="login-header">
        <h2>Sign In</h2>
        <p>Enter your username and password</p>
      </div>
      
      <form class="login-form-element" id="login-form">
        <div class="form-group">
          <label for="username-input">
            <span class="label-text">Username</span>
            <span class="required">*</span>
          </label>
          <input 
            type="text" 
            id="username-input" 
            name="username" 
            class="form-control"
            required 
            placeholder="Enter your username"
            autocomplete="username"
            aria-label="Username"
            aria-required="true"
          >
        </div>
        
        <div class="form-group">
          <label for="password-input">
            <span class="label-text">Password</span>
            <span class="required">*</span>
          </label>
          <input 
            type="password" 
            id="password-input" 
            name="password" 
            class="form-control"
            required 
            placeholder="Enter your password"
            autocomplete="current-password"
            aria-label="Password"
            aria-required="true"
          >
        </div>
        
        <div id="error-message" class="error-message" role="alert" aria-live="polite" aria-atomic="true"></div>
        <div id="loading-message" class="loading-message" role="status" aria-live="polite" aria-atomic="true"></div>
        
        <button type="submit" class="btn btn-primary btn-login" id="login-button">
          <span class="button-text">Sign In</span>
          <span class="loading-spinner" style="display: none;">...</span>
        </button>
      </form>
      
      <div class="login-footer">
        <p class="test-users-info">
          <small>Test users: auroraadobetest, adobetest1, adobetest2 (all with password: passw0rd)</small>
        </p>
      </div>
    </div>
  `;

  // Attach event listeners
  attachLoginFormListeners(block);
}

/**
 * Attach event listeners to login form
 */
function attachLoginFormListeners(block) {
  const form = block.querySelector('#login-form');
  const usernameInput = block.querySelector('#username-input');
  const passwordInput = block.querySelector('#password-input');
  const errorDiv = block.querySelector('#error-message');
  const loadingDiv = block.querySelector('#loading-message');
  const submitButton = block.querySelector('#login-button');

  // Clear error on input
  usernameInput.addEventListener('input', () => {
    errorDiv.innerHTML = '';
  });
  passwordInput.addEventListener('input', () => {
    errorDiv.innerHTML = '';
  });

  // Form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Basic validation
    if (!username || !password) {
      errorDiv.innerHTML = '<span class="error-text">Please enter both username and password</span>';
      return;
    }

    try {
      // Show loading state
      submitButton.disabled = true;
      submitButton.classList.add('loading');
      loadingDiv.innerHTML = '<span class="loading-text">Signing in...</span>';
      loadingDiv.style.display = 'block';
      errorDiv.innerHTML = '';

      // Call login endpoint
      const response = await fetch('/api/hcl/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!data.success) {
        // Login failed
        console.error('[LOGIN-BLOCK] Login failed:', data.error);
        errorDiv.innerHTML = `<span class="error-text">Error: ${data.error}</span>`;
        submitButton.disabled = false;
        submitButton.classList.remove('loading');
        loadingDiv.innerHTML = '';
        loadingDiv.style.display = 'none';
        return;
      }

      // Login successful - store token and update UI
      console.log(`[LOGIN-BLOCK] Login successful for: ${data.displayName}`);
      storeAuthData(data);
      
      // Dispatch event
      dispatchAuthEvent('login', {
        userId: data.userId,
        displayName: data.displayName,
        email: data.email,
      });

      // Clear form and reload UI
      form.reset();
      loadingDiv.innerHTML = '';
      loadingDiv.style.display = 'none';
      
      // Small delay before rendering logout UI
      setTimeout(() => {
        renderLogoutUI(block);
      }, 500);

    } catch (error) {
      console.error('[LOGIN-BLOCK] Login error:', error);
      errorDiv.innerHTML = `<span class="error-text">Error: ${error.message}</span>`;
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
      loadingDiv.innerHTML = '';
      loadingDiv.style.display = 'none';
    }
  });

  // Focus management
  usernameInput.focus();
}

/**
 * RENDER LOGOUT UI
 * Shows when user is authenticated
 */
function renderLogoutUI(parentElement) {
  const displayName = sessionStorage.getItem('hcl_displayName') || 'User';
  const email = sessionStorage.getItem('hcl_email') || '';
  
  // Find or create container if parentElement is the block
  let container = parentElement.classList?.contains('commerce-login') 
    ? parentElement 
    : parentElement.querySelector('.commerce-login');
  
  if (!container) {
    container = parentElement;
  }

  container.innerHTML = `
    <div class="commerce-login-container logout-container">
      <div class="user-info">
        <div class="user-greeting">
          <p class="greeting-text">Welcome back!</p>
          <p class="user-name">${escapeHtml(displayName)}</p>
          ${email ? `<p class="user-email">${escapeHtml(email)}</p>` : ''}
        </div>
        
        <button class="btn btn-secondary btn-logout" id="logout-button">
          <span class="button-text">Sign Out</span>
        </button>
      </div>
    </div>
  `;

  // Attach logout listener
  attachLogoutListener(container);
}

/**
 * Attach event listener to logout button
 */
function attachLogoutListener(container) {
  const logoutButton = container.querySelector('#logout-button');

  logoutButton.addEventListener('click', async () => {
    try {
      logoutButton.disabled = true;
      logoutButton.classList.add('loading');

      const wcToken = sessionStorage.getItem('hcl_wcToken');

      // Call logout endpoint
      if (wcToken) {
        await fetch('/api/hcl/logout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wcToken }),
        });
      }

      console.log('[LOGIN-BLOCK] Logout successful');
      
      // Clear sessionStorage
      clearStoredToken();

      // Dispatch event
      dispatchAuthEvent('logout');

      // Show login form again
      renderLoginUI(container);

    } catch (error) {
      console.error('[LOGIN-BLOCK] Logout error:', error);
      logoutButton.disabled = false;
      logoutButton.classList.remove('loading');
      alert('Logout failed. Please try again.');
    }
  });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Monitor token expiry and handle expiration
 * This can be called once per page load
 */
function startTokenExpiryMonitor() {
  const checkInterval = setInterval(() => {
    if (isTokenExpired()) {
      clearInterval(checkInterval);
      clearStoredToken();
      
      // Dispatch expiry event
      const event = new CustomEvent('hcl-token-expired');
      window.dispatchEvent(event);
      
      console.log('[LOGIN-BLOCK] Token expired, user logged out');
      
      // Find and update login block if it exists
      const loginBlock = document.querySelector('.commerce-login');
      if (loginBlock) {
        renderLoginUI(loginBlock);
      }
    }
  }, 60000); // Check every minute
  
  // Clear interval on unload
  window.addEventListener('beforeunload', () => {
    clearInterval(checkInterval);
  });
}

// Start monitoring token expiry
if (typeof window !== 'undefined') {
  startTokenExpiryMonitor();
}
