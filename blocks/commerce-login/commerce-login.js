/**/**/* eslint-disable import/no-unresolved */

 * Commerce Login Block - HCL Commerce Authentication

 * Provides authentication UI for HCL Commerce wcToken management * Commerce Login Block - Adobe EDS Storefront/* eslint-disable import/no-extraneous-dependencies */

 *

 * Features: * import { SignIn } from '@dropins/storefront-auth/containers/SignIn.js';

 * - Login with username/password

 * - Store wcToken in sessionStorage * Provides authentication UI for HCL Commerce wcToken management.import { render as authRenderer } from '@dropins/storefront-auth/render.js';

 * - Display logged-in user information

 * - Logout with token invalidation * Implements login form and logout button with session persistence.import { checkIsAuthenticated } from '../../scripts/configs.js';

 * - Error message display

 * - Custom events for other components * import { CUSTOMER_FORGOTPASSWORD_PATH, CUSTOMER_ACCOUNT_PATH } from '../../scripts/constants.js';

 *

 * Usage in HTML: * Features:import { rootLink } from '../../scripts/scripts.js';

 * <div class="commerce-login"></div>

 */ * - Login with username/password



export default async function decorate(block) { * - Store wcToken in sessionStorage// Initialize

  // Check if user is already logged in

  const wcToken = getStoredToken(); * - Display logged-in user informationimport '../../scripts/initializers/auth.js';



  if (wcToken && !isTokenExpired()) { * - Logout with token invalidation

    // User has valid token - show logout UI

    renderLogoutUI(block); * - Error message displayexport default async function decorate(block) {

  } else {

    // No token or expired - show login form * - Custom events for other components  if (checkIsAuthenticated()) {

    if (wcToken && isTokenExpired()) {

      clearStoredToken(); // Clean up expired token *     window.location.href = rootLink(CUSTOMER_ACCOUNT_PATH);

    }

    renderLoginUI(block); * Usage in AEM:  } else {

  }

} * Create a new page section with block type "commerce-login"    await authRenderer.render(SignIn, {



/** * No configuration needed - uses sessionStorage automatically      routeForgotPassword: () => rootLink(CUSTOMER_FORGOTPASSWORD_PATH),

 * Get stored wcToken from sessionStorage

 */ *       routeRedirectOnSignIn: () => rootLink(CUSTOMER_ACCOUNT_PATH),

function getStoredToken() {

  try { * Usage in HTML:    })(block);

    return sessionStorage.getItem('hcl_wcToken');

  } catch (e) { * <div class="commerce-login"></div>  }

    console.warn('[LOGIN-BLOCK] sessionStorage not available:', e);

    return null; */}

  }

}

export default async function decorate(block) {

/**  // ====================================

 * Check if token has expired  // 1. CHECK IF USER IS ALREADY LOGGED IN

 */  // ====================================

function isTokenExpired() {  

  try {  const wcToken = getStoredToken();

    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);  

    if (!expiresAt) return true;  if (wcToken && !isTokenExpired()) {

    return Date.now() >= expiresAt;    // User has valid token - show logout UI

  } catch (e) {    renderLogoutUI(block);

    return true;  } else {

  }    // No token or expired - show login form

}    if (wcToken && isTokenExpired()) {

      clearStoredToken(); // Clean up expired token

/**    }

 * Clear all stored authentication data    renderLoginUI(block);

 */  }

function clearStoredToken() {}

  try {

    sessionStorage.removeItem('hcl_wcToken');/**

    sessionStorage.removeItem('hcl_userId'); * Get stored wcToken from sessionStorage

    sessionStorage.removeItem('hcl_displayName'); */

    sessionStorage.removeItem('hcl_firstName');function getStoredToken() {

    sessionStorage.removeItem('hcl_lastName');  try {

    sessionStorage.removeItem('hcl_email');    return sessionStorage.getItem('hcl_wcToken');

    sessionStorage.removeItem('hcl_tokenExpires');  } catch (e) {

  } catch (e) {    console.warn('[LOGIN-BLOCK] sessionStorage not available:', e);

    console.warn('[LOGIN-BLOCK] Error clearing storage:', e);    return null;

  }  }

}}



/**/**

 * Store authentication data in sessionStorage * Check if token has expired

 */ */

