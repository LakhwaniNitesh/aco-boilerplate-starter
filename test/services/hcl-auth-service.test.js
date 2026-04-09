import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Mock HCLAuthService for Testing
class HCLAuthServiceMock {
  constructor() {
    this.token = null;
    this.tokenExpiry = null;
    this.refreshToken = null;
    this.listeners = [];
    this.apiBaseUrl = "http://localhost:3001";
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error("Email and password required");
    }

    if (email === "invalid@test.com") {
      throw new Error("Invalid credentials");
    }

    const response = await fetch(`${this.apiBaseUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error("Login failed");
    }

    const data = await response.json();
    this.setToken(data.token, data.expiresIn || 3600);
    return data;
  }

  setToken(token, expiresInSeconds = 3600) {
    this.token = token;
    this.tokenExpiry = Date.now() + expiresInSeconds * 1000;
    sessionStorage.setItem("hcl_token", token);
    sessionStorage.setItem("hcl_token_expiry", this.tokenExpiry.toString());
    this.notifyListeners();
  }

  getToken() {
    if (this.isTokenExpired()) {
      this.logout();
      return null;
    }
    return this.token || sessionStorage.getItem("hcl_token");
  }

  isTokenExpired() {
    const expiry =
      this.tokenExpiry ||
      parseInt(sessionStorage.getItem("hcl_token_expiry"), 10);
    return !expiry || Date.now() > expiry;
  }

  isAuthenticated() {
    return !!this.getToken() && !this.isTokenExpired();
  }

  logout() {
    this.token = null;
    this.tokenExpiry = null;
    sessionStorage.removeItem("hcl_token");
    sessionStorage.removeItem("hcl_token_expiry");
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.isAuthenticated());
      } catch (error) {
        console.error("Error in auth listener:", error);
      }
    });
  }
}

describe("HCLAuthService Unit Tests", () => {
  let auth;

  beforeEach(() => {
    auth = new HCLAuthServiceMock();
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    auth.logout();
    sessionStorage.clear();
  });

  // Login Tests
  describe("login()", () => {
    it("should throw error when email is missing", async () => {
      await expect(auth.login("", "password")).rejects.toThrow(
        "Email and password required",
      );
    });

    it("should throw error when password is missing", async () => {
      await expect(auth.login("test@example.com", "")).rejects.toThrow(
        "Email and password required",
      );
    });

    it("should set token on successful login", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "test-token-123", expiresIn: 3600 }),
      });

      await auth.login("test@example.com", "password123");

      expect(auth.token).toBe("test-token-123");
      expect(auth.tokenExpiry).toBeGreaterThan(Date.now());
    });

    it("should store token in sessionStorage", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "test-token-123", expiresIn: 3600 }),
      });

      await auth.login("test@example.com", "password123");

      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "hcl_token",
        "test-token-123",
      );
      expect(sessionStorage.setItem).toHaveBeenCalledWith(
        "hcl_token_expiry",
        expect.any(String),
      );
    });

    it("should throw error on invalid credentials", async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        statusText: "Unauthorized",
      });

      await expect(
        auth.login("invalid@test.com", "wrongpassword"),
      ).rejects.toThrow("Login failed");
    });

    it("should notify listeners on successful login", async () => {
      const listener = jest.fn();
      auth.subscribe(listener);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: "test-token-123", expiresIn: 3600 }),
      });

      await auth.login("test@example.com", "password123");

      expect(listener).toHaveBeenCalledWith(true);
    });
  });

  // Token Management Tests
  describe("Token Management", () => {
    beforeEach(() => {
      auth.setToken("test-token", 3600);
    });

    it("should return current token", () => {
      const token = auth.getToken();

      expect(token).toBe("test-token");
    });

    it("should set token with custom expiry", () => {
      auth.setToken("new-token", 7200);

      expect(auth.token).toBe("new-token");
      expect(auth.tokenExpiry).toBeGreaterThan(Date.now() + 7000 * 1000);
    });

    it("should default to 1 hour expiry", () => {
      auth.setToken("test-token");

      const expectedExpiry = Date.now() + 3600 * 1000;
      expect(Math.abs(auth.tokenExpiry - expectedExpiry)).toBeLessThan(1000);
    });
  });

  // Token Expiry Tests
  describe("isTokenExpired()", () => {
    it("should return false for valid token", () => {
      auth.setToken("test-token", 3600);

      expect(auth.isTokenExpired()).toBe(false);
    });

    it("should return true for expired token", () => {
      auth.setToken("test-token", -1000); // Expired 1000 seconds ago

      expect(auth.isTokenExpired()).toBe(true);
    });

    it("should return true when no token set", () => {
      expect(auth.isTokenExpired()).toBe(true);
    });

    it("should return false for token expiring soon but not expired", () => {
      auth.setToken("test-token", 1); // Expires in 1 second

      expect(auth.isTokenExpired()).toBe(false);
    });
  });

  // Authentication Status Tests
  describe("isAuthenticated()", () => {
    it("should return false when no token", () => {
      expect(auth.isAuthenticated()).toBe(false);
    });

    it("should return true for valid token", () => {
      auth.setToken("test-token", 3600);

      expect(auth.isAuthenticated()).toBe(true);
    });

    it("should return false for expired token", () => {
      auth.setToken("test-token", -1000);

      expect(auth.isAuthenticated()).toBe(false);
    });

    it("should auto-logout on token check when expired", () => {
      auth.setToken("test-token", -1000);
      const result = auth.isAuthenticated();

      expect(result).toBe(false);
      expect(auth.token).toBeNull();
    });
  });

  // Logout Tests
  describe("logout()", () => {
    beforeEach(() => {
      auth.setToken("test-token", 3600);
    });

    it("should clear token", () => {
      auth.logout();

      expect(auth.token).toBeNull();
      expect(auth.isAuthenticated()).toBe(false);
    });

    it("should clear sessionStorage", () => {
      auth.logout();

      expect(sessionStorage.removeItem).toHaveBeenCalledWith("hcl_token");
      expect(sessionStorage.removeItem).toHaveBeenCalledWith(
        "hcl_token_expiry",
      );
    });

    it("should notify listeners on logout", () => {
      const listener = jest.fn();
      auth.subscribe(listener);

      auth.logout();

      expect(listener).toHaveBeenCalledWith(false);
    });
  });

  // Subscription Tests
  describe("subscribe()", () => {
    it("should notify listener on authentication change", () => {
      const listener = jest.fn();
      auth.subscribe(listener);

      auth.setToken("test-token", 3600);

      expect(listener).toHaveBeenCalledWith(true);
    });

    it("should unsubscribe listener", () => {
      const listener = jest.fn();
      const unsubscribe = auth.subscribe(listener);

      auth.setToken("test-token", 3600);
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      auth.setToken("new-token", 3600);
      expect(listener).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    it("should handle multiple listeners", () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();

      auth.subscribe(listener1);
      auth.subscribe(listener2);

      auth.setToken("test-token", 3600);

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    it("should handle listener errors gracefully", () => {
      const badListener = jest.fn(() => {
        throw new Error("Listener error");
      });
      const goodListener = jest.fn();

      auth.subscribe(badListener);
      auth.subscribe(goodListener);

      auth.setToken("test-token", 3600);

      expect(badListener).toHaveBeenCalledTimes(1);
      expect(goodListener).toHaveBeenCalledTimes(1);
    });
  });

  // SessionStorage Persistence Tests
  describe("SessionStorage Persistence", () => {
    it("should load token from sessionStorage", () => {
      const token = "persisted-token";
      const expiry = (Date.now() + 3600000).toString();

      sessionStorage.setItem("hcl_token", token);
      sessionStorage.setItem("hcl_token_expiry", expiry);

      const auth2 = new HCLAuthServiceMock();
      const retrievedToken = auth2.getToken();

      expect(retrievedToken).toBe(token);
    });

    it("should return null for expired persisted token", () => {
      const token = "persisted-token";
      const expiry = (Date.now() - 1000).toString(); // Expired

      sessionStorage.setItem("hcl_token", token);
      sessionStorage.setItem("hcl_token_expiry", expiry);

      const auth2 = new HCLAuthServiceMock();
      const retrievedToken = auth2.getToken();

      expect(retrievedToken).toBeNull();
    });
  });
});
