/**/* eslint-disable import/no-unresolved *//**/**/* eslint-disable import/no-unresolved */

 * Commerce Login Block - HCL Commerce Authentication

 */



import { rootLink } from '../../scripts/scripts.js';/** * Commerce Login Block - HCL Commerce Authentication



export default async function decorate(block) { * Commerce Login Block - HCL Commerce Authentication

  const wcToken = getStoredToken();

 * * Provides authentication UI for HCL Commerce wcToken management * Commerce Login Block - Adobe EDS Storefront/* eslint-disable import/no-extraneous-dependencies */

  if (wcToken && !isTokenExpired()) {

    renderLogoutUI(block); * Provides a custom login form for HCL Commerce authentication.

  } else {

    if (wcToken && isTokenExpired()) { * Manages wcToken in sessionStorage for authenticated requests. *

      clearStoredToken();

    } *

    renderLoginUI(block);

  } * Features: * Features: * import { SignIn } from '@dropins/storefront-auth/containers/SignIn.js';



  startTokenExpiryMonitor(block); * - Login with username/password

}

 * - Store wcToken in sessionStorage * - Login with username/password

function getStoredToken() {

  try { * - Display logged-in user information

    return sessionStorage.getItem('hcl_wcToken');

  } catch (e) { * - Logout with token invalidation * - Store wcToken in sessionStorage * Provides authentication UI for HCL Commerce wcToken management.import { render as authRenderer } from '@dropins/storefront-auth/render.js';

    console.warn('[LOGIN] sessionStorage not available:', e);

    return null; * - Error message display

  }

} * - Custom events for other components * - Display logged-in user information



function isTokenExpired() { * - Token expiry monitoring

  try {

    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10); * * - Logout with token invalidation * Implements login form and logout button with session persistence.import { checkIsAuthenticated } from '../../scripts/configs.js';

    if (!expiresAt) return true;

    return Date.now() > expiresAt; * Usage in HTML:

  } catch (e) {

    return true; * <div class="commerce-login"></div> * - Error message display

  }

} */



