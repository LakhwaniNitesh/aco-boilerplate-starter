/**
 * HCL Commerce Authentication Service
 *
 * Manages user authentication with HCL Commerce backend proxy
 * Handles:
 *   - Login via backend proxy
 *   - Token storage and retrieval
 *   - Token refresh (25-minute window)
 *   - Logout
 *   - Session management
 *
 * Integration with EDS Drop-ins and Redux state
 */

class HCLAuthService {
  constructor() {
    this.token = this.getStoredToken();
    this.trustedToken = this.getStoredTrustedToken(); // CRITICAL: Store trusted token separately
    this.userId = this.getStoredUserId();
    this.tokenExpiry = this.getStoredExpiry();
    this.sessionCookies = this.getStoredSessionCookies() || {}; // Ensure always an object
    this.refreshTimer = null;
    this.proxyUrl = window.location.origin || "http://localhost:3000";
    console.log("[HCL-AUTH] Service initialized with:", {
      hasToken: !!this.token,
      hasTrustedToken: !!this.trustedToken, // Log trusted token availability
      hasUserId: !!this.userId,
      hasTokenExpiry: !!this.tokenExpiry,
      tokenExpiryTime: this.tokenExpiry
        ? new Date(this.tokenExpiry).toISOString()
        : "NONE",
      sessionCookieKeys: Object.keys(this.sessionCookies || {}),
    });
  }