function storeAuthData(authResponse) {function isTokenExpired() {

  try {  try {

    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);

    sessionStorage.setItem('hcl_userId', authResponse.userId);    if (!expiresAt || isNaN(expiresAt)) {

    sessionStorage.setItem('hcl_displayName', authResponse.displayName || authResponse.email);      return true; // No expiry set, consider expired

    sessionStorage.setItem('hcl_firstName', authResponse.firstName || '');    }

    sessionStorage.setItem('hcl_lastName', authResponse.lastName || '');    return Date.now() > expiresAt;

    sessionStorage.setItem('hcl_email', authResponse.email || '');  } catch (e) {

    console.warn('[LOGIN-BLOCK] Error checking expiry:', e);

    // Calculate expiry time    return true;

    const expiresIn = authResponse.expiresIn || 1500; // 25 minutes default  }

    const expiresAt = Date.now() + (expiresIn * 1000);}

    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());

/**

    console.log('[LOGIN-BLOCK] Auth data stored, token expires in', expiresIn, 'seconds'); * Clear all stored authentication data

  } catch (e) { */

    console.warn('[LOGIN-BLOCK] Error storing auth data:', e);function clearStoredToken() {

  }  try {

}    sessionStorage.removeItem('hcl_wcToken');

    sessionStorage.removeItem('hcl_userId');

/**    sessionStorage.removeItem('hcl_displayName');

 * Dispatch custom event for other components to listen to    sessionStorage.removeItem('hcl_firstName');

 */    sessionStorage.removeItem('hcl_lastName');

function dispatchAuthEvent(eventType, data) {    sessionStorage.removeItem('hcl_email');

  try {    sessionStorage.removeItem('hcl_tokenExpires');

    const event = new CustomEvent(eventType, {  } catch (e) {

      detail: data,    console.warn('[LOGIN-BLOCK] Error clearing tokens:', e);

      bubbles: true,  }

      cancelable: true,}

    });

    document.dispatchEvent(event);/**

    console.log('[LOGIN-BLOCK] Dispatched event:', eventType); * Store authentication data in sessionStorage

  } catch (e) { */

    console.warn('[LOGIN-BLOCK] Error dispatching event:', e);function storeAuthData(authResponse) {

  }  try {

}    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);

    sessionStorage.setItem('hcl_userId', authResponse.userId);

/**    sessionStorage.setItem('hcl_displayName', authResponse.displayName || authResponse.email);

 * Render login form UI    sessionStorage.setItem('hcl_firstName', authResponse.firstName || '');

 */    sessionStorage.setItem('hcl_lastName', authResponse.lastName || '');