function clearStoredToken() { * - Custom events for other components * import { CUSTOMER_FORGOTPASSWORD_PATH, CUSTOMER_ACCOUNT_PATH } from '../../scripts/constants.js';

  try {

    sessionStorage.removeItem('hcl_wcToken');import { rootLink } from '../../scripts/scripts.js';

    sessionStorage.removeItem('hcl_tokenExpires');

    sessionStorage.removeItem('hcl_userId'); *

    sessionStorage.removeItem('hcl_email');

    sessionStorage.removeItem('hcl_displayName');/**

  } catch (e) {

    console.warn('[LOGIN] Could not clear storage:', e); * Main block decorator - entry point * Usage in HTML: * Features:import { rootLink } from '../../scripts/scripts.js';

  }

} */



function storeAuthData(authResponse) {export default async function decorate(block) { * <div class="commerce-login"></div>

  try {

    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);  // Check if user is already logged in

    sessionStorage.setItem('hcl_userId', authResponse.userId || '');

    sessionStorage.setItem('hcl_email', authResponse.email || '');  const wcToken = getStoredToken(); */ * - Login with username/password

    sessionStorage.setItem('hcl_displayName', authResponse.displayName || '');



    const expiresIn = authResponse.expiresIn || 3600;

    const expiresAt = Date.now() + (expiresIn * 1000);  if (wcToken && !isTokenExpired()) {

    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());

  } catch (e) {    // User has valid token - show logout UI

    console.warn('[LOGIN] Could not store auth data:', e);

  }    renderLogoutUI(block);export default async function decorate(block) { * - Store wcToken in sessionStorage// Initialize

}

  } else {

function renderLoginUI(block) {

  block.innerHTML = `    // No token or expired - show login form  // Check if user is already logged in

    <div class="commerce-login-form">

      <h2>Sign In</h2>    if (wcToken && isTokenExpired()) {

      <form id="commerce-login-form">

        <div class="form-group">      clearStoredToken(); // Clean up expired token  const wcToken = getStoredToken(); * - Display logged-in user informationimport '../../scripts/initializers/auth.js';

          <label for="username">Username</label>

          <input     }

            type="text" 

            id="username"     renderLoginUI(block);

            name="username" 

            placeholder="Enter your username"  }

            required

          />  if (wcToken && !isTokenExpired()) { * - Logout with token invalidation

        </div>

        <div class="form-group">  // Start token expiry monitor

          <label for="password">Password</label>

          <input   startTokenExpiryMonitor(block);    // User has valid token - show logout UI

            type="password" 

            id="password" }

            name="password" 

            placeholder="Enter your password"    renderLogoutUI(block); * - Error message displayexport default async function decorate(block) {

            required

          />/**

        </div>

        <button type="submit" class="login-button">Sign In</button> * Get stored wcToken from sessionStorage  } else {

      </form>

      <div id="login-error" class="login-error" style="display: none;"></div> */

      <div id="login-loading" class="login-loading" style="display: none;">

        <p>Signing in...</p>function getStoredToken() {    // No token or expired - show login form * - Custom events for other components  if (checkIsAuthenticated()) {

      </div>

    </div>  try {

  `;

    return sessionStorage.getItem('hcl_wcToken');    if (wcToken && isTokenExpired()) {

  attachFormListeners(block);

}  } catch (e) {



function attachFormListeners(block) {    console.warn('[LOGIN-BLOCK] sessionStorage not available:', e);      clearStoredToken(); // Clean up expired token *     window.location.href = rootLink(CUSTOMER_ACCOUNT_PATH);

  const form = block.querySelector('#commerce-login-form');

  const errorDiv = block.querySelector('#login-error');    return null;

  const loadingDiv = block.querySelector('#login-loading');

  }    }

  if (!form) return;

}

  form.addEventListener('submit', async (e) => {

    e.preventDefault();    renderLoginUI(block); * Usage in AEM:  } else {



    const username = block.querySelector('#username').value.trim();/**

    const password = block.querySelector('#password').value.trim();

 * Check if token has expired  }

    if (!username || !password) {

      errorDiv.textContent = 'Please enter both username and password'; */

      errorDiv.style.display = 'block';

      return;function isTokenExpired() {} * Create a new page section with block type "commerce-login"    await authRenderer.render(SignIn, {

    }

  try {

    loadingDiv.style.display = 'block';

    errorDiv.style.display = 'none';    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);

    form.style.display = 'none';

    if (!expiresAt) return true;

    try {

      const response = await fetch('/api/hcl/login', {    return Date.now() > expiresAt;/** * No configuration needed - uses sessionStorage automatically      routeForgotPassword: () => rootLink(CUSTOMER_FORGOTPASSWORD_PATH),

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },  } catch (e) {

        body: JSON.stringify({ username, password }),

      });    return true; * Get stored wcToken from sessionStorage



      if (!response.ok) {  }

        const errorData = await response.json().catch(() => ({}));

        throw new Error(errorData.message || `Login failed: ${response.statusText}`);} */ *       routeRedirectOnSignIn: () => rootLink(CUSTOMER_ACCOUNT_PATH),

      }



      const authData = await response.json();

      storeAuthData(authData);/**function getStoredToken() {

      dispatchAuthEvent('hcl-user-logged-in', { user: authData });

      renderLogoutUI(block); * Clear all stored authentication data

    } catch (error) {

      console.error('[LOGIN] Login error:', error); */  try { * Usage in HTML:    })(block);

      errorDiv.textContent = error.message || 'Login failed. Please try again.';

      errorDiv.style.display = 'block';function clearStoredToken() {

      loadingDiv.style.display = 'none';

      form.style.display = 'block';  try {    return sessionStorage.getItem('hcl_wcToken');

    }

  });    sessionStorage.removeItem('hcl_wcToken');

}

    sessionStorage.removeItem('hcl_tokenExpires');  } catch (e) { * <div class="commerce-login"></div>  }

function renderLogoutUI(block) {

  const displayName = sessionStorage.getItem('hcl_displayName') || 'User';    sessionStorage.removeItem('hcl_userId');

  const email = sessionStorage.getItem('hcl_email') || '';

    sessionStorage.removeItem('hcl_email');    console.warn('[LOGIN-BLOCK] sessionStorage not available:', e);

  block.innerHTML = `

    <div class="logout-info">    sessionStorage.removeItem('hcl_displayName');

      <h2>Welcome, ${displayName}</h2>

      ${email ? `<p>${email}</p>` : ''}  } catch (e) {    return null; */}

      <button id="logout-btn" class="logout-button">Sign Out</button>

    </div>    console.warn('[LOGIN-BLOCK] Could not clear storage:', e);

  `;

  }  }

  const logoutBtn = block.querySelector('#logout-btn');

  if (logoutBtn) {}

    logoutBtn.addEventListener('click', (e) => {

      e.preventDefault();}

      clearStoredToken();

      dispatchAuthEvent('hcl-user-logged-out');/**

      renderLoginUI(block);

    }); * Store authentication data in sessionStorageexport default async function decorate(block) {

  }

} */



function dispatchAuthEvent(eventName, detail = {}) {function storeAuthData(authResponse) {/**  // ====================================

  const event = new CustomEvent(eventName, {

    detail,  try {

    bubbles: true,

    cancelable: true,    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken); * Check if token has expired  // 1. CHECK IF USER IS ALREADY LOGGED IN

  });

  document.dispatchEvent(event);    sessionStorage.setItem('hcl_userId', authResponse.userId || '');

}

    sessionStorage.setItem('hcl_email', authResponse.email || ''); */  // ====================================

function startTokenExpiryMonitor(block) {

  setInterval(() => {    sessionStorage.setItem('hcl_displayName', authResponse.displayName || '');

    const wcToken = getStoredToken();

    if (wcToken && isTokenExpired()) {function isTokenExpired() {  

      clearStoredToken();

      dispatchAuthEvent('hcl-token-expired');    // Calculate expiry time

      renderLoginUI(block);

    }    const expiresIn = authResponse.expiresIn || 3600; // default 1 hour  try {  const wcToken = getStoredToken();

  }, 60000);

}    const expiresAt = Date.now() + (expiresIn * 1000);


    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);  

  } catch (e) {

    console.warn('[LOGIN-BLOCK] Could not store auth data:', e);    if (!expiresAt) return true;  if (wcToken && !isTokenExpired()) {

  }

}    return Date.now() >= expiresAt;    // User has valid token - show logout UI



/**  } catch (e) {    renderLogoutUI(block);

 * Render the login form UI

 */    return true;  } else {

function renderLoginUI(block) {

  block.innerHTML = `  }    // No token or expired - show login form

    <div class="commerce-login-container">

      <div class="commerce-login-form">}    if (wcToken && isTokenExpired()) {

        <h2>Sign In</h2>

        <form id="commerce-login-form">      clearStoredToken(); // Clean up expired token

          <div class="form-group">

            <label for="username">Email or Username</label>/**    }

            <input 

              type="text"  * Clear all stored authentication data    renderLoginUI(block);

              id="username" 

              name="username"  */  }

              placeholder="Enter your email or username"

              requiredfunction clearStoredToken() {}

            />

          </div>  try {



          <div class="form-group">    sessionStorage.removeItem('hcl_wcToken');/**

            <label for="password">Password</label>

            <input     sessionStorage.removeItem('hcl_userId'); * Get stored wcToken from sessionStorage

              type="password" 

              id="password"     sessionStorage.removeItem('hcl_displayName'); */

              name="password" 

              placeholder="Enter your password"    sessionStorage.removeItem('hcl_firstName');function getStoredToken() {

              required

            />    sessionStorage.removeItem('hcl_lastName');  try {

          </div>

    sessionStorage.removeItem('hcl_email');    return sessionStorage.getItem('hcl_wcToken');

          <button type="submit" class="commerce-login-button">Sign In</button>

        </form>    sessionStorage.removeItem('hcl_tokenExpires');  } catch (e) {



        <div id="commerce-login-error" class="commerce-login-error" style="display: none;"></div>  } catch (e) {    console.warn('[LOGIN-BLOCK] sessionStorage not available:', e);

        <div id="commerce-login-loading" class="commerce-login-loading" style="display: none;">

          <span class="spinner"></span>    console.warn('[LOGIN-BLOCK] Error clearing storage:', e);    return null;

          <p>Signing in...</p>

        </div>  }  }



        <div class="commerce-login-links">}}

          <a href="#forgot-password">Forgot password?</a>

          <a href="#create-account">Create account</a>

        </div>

      </div>/**/**

    </div>

  `; * Store authentication data in sessionStorage * Check if token has expired



  attachLoginFormListeners(block); */ */

}

function storeAuthData(authResponse) {function isTokenExpired() {

/**

 * Render the logged-in user UI  try {  try {

 */

function renderLogoutUI(block) {    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);

  const displayName = sessionStorage.getItem('hcl_displayName') || 'User';

  const email = sessionStorage.getItem('hcl_email') || '';    sessionStorage.setItem('hcl_userId', authResponse.userId);    if (!expiresAt || isNaN(expiresAt)) {



  block.innerHTML = `    sessionStorage.setItem('hcl_displayName', authResponse.displayName || authResponse.email);      return true; // No expiry set, consider expired

    <div class="commerce-login-container">

      <div class="commerce-logout-info">    sessionStorage.setItem('hcl_firstName', authResponse.firstName || '');    }

        <div class="user-info">

          <h2>Welcome, ${displayName}</h2>    sessionStorage.setItem('hcl_lastName', authResponse.lastName || '');    return Date.now() > expiresAt;

          ${email ? `<p class="user-email">${email}</p>` : ''}

        </div>    sessionStorage.setItem('hcl_email', authResponse.email || '');  } catch (e) {

        <div class="logout-actions">

          <a href="/customer/account" class="link-button">My Account</a>    console.warn('[LOGIN-BLOCK] Error checking expiry:', e);

          <button id="commerce-logout-button" class="commerce-logout-button">Sign Out</button>

        </div>    // Calculate expiry time    return true;

      </div>

    </div>    const expiresIn = authResponse.expiresIn || 1500; // 25 minutes default  }

  `;

    const expiresAt = Date.now() + (expiresIn * 1000);}

  // Attach logout listener

  const logoutBtn = block.querySelector('#commerce-logout-button');    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());

  if (logoutBtn) {

    logoutBtn.addEventListener('click', (e) => {/**

      e.preventDefault();

      clearStoredToken();    console.log('[LOGIN-BLOCK] Auth data stored, token expires in', expiresIn, 'seconds'); * Clear all stored authentication data

      dispatchAuthEvent('hcl-user-logged-out');

      renderLoginUI(block);  } catch (e) { */

    });

  }    console.warn('[LOGIN-BLOCK] Error storing auth data:', e);function clearStoredToken() {

}

  }  try {

/**

 * Attach event listeners to login form}    sessionStorage.removeItem('hcl_wcToken');

 */

function attachLoginFormListeners(block) {    sessionStorage.removeItem('hcl_userId');

  const form = block.querySelector('#commerce-login-form');

  const errorDiv = block.querySelector('#commerce-login-error');/**    sessionStorage.removeItem('hcl_displayName');

  const loadingDiv = block.querySelector('#commerce-login-loading');

 * Dispatch custom event for other components to listen to    sessionStorage.removeItem('hcl_firstName');

  if (!form) return;

 */    sessionStorage.removeItem('hcl_lastName');

  form.addEventListener('submit', async (e) => {

    e.preventDefault();function dispatchAuthEvent(eventType, data) {    sessionStorage.removeItem('hcl_email');



    const username = block.querySelector('#username').value.trim();  try {    sessionStorage.removeItem('hcl_tokenExpires');

    const password = block.querySelector('#password').value.trim();

    const event = new CustomEvent(eventType, {  } catch (e) {

    // Validation

    if (!username || !password) {      detail: data,    console.warn('[LOGIN-BLOCK] Error clearing tokens:', e);

      showError('Please enter both username and password', errorDiv);

      return;      bubbles: true,  }

    }

      cancelable: true,}

    // Show loading state

    loadingDiv.style.display = 'flex';    });

    errorDiv.style.display = 'none';

    form.style.display = 'none';    document.dispatchEvent(event);/**



    try {    console.log('[LOGIN-BLOCK] Dispatched event:', eventType); * Store authentication data in sessionStorage

      // Call login endpoint

      const response = await fetch('/api/hcl/login', {  } catch (e) { */

        method: 'POST',

        headers: {    console.warn('[LOGIN-BLOCK] Error dispatching event:', e);function storeAuthData(authResponse) {

          'Content-Type': 'application/json',

        },  }  try {

        body: JSON.stringify({

          username,}    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);

          password,

        }),    sessionStorage.setItem('hcl_userId', authResponse.userId);

      });

/**    sessionStorage.setItem('hcl_displayName', authResponse.displayName || authResponse.email);

      if (!response.ok) {

        const errorData = await response.json().catch(() => ({})); * Render login form UI    sessionStorage.setItem('hcl_firstName', authResponse.firstName || '');

        throw new Error(errorData.message || `Login failed: ${response.statusText}`);

      } */    sessionStorage.setItem('hcl_lastName', authResponse.lastName || '');



      const authData = await response.json();function renderLoginUI(block) {    sessionStorage.setItem('hcl_email', authResponse.email || '');



      // Store auth data  block.innerHTML = '';    

      storeAuthData(authData);

    // Calculate expiry time (current time + expiresIn seconds)

      // Dispatch success event

      dispatchAuthEvent('hcl-user-logged-in', { user: authData });  const form = document.createElement('form');    const expiresAt = Date.now() + ((authResponse.expiresIn || 3600) * 1000);



      // Show logged-in UI  form.className = 'commerce-login__form';    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());

      renderLogoutUI(block);

    } catch (error) {  form.innerHTML = `  } catch (e) {

      console.error('[LOGIN-BLOCK] Login error:', error);

      showError(error.message || 'Login failed. Please try again.', errorDiv);    <div class="commerce-login__container">    console.error('[LOGIN-BLOCK] Error storing auth data:', e);



      // Reset form      <h1 class="commerce-login__title">Sign In</h1>  }

      loadingDiv.style.display = 'none';

      form.style.display = 'block';      }

    }

  });      <div class="commerce-login__errors" id="login-errors" style="display: none;"></div>

}

/**

/**

 * Show error message      <div class="commerce-login__field"> * Dispatch custom event for other components to listen

 */

function showError(message, errorDiv) {        <label for="login-username" class="commerce-login__label">Username</label> */

  if (errorDiv) {

    errorDiv.textContent = message;        <inputfunction dispatchAuthEvent(eventType, data = {}) {

    errorDiv.style.display = 'block';

  }          type="text"  const eventName = eventType === 'login' ? 'hcl-user-logged-in' : 'hcl-user-logged-out';

}

          id="login-username"  const event = new CustomEvent(eventName, {

/**

 * Dispatch custom authentication events          class="commerce-login__input"    detail: {

 */

function dispatchAuthEvent(eventName, detail = {}) {          placeholder="Enter your username"      timestamp: Date.now(),

  const event = new CustomEvent(eventName, {

    detail,          required      ...data,

    bubbles: true,

    cancelable: true,          autocomplete="username"    },

  });

  document.dispatchEvent(event);        />  });

}

      </div>  window.dispatchEvent(event);

/**

 * Monitor token expiry and refresh UI if needed  console.log(`[LOGIN-BLOCK] Event dispatched: ${eventName}`);

 */

function startTokenExpiryMonitor(block) {      <div class="commerce-login__field">}

  // Check token every 60 seconds

  setInterval(() => {        <label for="login-password" class="commerce-login__label">Password</label>

    const wcToken = getStoredToken();

        <input/**

    if (wcToken && isTokenExpired()) {

      // Token expired - clear and show login          type="password" * RENDER LOGIN FORM

      clearStoredToken();

      dispatchAuthEvent('hcl-token-expired');          id="login-password" * Shows when user is not authenticated

      renderLoginUI(block);

    }          class="commerce-login__input" */

  }, 60000);

}          placeholder="Enter your password"function renderLoginUI(block) {


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
