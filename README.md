# ACO Boilerplate Starter - HCL Commerce Integration

A modern e-commerce storefront built with Edge Delivery Services (EDS) and integrated with HCL Commerce using a three-tier architecture (Frontend → Proxy → Backend).

## Quick Start

```bash
# Install dependencies
npm install

# Start local development (all three servers)
npm run dev:all

# Or start individually:
npm run dev:frontend   # Port 3000 - EDS blocks
npm run dev:proxy      # Port 3001 - API gateway
npm run dev:backend    # Connects to remote HCL SaaS
```

## Project Structure

```
aco-boilerplate-starter/
├── docs/                    # 📚 All documentation (115+ files)
│   ├── ARCHITECTURE_EXPLAINED.md          # 3-tier architecture with diagrams
│   ├── HCL_COMMERCE_INTEGRATION_SUMMARY.md # Executive overview & file roles
│   ├── QUICK_DEPLOYMENT_GUIDE.md          # Production deployment (5 platforms)
│   └── ... 112 more documentation files
├── web-src/                 # Frontend EDS blocks & components
├── api/                     # Proxy server API routes
│   ├── controllers/         # Express route handlers
│   ├── utils/              # HCL client & helpers
│   └── ...
├── actions/                # Backend runtime actions
├── package.json            # Dependencies & scripts
└── app.config.yaml         # Configuration file
```

## Documentation

All documentation is organized in the `docs/` folder. Start here:

### 🚀 **Getting Started**
- **[Quick Deployment Guide](./docs/QUICK_DEPLOYMENT_GUIDE.md)** - Deploy to production (Azure, AWS, GCP, Heroku, Docker)
- **[Architecture Explained](./docs/ARCHITECTURE_EXPLAINED.md)** - Understand the three-tier system with visual diagrams
- **[HCL Commerce Integration Summary](./docs/HCL_COMMERCE_INTEGRATION_SUMMARY.md)** - Complete overview with file roles

### 🏗️ **Architecture**
- Why three servers (frontend, proxy, backend)
- How CORS is handled
- Data flow examples (login, cart, checkout)
- Technology stack

### 🔧 **Development**
- Local development setup
- Testing procedures
- Common issues & troubleshooting
- Token management (WCToken, WCTrustedToken, JSESSIONID)

### 📦 **Deployment**
- Azure App Service deployment
- AWS Elastic Beanstalk
- Google Cloud Platform
- Heroku
- Docker containerization

### 🎯 **Key Features**
- ✅ User login with HCL Commerce authentication
- ✅ Product catalog & category browsing
- ✅ Shopping cart (add, remove, update)
- ✅ Mini-cart display
- ✅ Multi-currency & tax support
- ✅ Session persistence

## Architecture Overview

```
BROWSER (Port 3000)
    ↓ HTTPS (localhost)
NODE.JS PROXY (Port 3001)
    ↓ HTTPS (cloud)
HCL COMMERCE SAAS (Remote)
```

**Why Three Servers:**
1. **Frontend** - Beautiful UI, global caching
2. **Proxy** - Token management, data transformation, business logic
3. **Backend** - HCL Commerce SaaS (managed by HCL Inc.)

## Authentication

### WCToken & WCTrustedToken
```javascript
// After login, tokens are stored on the proxy server
// They are URL-encoded and sent as HTTPS headers
Headers: {
  WCToken: "1007002%2CtVXIh...",
  WCTrustedToken: "1007002%2CtdCdQrS...",
  Cookie: "JSESSIONID=0000seUZ5..."
}
```

### Session Management
```javascript
// Cookies are stored in the proxy's cookie jar
JSESSIONID = "0000seUZ5q2FgWV..."  // Session ID
WC_PERSISTENT = "..."                 // Persistent auth cookie
```

## Configuration

### Environment Variables
Create a `.env` file in the root:

```bash
# HCL Commerce
HCL_STORE_ID=715842834
HCL_BASE_URL=https://20.40.52.251/wcs/resources/store/715842834/
HCL_CATALOG_ID=3074457345616692369

# Proxy Server
PROXY_PORT=3001
CORS_ORIGIN=http://localhost:3000

# Frontend
FRONTEND_PORT=3000
```

