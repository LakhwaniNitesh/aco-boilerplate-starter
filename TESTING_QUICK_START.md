# Quick Start - Testing Your Cart Implementation

## 🚀 Start Here: Run Tests in 2 Minutes

### Step 1: Start the Backend Server
Open a terminal and run:
```bash
npm run start:proxy
```

You should see:
```
✓ Server running on http://localhost:3001
✓ Health check: http://localhost:3001/health
```

### Step 2: Run Tests (New Terminal Window)
```bash
# Run all tests
node api/test-cart.mjs

# Or run specific phase:
node api/test-cart.mjs 1    # Phase 1: Connectivity
node api/test-cart.mjs 2    # Phase 2: Authentication
node api/test-cart.mjs 3    # Phase 3: Cart Operations
node api/test-cart.mjs 4    # Phase 4: Error Handling
```

## 📋 What Gets Tested

### Phase 1: Connectivity ✅
- Server is running
- Health endpoint responds
- Basic HTTP connectivity

**Expected Output:**
```
✓ Server is running and healthy
ℹ Environment: development
```

### Phase 2: Authentication
- Login with valid credentials → Returns token
- Login with invalid credentials → Shows error
- Token stored properly

**Expected Output:**
```
✓ Login successful
ℹ Token received: eyJhbGciOiJ...
✓ Correctly rejected invalid credentials
```

### Phase 3: Cart Operations
- Add product → Cart updated
- Get cart → Returns all items
- Clear cart → All items removed

**Expected Output:**
```
✓ Product added to cart
ℹ Cart total: $100.00
✓ Cart retrieved successfully
✓ Cart cleared successfully
```

### Phase 4: Error Handling
- Missing required fields → Error shown
- Invalid quantity → Handled gracefully
- Timeout scenarios → Timeout error

**Expected Output:**
```
✓ Correctly rejected invalid request
ℹ Error: Missing required field: partNumber
```

## 📊 Test Results Summary

After all tests complete, you'll see:

```
============================================================
  TEST SUMMARY
============================================================

Total Tests: 12
Passed: 12 ✓
Failed: 0

✓ All tests passed!

Next Steps:
1. If all tests pass: Test frontend components
2. Check TESTING_PLAN.md for more test scenarios
3. Review server logs for any warnings
4. Test authentication token management
```

## 🔧 Troubleshooting

### Error: "Cannot reach server"
**Solution:**
1. Check if server is running: `npm run start:proxy`
2. Verify port 3001 is free:
   ```bash
   netstat -ano | findstr :3001
   ```
3. Kill process on 3001 if needed:
   ```bash
   taskkill /PID <PID> /F
   ```

### Error: "Login failed"
**Solution:**
1. Check credentials in test file (auroraadobetest / passw0rd)
2. Verify HCL Commerce is accessible
3. Check environment variables:
   ```bash
   echo %HCL_HOST%
   ```

### Error: "Add to cart failed"
**Solution:**
1. Verify backend is running
2. Check server logs for error messages
3. Test Phase 1 first to verify connectivity

## 📝 Manual Testing (Without Test Script)

If you prefer manual testing, use curl:

### Health Check
```bash
curl http://localhost:3001/health
```

### Login
```bash
curl -X POST http://localhost:3001/api/hcl/login \
  -H "Content-Type: application/json" \
  -d '{"username":"auroraadobetest","password":"passw0rd"}'
```

### Add to Cart
```bash
curl -X POST http://localhost:3001/api/hcl/cart/add \
  -H "Content-Type: application/json" \
  -d '{
    "partNumber":"SKU-123",
    "name":"Test Product",
    "price":100,
    "quantity":1,
    "accessToken":"your-token-here"
  }'
```

### Get Cart
```bash
curl "http://localhost:3001/api/hcl/cart?accessToken=your-token-here"
```

### Clear Cart
```bash
curl -X DELETE http://localhost:3001/api/hcl/cart/clear
```

## 🎯 After Testing

Once all tests pass:

1. **Move to Phase 2: Authentication Token Management**
   - Implement login/logout UI
   - Store token in sessionStorage
   - Clear token on logout

2. **Move to Phase 3: Error Handling**
   - Add try-catch around cart operations
   - Show user-friendly error messages
   - Implement retry logic

3. **Test Frontend Components**
   - Add product via PDP
   - Check mini-cart updates
   - Navigate to cart page
   - Verify items display

4. **Full End-to-End Journey**
   - Login → Add Item → View Cart → Logout
   - Check for any issues
   - Monitor server logs

## 📚 Additional Resources

- **Full Testing Plan:** `TESTING_PLAN.md`
- **Migration Summary:** `CART_MIGRATION_SUMMARY.md`
- **Action Items:** `CART_MIGRATION_ACTION_ITEMS.md`
- **Server Logs:** Check console output from `npm run start:proxy`

## ⏱️ Estimated Time

- Phase 1: ~5 seconds
- Phase 2: ~3 seconds
- Phase 3: ~10 seconds
- Phase 4: ~3 seconds
- **Total: ~20 seconds**

## 📞 Support

If tests fail:

1. Review error messages carefully
2. Check `TESTING_PLAN.md` for expected behavior
3. Review server logs from `npm run start:proxy`
4. Verify network connectivity to HCL Commerce VM
5. Check environment variables in `.env`

---

**Ready?** Run this and report any failures:

```bash
npm run start:proxy &
node api/test-cart.mjs
```
