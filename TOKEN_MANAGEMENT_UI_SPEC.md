# Token Management UI Block - Adobe EDS Implementation

## 📋 Overview

This document provides the Adobe EDS Storefront-compliant specification for implementing the **Token Management (Login/Logout) block** that manages HCL Commerce wcToken authentication.

**Follows:** Adobe EDS Storefront Block Decorator Pattern  
**Location:** `blocks/commerce-login/`  
**Dependencies:** HCL Commerce REST API authentication system  
**Browser Support:** Chrome, Firefox, Safari, Edge (sessionStorage required)

---

## Block Architecture

```
blocks/commerce-login/
├── commerce-login.js          # Block decorator (main logic)
├── commerce-login.css         # Styling
└── README.md                  # Block documentation
```

### Files to Create

1. **`blocks/commerce-login/commerce-login.js`** (200-300 lines)
   - Block decorator function
   - Login form logic
   - Logout button handler
   - Token management
   - Event dispatching
   - Error handling

2. **`blocks/commerce-login/commerce-login.css`** (200-300 lines)
   - Form styling
   - Button styles
   - Responsive design
   - Error message styling
   - Loading states
   - Logout UI styling

3. **`blocks/commerce-login/README.md`** (50-100 lines)
   - Block description
   - How to use in AEM
   - Configuration options
   - Styling customization

---

## Block Decorator Specification

### File: `blocks/commerce-login/commerce-login.js`

```javascript
/**
 * Commerce Login Block - Adobe EDS Storefront
 * 
 * Provides authentication UI for HCL Commerce wcToken management.
 * Implements login form and logout button with session persistence.
 * 
 * Features:
 * - Login with username/password
 * - Store wcToken in sessionStorage
 * - Display logged-in user information
 * - Logout with token invalidation
 * - Error message display
 * - Custom events for other components
 * 
 * Usage in AEM:
 * Create a new page section with block type "commerce-login"
 * No configuration needed - uses sessionStorage automatically
 * 
 * Usage in HTML:
 * <div class="commerce-login"></div>
 */

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
      
      // Small delay before rendering logout UI
      setTimeout(() => {
        renderLogoutUI(block.parentElement);
      }, 500);

    } catch (error) {
      console.error('[LOGIN-BLOCK] Login error:', error);
      errorDiv.innerHTML = `<span class="error-text">Error: ${error.message}</span>`;
      submitButton.disabled = false;
      submitButton.classList.remove('loading');
      loadingDiv.innerHTML = '';
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
```

---

## CSS Styling Specification

### File: `blocks/commerce-login/commerce-login.css`

```css
/* ============================================
   Commerce Login Block Styles
   Adobe EDS Storefront Pattern
============================================ */

.commerce-login-container {
  margin: 1rem 0;
  padding: 2rem;
  background-color: var(--color-bg-secondary, #f5f5f5);
  border-radius: 0.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
}

/* ============================================
   LOGIN FORM STYLING
============================================ */

.commerce-login-container.login-form {
  max-width: 400px;
  margin: 2rem auto;
}

.login-header {
  margin-bottom: 1.5rem;
  text-align: center;
}

.login-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text-primary, #000);
}

.login-header p {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #666);
}

/* Form Group */
.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: flex;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-primary, #000);
}

.label-text {
  flex: 1;
}

.required {
  color: var(--color-danger, #d32f2f);
  margin-left: 0.25rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: 1px solid var(--color-border, #ccc);
  border-radius: 0.25rem;
  box-sizing: border-box;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-control:focus {
  outline: none;
  border-color: var(--color-primary, #0066cc);
  box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
}

.form-control:disabled {
  background-color: var(--color-bg-disabled, #f0f0f0);
  cursor: not-allowed;
}

/* Messages */
.error-message,
.loading-message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}

.error-message {
  background-color: var(--color-danger-bg, #ffebee);
  border: 1px solid var(--color-danger, #d32f2f);
}

.error-text {
  color: var(--color-danger, #d32f2f);
}

.loading-message {
  background-color: var(--color-info-bg, #e3f2fd);
  border: 1px solid var(--color-info, #1976d2);
  display: none;
}

.loading-text {
  color: var(--color-info, #1976d2);
}

/* Buttons */
.btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 500;
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background-color: var(--color-primary, #0066cc);
  color: white;
  width: 100%;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark, #0052a3);
  box-shadow: 0 2px 4px rgba(0, 102, 204, 0.3);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(1px);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn.loading {
  opacity: 0.7;
  pointer-events: none;
}

.btn-secondary {
  background-color: var(--color-secondary, #666);
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--color-secondary-dark, #333);
}

.loading-spinner {
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Login Footer */
.login-footer {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border, #ccc);
  text-align: center;
}

.test-users-info {
  margin: 0;
  color: var(--color-text-secondary, #666);
  font-size: 0.75rem;
}

/* ============================================
   LOGOUT CONTAINER STYLING
============================================ */

.commerce-login-container.logout-container {
  max-width: 300px;
  margin: 1rem auto;
  background-color: var(--color-success-bg, #e8f5e9);
  border: 1px solid var(--color-success, #4caf50);
}

.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.user-greeting {
  text-align: center;
}

.greeting-text {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #666);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.user-name {
  margin: 0.25rem 0 0 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text-primary, #000);
}

.user-email {
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
  color: var(--color-text-secondary, #666);
}

.btn-logout {
  width: 100%;
}

/* ============================================
   RESPONSIVE DESIGN
============================================ */

@media (max-width: 768px) {
  .commerce-login-container {
    padding: 1.5rem;
  }

  .commerce-login-container.login-form {
    max-width: 100%;
    margin: 1rem;
  }

  .login-header h2 {
    font-size: 1.5rem;
  }

  .btn {
    padding: 0.625rem 1rem;
    font-size: 0.9375rem;
  }
}

@media (max-width: 480px) {
  .commerce-login-container {
    padding: 1rem;
    border-radius: 0;
  }

  .login-header h2 {
    font-size: 1.25rem;
  }

  .form-group {
    margin-bottom: 0.875rem;
  }

  .form-control {
    padding: 0.625rem;
    font-size: 0.9375rem;
  }

  .btn {
    padding: 0.625rem;
    font-size: 0.875rem;
  }

  .test-users-info {
    font-size: 0.7rem;
  }
}

/* ============================================
   ACCESSIBILITY
============================================ */

/* High contrast mode support */
@media (prefers-contrast: more) {
  .form-control {
    border-width: 2px;
  }

  .btn {
    border: 2px solid currentColor;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .form-control,
  .btn,
  .loading-spinner {
    transition: none;
    animation: none;
  }
}

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  .commerce-login-container {
    background-color: var(--color-bg-secondary-dark, #2a2a2a);
    color: var(--color-text-primary-dark, #fff);
  }

  .login-header h2 {
    color: var(--color-text-primary-dark, #fff);
  }

  .login-header p {
    color: var(--color-text-secondary-dark, #ccc);
  }

  .form-control {
    background-color: var(--color-bg-dark, #333);
    border-color: var(--color-border-dark, #555);
    color: var(--color-text-primary-dark, #fff);
  }

  .form-control::placeholder {
    color: var(--color-text-secondary-dark, #999);
  }
}
```

