/**
 * Commerce Login Block - HCL Commerce Authentication
 */

import { rootLink } from '../../scripts/scripts.js';

export default async function decorate(block) {
  const wcToken = getStoredToken();
  if (wcToken && !isTokenExpired()) {
    renderLogoutUI(block);
  } else {
    if (wcToken && isTokenExpired()) clearStoredToken();
    renderLoginUI(block);
  }
  startTokenExpiryMonitor(block);
}

function getStoredToken() {
  try {
    return sessionStorage.getItem('hcl_wcToken');
  } catch (e) {
    return null;
  }
}

function isTokenExpired() {
  try {
    const expiresAt = parseInt(sessionStorage.getItem('hcl_tokenExpires'), 10);
    return !expiresAt || Date.now() > expiresAt;
  } catch (e) {
    return true;
  }
}

function clearStoredToken() {
  try {
    sessionStorage.removeItem('hcl_wcToken');
    sessionStorage.removeItem('hcl_tokenExpires');
    sessionStorage.removeItem('hcl_userId');
    sessionStorage.removeItem('hcl_email');
    sessionStorage.removeItem('hcl_displayName');
  } catch (e) {}
}

function storeAuthData(authResponse) {
  try {
    sessionStorage.setItem('hcl_wcToken', authResponse.wcToken);
    sessionStorage.setItem('hcl_userId', authResponse.userId || '');
    sessionStorage.setItem('hcl_email', authResponse.email || '');
    sessionStorage.setItem('hcl_displayName', authResponse.displayName || '');
    const expiresIn = authResponse.expiresIn || 3600;
    const expiresAt = Date.now() + (expiresIn * 1000);
    sessionStorage.setItem('hcl_tokenExpires', expiresAt.toString());
  } catch (e) {}
}

function renderLoginUI(block) {
  block.innerHTML = '<div class="commerce-login-form"><h2>Sign In</h2><form id="commerce-login-form"><div class="form-group"><label for="username">Username</label><input type="text" id="username" name="username" placeholder="Enter username" required/></div><div class="form-group"><label for="password">Password</label><input type="password" id="password" name="password" placeholder="Enter password" required/></div><button type="submit" class="login-button">Sign In</button></form><div id="login-error" class="login-error" style="display: none;"></div><div id="login-loading" class="login-loading" style="display: none;"><p>Signing in...</p></div></div>';
  attachFormListeners(block);
}

function attachFormListeners(block) {
  const form = block.querySelector('#commerce-login-form');
  const errorDiv = block.querySelector('#login-error');
  const loadingDiv = block.querySelector('#login-loading');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = block.querySelector('#username').value.trim();
    const password = block.querySelector('#password').value.trim();
    if (!username || !password) {
      errorDiv.textContent = 'Enter username and password';
      errorDiv.style.display = 'block';
      return;
    }
    loadingDiv.style.display = 'block';
    errorDiv.style.display = 'none';
    form.style.display = 'none';
    try {
      const response = await fetch('/api/hcl/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) throw new Error('Login failed');
      const authData = await response.json();
      storeAuthData(authData);
      renderLogoutUI(block);
    } catch (error) {
      errorDiv.textContent = error.message || 'Login failed';
      errorDiv.style.display = 'block';
      loadingDiv.style.display = 'none';
      form.style.display = 'block';
    }
  });
}

function renderLogoutUI(block) {
  const displayName = sessionStorage.getItem('hcl_displayName') || 'User';
  block.innerHTML = '<div class="logout-info"><h2>Welcome, ' + displayName + '</h2><button id="logout-btn" class="logout-button">Sign Out</button></div>';
  const logoutBtn = block.querySelector('#logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearStoredToken();
      renderLoginUI(block);
    });
  }
}

function startTokenExpiryMonitor(block) {
  setInterval(() => {
    if (getStoredToken() && isTokenExpired()) {
      clearStoredToken();
      renderLoginUI(block);
    }
  }, 60000);
}