  /**
   * Login with username and password
   * Calls backend proxy: POST /api/hcl/login
   */
  async login(username, password) {
    try {
      const response = await fetch(`${this.proxyUrl}/api/hcl/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Authentication failed");
      }

      const data = await response.json();

      // DEBUG: Log full response
      console.log("[HCL-AUTH] RECEIVED RAW RESPONSE FROM SERVER:", {
        hasWcToken: !!data.wcToken,
        wcTokenSample: data.wcToken ? data.wcToken.substring(0, 30) : "MISSING",
        hasWcTrustedToken: !!data.wcTrustedToken, // Log trusted token
        wcTrustedTokenSample: data.wcTrustedToken
          ? data.wcTrustedToken.substring(0, 30)
          : "MISSING",
        hasAccessToken: !!data.accessToken,
        accessTokenSample: data.accessToken
          ? data.accessToken.substring(0, 30)
          : "MISSING",
        hasTrustedToken: !!data.trustedToken, // Log trusted token alias
        trustedTokenSample: data.trustedToken
          ? data.trustedToken.substring(0, 30)
          : "MISSING",
        hasToken: !!data.token,
        hasSessionCookies: !!data.sessionCookies,
        sessionCookiesKeys: data.sessionCookies
          ? Object.keys(data.sessionCookies)
          : [],
      });

      // Store token and metadata
      this.token = data.wcToken || data.accessToken || data.token;
      this.trustedToken = data.wcTrustedToken || data.trustedToken; // CRITICAL: Store trusted token separately
      this.userId = data.userId;
      this.tokenExpiry = Date.now() + data.expiresIn * 1000;

      // DEBUGGING: Log what we actually stored
      console.log("[HCL-AUTH] STORED IN SERVICE PROPERTIES:", {
        hasToken: !!this.token,
        tokenSample: this.token ? this.token.substring(0, 30) : "MISSING",
        hasTrustedToken: !!this.trustedToken,
        trustedTokenSample: this.trustedToken
          ? this.trustedToken.substring(0, 30)
          : "MISSING",
        hasUserId: !!this.userId,
        userId: this.userId,
      });

      // DEBUGGING: Log full response structure
      console.log(
        "[HCL-AUTH] FULL LOGIN RESPONSE DATA:",
        JSON.stringify(data, null, 2),
      );

      // Store session cookies from login response
      if (data.sessionCookies) {
        this.sessionCookies = data.sessionCookies;
        console.log(
          `[HCL-AUTH] ✓ Setting this.sessionCookies to:`,
          this.sessionCookies,
        );
        console.log(
          `[HCL-AUTH] ✓ Stored ${Object.keys(data.sessionCookies).length} session cookies from login response`,
        );
      } else {
        console.warn("[HCL-AUTH] ⚠ No sessionCookies in login response!");
        console.warn("[HCL-AUTH] ⚠ Response keys:", Object.keys(data));
      }

      console.log(
        "[HCL-AUTH] Before storeToken, this.sessionCookies =",
        this.sessionCookies,
      );
      this.storeToken();
      this.scheduleTokenRefresh();

      console.log(
        "[HCL-AUTH] After storeToken, sessionStorage contains:",
        JSON.parse(sessionStorage.getItem("hcl_auth") || "{}"),
      );

      return {
        success: true,
        token: this.token,
        userId: this.userId,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      console.error("HCL Auth Error:", error);
      throw error;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.token && !this.isTokenExpired();
  }

  /**
   * Check if token is expired
   */
  isTokenExpired() {
    return !this.tokenExpiry || Date.now() >= this.tokenExpiry;
  }

  /**
   * Get remaining token lifetime in seconds
   */
  getTokenLifetime() {
    if (!this.tokenExpiry) return 0;
    return Math.max(0, Math.floor((this.tokenExpiry - Date.now()) / 1000));
  }

  /**
   * Get current access token
   */
  getToken() {
    if (this.isTokenExpired()) {
      this.logout();
      return null;
    }
    return this.token;
  }

  /**
   * Get current user ID
   */
  getUserId() {
    return this.userId;
  }

  /**
   * Refresh token by re-authenticating
   * Triggered automatically 5 minutes before expiry
   */
  async refreshToken(username, password) {
    try {
      const result = await this.login(username, password);
      console.log("Token refreshed successfully");
      return result;
    } catch (error) {
      console.error("Token refresh failed:", error);
      this.logout();
      throw error;
    }
  }

  /**
   * Schedule automatic token refresh
   * Refreshes 5 minutes before expiry
   */
  scheduleTokenRefresh() {
    // Clear existing timer
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    const lifetime = this.getTokenLifetime();
    const refreshIn = Math.max(0, (lifetime - 300) * 1000); // Refresh 5 min before expiry

    if (refreshIn > 0) {
      this.refreshTimer = setTimeout(() => {
        console.log(
          "Token refresh window approaching - dispatcher will handle",
        );
        // Dispatch event for app to handle (requires credential storage)
        window.dispatchEvent(
          new CustomEvent("hcl-token-refresh-needed", {
            detail: { lifetime },
          }),
        );
      }, refreshIn);
    }
  }

  /**
   * Logout and clear token
   */
  logout() {
    this.token = null;
    this.userId = null;
    this.tokenExpiry = null;
    this.sessionCookies = null;

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.clearStoredToken();
  }

  /**
   * Get session cookies from login
   */
  getSessionCookies() {
    return this.sessionCookies || {};
  }

  /**
   * Store token in session storage
   * Session storage: Cleared when browser closes (more secure)
   */
  storeToken() {
    try {
      console.log("[HCL-AUTH] ╔ storeToken() called");
      console.log(
        "[HCL-AUTH] ║ this.token:",
        this.token ? this.token.substring(0, 30) + "..." : "NULL/UNDEFINED",
      );
      console.log(
        "[HCL-AUTH] ║ this.trustedToken:",
        this.trustedToken
          ? this.trustedToken.substring(0, 30) + "..."
          : "NULL/UNDEFINED",
      );
      console.log("[HCL-AUTH] ║ this.userId:", this.userId);
      console.log(
        "[HCL-AUTH] ║ this.sessionCookies keys:",
        Object.keys(this.sessionCookies || {}),
      );

      const data = {
        token: this.token,
        trustedToken: this.trustedToken, // CRITICAL: Store trusted token separately
        userId: this.userId,
        expiry: this.tokenExpiry,
        sessionCookies: this.sessionCookies || {},
        storedAt: Date.now(),
      };

      console.log(
        "[HCL-AUTH] ║ About to store data with keys:",
        Object.keys(data),
      );
      console.log("[HCL-AUTH] ║ trustedToken in data?", !!data.trustedToken);

      sessionStorage.setItem("hcl_auth", JSON.stringify(data));

      const storedData = JSON.parse(sessionStorage.getItem("hcl_auth"));
      console.log(
        "[HCL-AUTH] ║ VERIFIED in sessionStorage, keys:",
        Object.keys(storedData),
      );
      console.log(
        "[HCL-AUTH] ║ trustedToken in sessionStorage?",
        !!storedData.trustedToken,
      );
      console.log("[HCL-AUTH] ╚ storeToken() complete");
    } catch (e) {
      console.error("[HCL-AUTH] ERROR in storeToken():", e);
    }
  }

  /**
   * Get stored token from session storage
   */
  getStoredToken() {
    try {
      const data = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
      return data.token || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get stored trusted token from session storage
   */
  getStoredTrustedToken() {
    try {
      const data = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
      // Try multiple possible field names for compatibility
      const trustedToken = data.trustedToken || data.wcTrustedToken;
      console.log(
        "[HCL-AUTH] getStoredTrustedToken() - checking hcl_auth object:",
        {
          hasTrustedTokenField: !!data.trustedToken,
          hasWcTrustedTokenField: !!data.wcTrustedToken,
          foundValue: !!trustedToken,
          dataKeys: Object.keys(data),
        },
      );
      return trustedToken || null;
    } catch (e) {
      console.error("[HCL-AUTH] getStoredTrustedToken() error:", e);
      return null;
    }
  }

  /**
   * Get current trusted token
   */
  getTrustedToken() {
    console.log("[HCL-AUTH] getTrustedToken() called - checking expiry first");
    if (this.isTokenExpired()) {
      console.log("[HCL-AUTH] getTrustedToken() - token expired, logging out");
      this.logout();
      return null;
    }

    // If this.trustedToken is null but sessionStorage has it, read it
    // This handles the case where service was initialized before login
    if (!this.trustedToken) {
      console.log(
        "[HCL-AUTH] getTrustedToken() - this.trustedToken is null, loading from sessionStorage",
      );
      this.trustedToken = this.getStoredTrustedToken();
      console.log(
        "[HCL-AUTH] getTrustedToken() - loaded from sessionStorage:",
        this.trustedToken
          ? "✓ Found (length: " + this.trustedToken.length + ")"
          : "✗ Not found",
      );
    } else {
      console.log(
        "[HCL-AUTH] getTrustedToken() - this.trustedToken already set (length: " +
          this.trustedToken.length +
          ")",
      );
    }

    return this.trustedToken;
  }

  /**
   * Get stored session cookies
   */
  getStoredSessionCookies() {
    try {
      const data = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
      const cookies = data.sessionCookies || {};
      console.log("[HCL-AUTH] getStoredSessionCookies returning:", {
        keys: Object.keys(cookies),
        value: cookies,
      });
      return cookies;
    } catch (e) {
      console.error("[HCL-AUTH] Error retrieving stored session cookies:", e);
      return {};
    }
  }

  /**
   * Get stored user ID
   */
  getStoredUserId() {
    try {
      const data = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
      return data.userId || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get stored token expiry
   */
  getStoredExpiry() {
    try {
      const data = JSON.parse(sessionStorage.getItem("hcl_auth") || "{}");
      return data.expiry || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Clear stored token
   */
  clearStoredToken() {
    try {
      sessionStorage.removeItem("hcl_auth");
    } catch (e) {
      console.error("Failed to clear token:", e);
    }
  }
}

// Export singleton instance
export const hclAuthService = new HCLAuthService();

/**
 * React Hook for authentication
 * Usage:
 *   const [isAuth, token] = useHCLAuth();
 */
export function useHCLAuth() {
  const [isAuth, setIsAuth] = window.React?.useState(
    hclAuthService.isAuthenticated(),
  ) || [false, null];

  const [token, setToken] = window.React?.useState(
    hclAuthService.getToken(),
  ) || [null];

  // Listen for token refresh events
  window.React?.useEffect?.(() => {
    const handleRefresh = () => {
      setIsAuth(hclAuthService.isAuthenticated());
      setToken(hclAuthService.getToken());
    };

    window.addEventListener("hcl-token-refresh-needed", handleRefresh);
    return () => {
      window.removeEventListener("hcl-token-refresh-needed", handleRefresh);
    };
  }, []);

  return [isAuth, token];
}

/**
 * Helper: Login and dispatch state update
 */
export async function hclLogin(username, password, onSuccess, onError) {
  try {
    const result = await hclAuthService.login(username, password);
    if (onSuccess) onSuccess(result);
  } catch (error) {
    if (onError) onError(error);
  }
}

/**
 * Helper: Logout and dispatch state update
 */
export function hclLogout() {
  hclAuthService.logout();
  window.dispatchEvent(new CustomEvent("hcl-logout"));
}
