/**
 * Commerce Login Block - HCL Commerce Authentication
 */

import { rootLink } from "../../scripts/scripts.js";

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
    // NEW: Use consolidated hcl_auth key
    const authData = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
    return authData.token || null;
  } catch (e) {
    return null;
  }
}

function isTokenExpired() {
  try {
    // NEW: Use consolidated hcl_auth key
    const authData = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
    const storedAt = authData.storedAt || 0;
    const expiresIn = 3600 * 1000; // 1 hour default
    return !storedAt || Date.now() > storedAt + expiresIn;
  } catch (e) {
    return true;
  }
}

function clearStoredToken() {
  try {
    // NEW: Use consolidated hcl_auth key - clear the entire hcl_auth object
    sessionStorage.removeItem("hcl_auth");
    // Keep legacy keys for compatibility with other code
    sessionStorage.removeItem("hcl_wcToken");
    sessionStorage.removeItem("hcl_tokenExpires");
    sessionStorage.removeItem("hcl_userId");
    sessionStorage.removeItem("hcl_email");
    sessionStorage.removeItem("hcl_displayName");
  } catch (e) {}
}

function storeAuthData(authResponse) {
  try {
    // NEW: Store everything in consolidated hcl_auth object
    const expiresIn = authResponse.expiresIn || 3600;
    const authData = {
      token:
        authResponse.wcToken || authResponse.accessToken || authResponse.token,
      trustedToken: authResponse.wcTrustedToken || authResponse.trustedToken,
      userId: authResponse.userId,
      email: authResponse.email,
      displayName: authResponse.displayName,
      sessionCookies: authResponse.sessionCookies || {},
      expiresIn: expiresIn,
      expiry: Date.now() + expiresIn * 1000, // CRITICAL: Calculate expiry timestamp
      storedAt: Date.now(),
    };

    console.log("[LOGIN] Storing complete auth data:", {
      hasToken: !!authData.token,
      hasTrustedToken: !!authData.trustedToken,
      hasUserId: !!authData.userId,
      hasExpiry: !!authData.expiry,
      sessionCookieKeys: Object.keys(authData.sessionCookies || {}),
    });

    sessionStorage.setItem("hcl_auth", JSON.stringify(authData));
    console.log(
      "[LOGIN] ✓ Complete auth data stored to sessionStorage.hcl_auth",
    );
  } catch (e) {
    console.error("[LOGIN] Error storing auth data:", e);
  }
}

function renderLoginUI(block) {
  block.innerHTML =
    '<div class="commerce-login-form"><h2>Sign In</h2><form id="commerce-login-form"><div class="form-group"><label for="username">Username</label><input type="text" id="username" name="username" placeholder="Enter username" required/></div><div class="form-group"><label for="password">Password</label><input type="password" id="password" name="password" placeholder="Enter password" required/></div><button type="submit" class="login-button">Sign In</button></form><div id="login-error" class="login-error" style="display: none;"></div><div id="login-loading" class="login-loading" style="display: none;"><p>Signing in...</p></div></div>';
  attachFormListeners(block);
}

function attachFormListeners(block) {
  const form = block.querySelector("#commerce-login-form");
  const errorDiv = block.querySelector("#login-error");
  const loadingDiv = block.querySelector("#login-loading");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = block.querySelector("#username").value.trim();
    const password = block.querySelector("#password").value.trim();
    if (!username || !password) {
      errorDiv.textContent = "Enter username and password";
      errorDiv.style.display = "block";
      return;
    }
    loadingDiv.style.display = "block";
    errorDiv.style.display = "none";
    form.style.display = "none";
    try {
      console.log("[LOGIN] Attempting login with:", {
        username,
        timestamp: new Date().toISOString(),
      });
      const requestBody = JSON.stringify({ username, password });
      console.log("[LOGIN] Request body:", requestBody);

      const response = await fetch("/api/hcl/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });

      console.log("[LOGIN] Response status:", response.status);
      const responseText = await response.text();
      console.log("[LOGIN] Response body:", responseText);

      if (!response.ok) {
        throw new Error(
          `Login failed with status ${response.status}: ${responseText}`,
        );
      }

      const authData = JSON.parse(responseText);
      console.log("[LOGIN] Auth data received:", {
        userId: authData.userId,
        email: authData.email,
      });
      storeAuthData(authData);
      renderLogoutUI(block);
    } catch (error) {
      console.error("[LOGIN] Error:", error);
      errorDiv.textContent =
        error.message || "Login failed. Check console for details.";
      errorDiv.style.display = "block";
      loadingDiv.style.display = "none";
      form.style.display = "block";
    }
  });
}

function renderLogoutUI(block) {
  const displayName = sessionStorage.getItem("hcl_displayName") || "User";
  block.innerHTML =
    '<div class="logout-info"><h2>Welcome, ' +
    displayName +
    '</h2><button id="logout-btn" class="logout-button">Sign Out</button></div>';
  const logoutBtn = block.querySelector("#logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
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
