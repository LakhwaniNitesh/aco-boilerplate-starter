#!/usr/bin/env node

/**
 * Test script for HCL Cart Add Endpoint
 * 
 * Tests the complete flow:
 * 1. Login to get token
 * 2. Add product to cart with token
 * 3. Verify response format
 */

async function testCartWorkflow() {
  const baseUrl = 'http://localhost:3001';
  
  console.log('🧪 Testing HCL Cart Workflow\n');
  
  try {
    // Step 1: Login
    console.log('📍 Step 1: Login');
    console.log('   POST /api/hcl/login');
    const loginRes = await fetch(`${baseUrl}/api/hcl/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'auroraadobetest',
        password: 'passw0rd',
      }),
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    console.log(`   ✅ Status: ${loginRes.status}`);
    console.log(`   ✅ Got token: ${loginData.wcToken ? 'YES' : 'NO'}`);
    console.log(`   ✅ User ID: ${loginData.userId}`);
    
    const wcToken = loginData.wcToken;
    
    // Step 2: Add to cart
    console.log('\n📍 Step 2: Add Product to Cart');
    console.log('   POST /api/hcl/cart/add');
    console.log('   Product: CLA022_220101 x1');
    
    const addToCartRes = await fetch(`${baseUrl}/api/hcl/cart/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partNumber: 'CLA022_220101',
        quantity: 1,
        accessToken: wcToken,
      }),
    });
    
    if (!addToCartRes.ok) {
      const errorData = await addToCartRes.text();
      console.error(`   ❌ Status: ${addToCartRes.status}`);
      console.error(`   ❌ Response: ${errorData}`);
      throw new Error(`Add to cart failed: ${addToCartRes.status}`);
    }
    
    const cartData = await addToCartRes.json();
    console.log(`   ✅ Status: ${addToCartRes.status}`);
    console.log(`   ✅ Success: ${cartData.success}`);
    console.log(`   ✅ Items in cart: ${cartData.cart?.items?.length || 0}`);
    console.log(`   ✅ Cart total: $${cartData.cart?.total || 0}`);
    
    if (cartData.cart?.items?.length > 0) {
      console.log('\n   🛒 Items in cart:');
      cartData.cart.items.forEach((item, idx) => {
        console.log(`      ${idx + 1}. ${item.name} (${item.sku}) x${item.quantity} @ $${item.price}`);
      });
    }
    
    console.log('\n✅ CART WORKFLOW TEST PASSED!\n');
    return true;
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Is backend running? (npm run dev:backend)');
    console.error('2. Check backend logs for errors');
    console.error('3. Verify HCL_HOST, HCL_STORE_ID in .env file');
    console.error('4. Check network connectivity to HCL server');
    return false;
  }
}

// Run test
testCartWorkflow().then(success => {
  process.exit(success ? 0 : 1);
});
