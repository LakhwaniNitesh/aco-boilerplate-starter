/**
 * Mock HCL Authentication for Development
 *
 * Provides fake authentication when HCL Commerce is not accessible.
 * Use for local testing, development, and staging environments.
 *
 * In production, use real HCL Commerce authentication.
 */

export const mockHCLAuth = {
  /**
   * Mock user database for development
   *
   * Test credentials provided:
   * - auroraadobetest / passw0rd
   * - adobetest1 / passw0rd
   * - adobetest2 / passw0rd
   */
  mockUsers: {
    auroraadobetest: {
      password: "passw0rd",
      userId: "user-123",
      email: "aurora@example.com",
      firstName: "Aurora",
      lastName: "Test",
      displayName: "Aurora Test User",
    },
    adobetest1: {
      password: "passw0rd",
      userId: "user-456",
      email: "adobetest1@example.com",
      firstName: "Adobe",
      lastName: "Test 1",
      displayName: "Adobe Test 1",
    },
    adobetest2: {
      password: "passw0rd",
      userId: "user-789",
      email: "adobetest2@example.com",
      firstName: "Adobe",
      lastName: "Test 2",
      displayName: "Adobe Test 2",
    },
  },

  /**
   * Mock token storage (in-memory for this session)
   */
  tokens: new Map(),

  /**
   * Generate a fake JWT-like token
   * NOT a real JWT, just looks like one for testing
   */
  generateToken(userId, username) {
    const header = Buffer.from(
      JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64");
    const payload = Buffer.from(
      JSON.stringify({
        sub: userId,
        username: username,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 1500, // 25 minutes
      }),
    ).toString("base64");
    const signature = Buffer.from("mock-signature-" + Date.now()).toString(
      "base64",
    );

    const token = `${header}.${payload}.${signature}`;
    this.tokens.set(token, {
      userId,
      username,
      expiresAt: Date.now() + 1500 * 1000,
    });

    return token;
  },

  /**
   * Login with mock credentials
   * Returns token if credentials are valid
   */
  login(username, password) {
    if (!username || !password) {
      const error = new Error("Missing username or password");
      error.status = 400;
      throw error;
    }

    const user = this.mockUsers[username];

    if (!user) {
      const error = new Error("User not found");
      error.status = 401;
      throw error;
    }

    if (user.password !== password) {
      const error = new Error("Invalid password");
      error.status = 401;
      throw error;
    }

    // Generate and return token
    const token = this.generateToken(user.userId, username);

    console.log(`[MOCK-AUTH] ✓ Login successful for user: ${username}`);

    return {
      success: true,
      token,
      userId: user.userId,
      email: user.email,
      name: user.name,
      expiresIn: 1500,
    };
  },

  /**
   * Validate a token
   * Returns user info if token is valid
   */
  validateToken(token) {
    if (!token) {
      const error = new Error("Token is required");
      error.status = 401;
      throw error;
    }

    const tokenData = this.tokens.get(token);

    if (!tokenData) {
      const error = new Error("Token not found or invalid");
      error.status = 401;
      throw error;
    }

    if (tokenData.expiresAt < Date.now()) {
      this.tokens.delete(token);
      const error = new Error("Token has expired");
      error.status = 401;
      throw error;
    }

    console.log(
      `[MOCK-AUTH] ✓ Token validated for user: ${tokenData.username}`,
    );

    return tokenData;
  },

  /**
   * Logout - remove token
   */
  logout(token) {
    if (this.tokens.has(token)) {
      this.tokens.delete(token);
      console.log("[MOCK-AUTH] ✓ Logout successful");
      return { success: true };
    }

    return { success: true }; // Don't error even if token doesn't exist
  },

  /**
   * Get available mock users (for testing)
   */
  getAvailableUsers() {
    return Object.keys(this.mockUsers).map((username) => ({
      username,
      password: this.mockUsers[username].password,
      email: this.mockUsers[username].email,
    }));
  },
};

export default mockHCLAuth;