function renderLoginUI(block) {    sessionStorage.setItem('hcl_email', authResponse.email || '');

  block.innerHTML = '';    

    // Calculate expiry time (current time + expiresIn seconds)

  const form = document.createElement('form');    const expiresAt = Date.now() + ((authResponse.expiresIn || 3600) * 1000);

  form.className = 'commerce-login__form';    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());

  form.innerHTML = `  } catch (e) {

    <div class="commerce-login__container">    console.error('[LOGIN-BLOCK] Error storing auth data:', e);

      <h1 class="commerce-login__title">Sign In</h1>  }

      }

      <div class="commerce-login__errors" id="login-errors" style="display: none;"></div>

/**

      <div class="commerce-login__field"> * Dispatch custom event for other components to listen

        <label for="login-username" class="commerce-login__label">Username</label> */

        <inputfunction dispatchAuthEvent(eventType, data = {}) {

          type="text"  const eventName = eventType === 'login' ? 'hcl-user-logged-in' : 'hcl-user-logged-out';

          id="login-username"  const event = new CustomEvent(eventName, {

          class="commerce-login__input"    detail: {

          placeholder="Enter your username"      timestamp: Date.now(),

          required      ...data,

          autocomplete="username"    },

        />  });

      </div>  window.dispatchEvent(event);

  console.log(`[LOGIN-BLOCK] Event dispatched: ${eventName}`);

      <div class="commerce-login__field">}

        <label for="login-password" class="commerce-login__label">Password</label>

        <input/**

          type="password" * RENDER LOGIN FORM

          id="login-password" * Shows when user is not authenticated

          class="commerce-login__input" */

          placeholder="Enter your password"function renderLoginUI(block) {

          required  block.innerHTML = `

          autocomplete="current-password"    <div class="commerce-login-container login-form">

        />      <div class="login-header">

      </div>        <h2>Sign In</h2>

        <p>Enter your username and password</p>

      <button type="submit" class="commerce-login__button">Sign In</button>      </div>

      

      <div class="commerce-login__spinner" id="login-spinner" style="display: none;">      <form class="login-form-element" id="login-form">

        <div class="spinner"></div>        <div class="form-group">

        <span>Signing in...</span>          <label for="username-input">

      </div>            <span class="label-text">Username</span>

    </div>            <span class="required">*</span>

  `;          </label>

          <input 

  // Attach event listeners            type="text" 

  attachLoginFormListeners(form, block);            id="username-input" 

  block.appendChild(form);            name="username" 

            class="form-control"

  // Start token expiry monitor            required 

  startTokenExpiryMonitor();            placeholder="Enter your username"

}            autocomplete="username"

            aria-label="Username"

/**            aria-required="true"

 * Attach login form event listeners          >

 */        </div>

function attachLoginFormListeners(form, block) {        

  const usernameInput = form.querySelector('#login-username');        <div class="form-group">

  const passwordInput = form.querySelector('#login-password');          <label for="password-input">

  const submitBtn = form.querySelector('.commerce-login__button');            <span class="label-text">Password</span>

  const spinner = form.querySelector('#login-spinner');            <span class="required">*</span>

  const errorsDiv = form.querySelector('#login-errors');          </label>

          <input 

  form.addEventListener('submit', async (e) => {            type="password" 

    e.preventDefault();            id="password-input" 

            name="password" 

    const username = usernameInput.value.trim();            class="form-control"

    const password = passwordInput.value.trim();            required 

            placeholder="Enter your password"

    // Clear previous errors            autocomplete="current-password"

    errorsDiv.style.display = 'none';            aria-label="Password"

    errorsDiv.innerHTML = '';            aria-required="true"

          >

    // Validate        </div>

    if (!username || !password) {        

      showError(errorsDiv, 'Please enter both username and password');        <div id="error-message" class="error-message" role="alert" aria-live="polite" aria-atomic="true"></div>

      return;        <div id="loading-message" class="loading-message" role="status" aria-live="polite" aria-atomic="true"></div>

    }        

        <button type="submit" class="btn btn-primary btn-login" id="login-button">

    // Show spinner          <span class="button-text">Sign In</span>

    submitBtn.style.display = 'none';          <span class="loading-spinner" style="display: none;">...</span>

    spinner.style.display = 'flex';        </button>

      </form>

    try {      

      console.log('[LOGIN-BLOCK] Attempting login for user:', username);      <div class="login-footer">

        <p class="test-users-info">

      // Call login API          <small>Test users: auroraadobetest, adobetest1, adobetest2 (all with password: passw0rd)</small>

      const response = await fetch('/api/hcl/login', {        </p>

        method: 'POST',      </div>

        headers: {    </div>

          'Content-Type': 'application/json',  `;

        },

        body: JSON.stringify({  // Attach event listeners

          username,  attachLoginFormListeners(block);

          password,}

        }),

      });/**

 * Attach event listeners to login form

      const data = await response.json(); */

      console.log('[LOGIN-BLOCK] Login response:', data);function attachLoginFormListeners(block) {

  const form = block.querySelector('#login-form');

      if (!response.ok || !data.success) {  const usernameInput = block.querySelector('#username-input');

        throw new Error(data.error || 'Login failed');  const passwordInput = block.querySelector('#password-input');

      }  const errorDiv = block.querySelector('#error-message');

  const loadingDiv = block.querySelector('#loading-message');

      // Store token and user data  const submitButton = block.querySelector('#login-button');

      storeAuthData(data);

  // Clear error on input

      // Dispatch login event  usernameInput.addEventListener('input', () => {

      dispatchAuthEvent('hcl-user-logged-in', {    errorDiv.innerHTML = '';

        userId: data.userId,  });

        email: data.email,  passwordInput.addEventListener('input', () => {

        displayName: data.displayName,    errorDiv.innerHTML = '';

      });  });



      // Show success and reload UI  // Form submission

      console.log('[LOGIN-BLOCK] ✓ Login successful');  form.addEventListener('submit', async (e) => {

      renderLogoutUI(block);    e.preventDefault();

    } catch (error) {    

      console.error('[LOGIN-BLOCK] Login error:', error.message);    const username = usernameInput.value.trim();

      showError(errorsDiv, error.message || 'Authentication failed. Please try again.');    const password = passwordInput.value;

      submitBtn.style.display = 'block';

      spinner.style.display = 'none';    // Basic validation

    }    if (!username || !password) {

  });      errorDiv.innerHTML = '<span class="error-text">Please enter both username and password</span>';

}      return;

    }

/**

 * Show error message    try {

 */      // Show loading state