See `env.dist` for all available options.

## Common Tasks

### Add a New Product Block
1. Create block in `web-src/blocks/my-block/`
2. Update `web-src/blocks/block-metadata.js`
3. Add CSS and JavaScript
4. Test at `http://localhost:3000`

### Add a New API Route
1. Create controller in `api/controllers/`
2. Add route in `api/server.js`
3. Test with curl or Postman
4. Deploy with `npm run deploy`

### Fix an Integration Issue
1. Check proxy logs: `npm run dev:proxy`
2. Verify HCL endpoint: See `docs/ARCHITECTURE_EXPLAINED.md`
3. Check token format: `docs/HCL_AUTHENTICATION_GUIDE.md`

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cart shows $0.00 | Proxy needs to fetch fresh cart after deletion |
| 401 Unauthorized | Token expired or malformed, need to re-login |
| 404 Not Found | Wrong endpoint path or query parameters |
| CORS error | Frontend not allowed to call HCL directly |
| Product names missing | Ensure product data is properly normalized |

See `docs/HCL_TROUBLESHOOTING.md` for detailed troubleshooting.

## API Endpoints

### Frontend → Proxy Endpoints

```
POST   /api/hcl/login              # User login
GET    /api/hcl/cart               # Get cart
POST   /api/hcl/cart/add           # Add item
DELETE /api/hcl/cart/remove        # Remove item
GET    /api/hcl/products           # Product list
GET    /api/hcl/product/:id        # Product details
GET    /api/hcl/categories         # Category list
```

### Proxy → HCL Commerce Endpoints

```
POST   /login                      # Authenticate
GET    /cart/@self                 # Get cart
PUT    /cart/@self                 # Update cart
PUT    /cart/@self/delete_order_item  # Remove item
GET    /products                   # Product catalog
GET    /categories                 # Categories
```

## Testing

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Load testing
npm run test:load
```

## Deployment

### Quick Deploy (Azure)
```bash
npm run deploy:azure
```

### Full Deployment Process
1. Update `.env.production`
2. Run tests: `npm test`
3. Build: `npm run build`
4. Deploy: `npm run deploy`
5. Verify: `npm run verify`

See `docs/QUICK_DEPLOYMENT_GUIDE.md` for platform-specific steps.

## Performance

- **Frontend**: Served via EDS (global CDN)
- **Proxy**: Horizontal scaling with load balancer
- **Backend**: Auto-scaling by HCL Inc.

### Caching Strategy
```javascript
// Products cached for 5 minutes
GET /api/hcl/products
Cache-Control: max-age=300

// Cart is never cached (real-time)
GET /api/hcl/cart
Cache-Control: no-cache

// Static assets cached 1 year (EDS)
Cache-Control: max-age=31536000
```

## Security

✅ **Implemented:**
- IMS OAuth 2.0 authentication
- HTTPS/TLS encryption (both proxy → HCL and frontend → proxy)
- Token rotation & refresh
- CORS protection
- Input validation & sanitization
- SQL injection prevention
- XSS protection
- CSRF tokens

🔒 **Never:**
- Hardcode credentials in code
- Expose tokens to browser (except short-term session tokens)
- Log PII or sensitive data
- Disable HTTPS

## Development Team

Built by: EY & Adobe Teams  
Started: April 2026  
Status: Production Ready

## Support

- **Questions?** See `docs/START_HERE.md`
- **Errors?** Check `docs/HCL_TROUBLESHOOTING.md`
- **Architecture?** Read `docs/ARCHITECTURE_EXPLAINED.md`
- **Deploy?** Follow `docs/QUICK_DEPLOYMENT_GUIDE.md`

## License

See `LICENSE` file for details.

---

**📍 Project Root:** `c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter\`

**📚 Documentation:** `./docs/` (115+ files)

**🚀 Get Started:** `npm install && npm run dev:all`
