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
    this.userId = this.getStoredUserId();
    this.tokenExpiry = this.getStoredExpiry();
    this.refreshTimer = null;
    this.proxyUrl = window.location.origin || 'http://localhost:3000';
  }

  /**
   * Login with username and password
   * Calls backend proxy: POST /api/hcl/login
   */
  async login(username, password) {
    try {
      const response = await fetch(`${this.proxyUrl}/api/hcl/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error?.message || 'Authentication failed'
        );
      }

      const data = await response.json();

      // Store token and metadata
      this.token = data.token;
      this.userId = data.userId;
      this.tokenExpiry = Date.now() + (data.expiresIn * 1000);

      this.storeToken();
      this.scheduleTokenRefresh();

      return {
        success: true,
        token: this.token,
        userId: this.userId,
        expiresIn: data.expiresIn,
      };
    } catch (error) {
      console.error('HCL Auth Error:', error);
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
      console.log('Token refreshed successfully');
      return result;
    } catch (error) {
      console.error('Token refresh failed:', error);
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
        console.log('Token refresh window approaching - dispatcher will handle');
        // Dispatch event for app to handle (requires credential storage)
        window.dispatchEvent(
          new CustomEvent('hcl-token-refresh-needed', {
            detail: { lifetime },
          })
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

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }

    this.clearStoredToken();
  }

  /**
   * Store token in session storage
   * Session storage: Cleared when browser closes (more secure)
   */
  storeToken() {
    try {
      const data = {
        token: this.token,
        userId: this.userId,
        expiry: this.tokenExpiry,
        storedAt: Date.now(),
      };
      sessionStorage.setItem('hcl_auth', JSON.stringify(data));
    } catch (e) {
      console.error('Failed to store token:', e);
    }
  }

  /**
   * Get stored token from session storage
   */
  getStoredToken() {
    try {
      const data = JSON.parse(sessionStorage.getItem('hcl_auth') || '{}');
      return data.token || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Get stored user ID
   */
  getStoredUserId() {
    try {
      const data = JSON.parse(sessionStorage.getItem('hcl_auth') || '{}');
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
      const data = JSON.parse(sessionStorage.getItem('hcl_auth') || '{}');
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
      sessionStorage.removeItem('hcl_auth');
    } catch (e) {
      console.error('Failed to clear token:', e);
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
    hclAuthService.isAuthenticated()
  ) || [false, null];

  const [token, setToken] = window.React?.useState(
    hclAuthService.getToken()
  ) || [null];

  // Listen for token refresh events
  window.React?.useEffect?.(() => {
    const handleRefresh = () => {
      setIsAuth(hclAuthService.isAuthenticated());
      setToken(hclAuthService.getToken());
    };

    window.addEventListener('hcl-token-refresh-needed', handleRefresh);
    return () => {
      window.removeEventListener('hcl-token-refresh-needed', handleRefresh);
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
  window.dispatchEvent(new CustomEvent('hcl-logout'));
}