function showError(errorsDiv, message) {      submitButton.disabled = true;

  errorsDiv.innerHTML = `      submitButton.classList.add('loading');

    <div class="commerce-login__error-message">      loadingDiv.innerHTML = '<span class="loading-text">Signing in...</span>';

      <strong>Error:</strong> ${escapeHtml(message)}      loadingDiv.style.display = 'block';

    </div>      errorDiv.innerHTML = '';

  `;

  errorsDiv.style.display = 'block';      // Call login endpoint

}      const response = await fetch('/api/hcl/login', {

        method: 'POST',

/**        headers: {

 * Escape HTML to prevent XSS          'Content-Type': 'application/json',

 */        },

function escapeHtml(text) {        body: JSON.stringify({ username, password }),

  const div = document.createElement('div');      });

  div.textContent = text;

  return div.innerHTML;      const data = await response.json();

}

      if (!data.success) {

/**        // Login failed

 * Render logout UI (logged-in state)        console.error('[LOGIN-BLOCK] Login failed:', data.error);

 */        errorDiv.innerHTML = `<span class="error-text">Error: ${data.error}</span>`;

function renderLogoutUI(block) {        submitButton.disabled = false;

  block.innerHTML = '';        submitButton.classList.remove('loading');

        loadingDiv.innerHTML = '';

  const displayName = sessionStorage.getItem('hcl_displayName');        loadingDiv.style.display = 'none';

  const email = sessionStorage.getItem('hcl_email');        return;

      }

  const container = document.createElement('div');

  container.className = 'commerce-login__logged-in';      // Login successful - store token and update UI

  container.innerHTML = `      console.log(`[LOGIN-BLOCK] Login successful for: ${data.displayName}`);

    <div class="commerce-login__user-info">      storeAuthData(data);

      <h2 class="commerce-login__welcome">Welcome back!</h2>      

      <p class="commerce-login__user-name">${escapeHtml(displayName)}</p>      // Dispatch event

      <p class="commerce-login__user-email">${escapeHtml(email)}</p>      dispatchAuthEvent('login', {

    </div>        userId: data.userId,

    <button class="commerce-login__logout-btn">Sign Out</button>        displayName: data.displayName,

  `;        email: data.email,

      });

  attachLogoutListener(container, block);

  block.appendChild(container);      // Clear form and reload UI

}      form.reset();

      loadingDiv.innerHTML = '';

/**      loadingDiv.style.display = 'none';

 * Attach logout button listener      

 */      // Small delay before rendering logout UI

function attachLogoutListener(container, block) {      setTimeout(() => {

  const logoutBtn = container.querySelector('.commerce-login__logout-btn');        renderLogoutUI(block);

      }, 500);

  logoutBtn.addEventListener('click', async (e) => {

    e.preventDefault();    } catch (error) {

      console.error('[LOGIN-BLOCK] Login error:', error);

    const wcToken = getStoredToken();      errorDiv.innerHTML = `<span class="error-text">Error: ${error.message}</span>`;

    console.log('[LOGIN-BLOCK] Logging out...');      submitButton.disabled = false;

      submitButton.classList.remove('loading');

    // Call logout API (optional - just to invalidate on server)      loadingDiv.innerHTML = '';

    if (wcToken) {      loadingDiv.style.display = 'none';

      try {    }

        await fetch('/api/hcl/logout', {  });

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },  // Focus management

          body: JSON.stringify({ wcToken }),  usernameInput.focus();

        });}

      } catch (e) {

        console.warn('[LOGIN-BLOCK] Logout API call failed:', e);/**

      } * RENDER LOGOUT UI

    } * Shows when user is authenticated

 */

    // Clear local storagefunction renderLogoutUI(parentElement) {

    clearStoredToken();  const displayName = sessionStorage.getItem('hcl_displayName') || 'User';

  const email = sessionStorage.getItem('hcl_email') || '';

    // Dispatch logout event  

    dispatchAuthEvent('hcl-user-logged-out', {});  // Find or create container if parentElement is the block

  let container = parentElement.classList?.contains('commerce-login') 

    // Reset UI to login form    ? parentElement 

    console.log('[LOGIN-BLOCK] ✓ Logged out');    : parentElement.querySelector('.commerce-login');

    renderLoginUI(block);  

  });  if (!container) {

}    container = parentElement;

  }

/**

 * Monitor token expiry and refresh UI when needed  container.innerHTML = `

 */    <div class="commerce-login-container logout-container">

function startTokenExpiryMonitor() {      <div class="user-info">

  setInterval(() => {        <div class="user-greeting">

    const wcToken = getStoredToken();          <p class="greeting-text">Welcome back!</p>

    if (wcToken && isTokenExpired()) {          <p class="user-name">${escapeHtml(displayName)}</p>

      console.log('[LOGIN-BLOCK] Token expired, clearing and refreshing');          ${email ? `<p class="user-email">${escapeHtml(email)}</p>` : ''}

      clearStoredToken();        </div>

      dispatchAuthEvent('hcl-token-expired', {});        

      // Note: Page should refresh or navigate to login page        <button class="btn btn-secondary btn-logout" id="logout-button">

    }          <span class="button-text">Sign Out</span>

  }, 60000); // Check every 60 seconds        </button>

}      </div>

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