---

## Block README Specification

### File: `blocks/commerce-login/README.md`

```markdown
# Commerce Login Block

## Description

Provides user authentication UI for HCL Commerce wcToken management. Allows customers to login/logout and manage their session.

## Usage

### In AEM Author Interface

1. Go to page editor
2. Add new block section
3. Select "Commerce Login" block type
4. No configuration needed - block works out of the box

### HTML Structure

The block automatically renders either:

**When Not Logged In:**
- Login form with username/password fields
- Error message display
- Test credentials information

**When Logged In:**
- Greeting message with user name
- User email display
- Logout button

## Features

✅ Real-time login form validation
✅ Error message display
✅ Token storage in sessionStorage
✅ Logout with token invalidation
✅ User greeting with name/email
✅ Responsive mobile design
✅ Dark mode support
✅ Accessibility (WCAG 2.1 AA)

## Token Management

The block automatically:
- Stores wcToken in sessionStorage on login
- Checks for valid token on page load
- Handles token expiry (1-hour default)
- Clears expired tokens
- Dispatches events for other components

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

Requires: sessionStorage support

## Styling Customization

Override CSS variables for custom theming:

```css
:root {
  --color-primary: #0066cc;
  --color-primary-dark: #0052a3;
  --color-danger: #d32f2f;
  --color-success: #4caf50;
  --color-text-primary: #000;
  --color-text-secondary: #666;
  --color-border: #ccc;
  --color-bg-secondary: #f5f5f5;
}
```

## Events

The block dispatches custom events:

- `hcl-user-logged-in` - Fired on successful login
- `hcl-user-logged-out` - Fired on logout
- `hcl-token-expired` - Fired when token expires

## API Endpoints Used

- `POST /api/hcl/login` - Authenticate user
- `POST /api/hcl/logout` - Logout user
- `GET /api/hcl/auth/validate` - Check token validity

## Test Credentials

For development/testing:
- Username: `auroraadobetest`, Password: `passw0rd`
- Username: `adobetest1`, Password: `passw0rd`
- Username: `adobetest2`, Password: `passw0rd`

## Notes

- Token is stored in sessionStorage (cleared when browser closes)
- No persistent login across browser restarts
- For longer persistence, use localStorage (less secure)
- Compatible with other authentication blocks
- Does not conflict with existing auth systems
```

---

## Implementation Checklist

Before deploying, verify:

- [ ] Block decorator (`commerce-login.js`) implemented
- [ ] CSS styling complete (`commerce-login.css`)
- [ ] README documentation added
- [ ] Login form validates username/password
- [ ] Error messages display correctly
- [ ] Token stored in sessionStorage
- [ ] Logout clears token
- [ ] Custom events dispatched
- [ ] Responsive design verified (mobile/tablet/desktop)
- [ ] Accessibility verified (keyboard nav, screen readers)
- [ ] Dark mode support tested
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] No console errors
- [ ] Code follows Adobe EDS patterns
- [ ] Documentation complete

---

## Next Steps

1. Create the three files from this specification
2. Test login/logout locally
3. Verify token is stored and used in cart operations
4. Update cart components to require authentication
5. Add event listeners in other blocks for auth events
6. Deploy to staging/production

---

**Status: Ready for Implementation** ✅
