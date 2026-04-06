# HCL Commerce Backend Proxy API

Secure Node.js/Express proxy server that fronts HCL Commerce APIs for the EDS Storefront.

## Architecture

```
┌─────────────────────┐
│   EDS Storefront    │
│  (Preact + HTM)     │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│   Backend Proxy     │◄─── This API
│   (Node.js Express) │
└──────────┬──────────┘
           │ HTTPS
           ▼
┌─────────────────────┐
│  HCL Commerce v9+   │
│   (20.40.52.251)    │
└─────────────────────┘
```

## Purpose

1. **CORS Management** - Handles cross-origin requests from EDS Storefront
2. **Authentication** - Manages HCL `/loginidentity` API calls securely
3. **Credential Security** - Never exposes HCL credentials to frontend
4. **Token Management** - Caches and refreshes authentication tokens
5. **Error Handling** - Translates HCL errors to consistent response format

## Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.dist .env

# Edit .env with actual HCL credentials
# DO NOT commit .env to git
```

## Configuration

All configuration is via environment variables in `.env`:

- `NODE_ENV` - Environment (development|production)
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Allowed frontend origin
- `HCL_HOST` - HCL Commerce server URL
- `HCL_STORE_ID` - Numeric store ID
- `HCL_AUTH_USERNAME` - HCL login username
- `HCL_AUTH_PASSWORD` - HCL login password

## Running

### Development

```bash
# Install dependencies
npm install

# Start proxy server
node api/server.js

# Server will log startup confirmation:
# 🛒 HCL Commerce Proxy Server
# Status: ✅ RUNNING
# Port: 3001
```

### Production

```bash
# Build frontend and proxy
npm run build

# Set production env variables
export NODE_ENV=production

# Start with process manager (PM2, Systemd, etc.)
pm2 start api/server.js
```

## API Endpoints

### Authentication

#### POST `/api/hcl/login`

Authenticate user with HCL Commerce.

**Request:**
```json
{
  "username": "customer@example.com",
  "password": "password123"
}
```

**Response (200):**
```json
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "userId": "12345",
  "expiresIn": 1500
}
```

**Response (401):**
```json
{
  "error": {
    "status": 401,
    "message": "Authentication failed"
  }
}
```

### Cart Operations

#### POST `/api/hcl/cart/add`

Add product to cart.

**Request:**
```json
{
  "partNumber": "SKU123",
  "quantity": 1,
  "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

**Response (200):**
```json
{
  "success": true,
  "cart": {
    "orderId": "99999",
    "orderItems": [
      {
        "orderItemId": "1",
        "partNumber": "SKU123",
        "quantity": 1
      }
    ]
  }
}
```

#### GET `/api/hcl/cart?accessToken=...`

Get current cart for authenticated user.

**Response (200):**
```json
{
  "success": true,
  "cart": {
    "orderId": "99999",
    "orderItems": [...]
  }
}
```

#### DELETE `/api/hcl/cart/item/:orderId/:itemId?accessToken=...`

Remove item from cart.

**Response (200):**
```json
{
  "success": true,
  "cart": {...}
}
```

## Error Handling

All errors follow consistent format:

```json
{
  "error": {
    "status": 400,
    "message": "Description of error"
  },
  "requestId": "1234567890-abcdef",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

Common status codes:

- `400` - Bad Request (missing fields, invalid input)
- `401` - Unauthorized (invalid credentials)
- `404` - Not Found (product, cart, etc.)
- `500` - Internal Server Error (HCL API failure)

## Security Notes

### Development Only

⚠️ Current implementation uses `rejectUnauthorized: false` for HTTPS - this is **UNSAFE for production**.

### Production Checklist

- [ ] Fix HTTPS certificate validation
- [ ] Use secret management service (AWS Secrets Manager, HashiCorp Vault)
- [ ] Remove hardcoded credentials from .env
- [ ] Enable request validation (helmet.js)
- [ ] Add rate limiting
- [ ] Enable CORS restrictions
- [ ] Use HTTPS/TLS only
- [ ] Log audit trail without credentials
- [ ] Implement request signing for sensitive operations

## Testing

### Using cURL

```bash
# Test health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "auroraadobetest",
    "password": "passw0rd"
  }'

# Add to cart
curl -X POST http://localhost:3001/api/hcl/cart/add \
  -H "Content-Type: application/json" \
  -d '{
    "partNumber": "SKU123",
    "quantity": 1,
    "accessToken": "YOUR_TOKEN_HERE"
  }'
```

### Using Postman

Import the provided Postman collection:
- `docs/postman-collection.json`

## Troubleshooting

### "Connection refused" error

**Problem:** Can't reach HCL server
**Solution:**
1. Verify `HCL_HOST` in .env is correct
2. Check HCL server is running and accessible
3. Verify network/VPN connectivity

### "Authentication failed"

**Problem:** Login returns 401
**Solution:**
1. Verify `HCL_AUTH_USERNAME` and `HCL_AUTH_PASSWORD` in .env
2. Check credentials work directly with HCL
3. Verify HCL `/loginidentity` endpoint is responding

### "CORS error" in browser

**Problem:** Frontend can't call proxy
**Solution:**
1. Verify `CORS_ORIGIN` matches frontend origin exactly
2. Check proxy is running on correct `PORT`
3. Verify frontend is making requests to correct URL

## Next Steps

1. **Frontend Services** - Create auth/cart manager in `scripts/`
2. **UI Components** - Implement cart UI blocks
3. **Testing** - Integration tests against HCL staging
4. **Deployment** - Push to staging environment

## References

- [HCL Commerce API Documentation](https://www.ibm.com/docs/en/commerce)
- [Implementation Roadmap](../HCL_COMMERCE_IMPLEMENTATION_ROADMAP.md)
- [Quick Reference](../HCL_COMMERCE_QUICK_REFERENCE.md)
