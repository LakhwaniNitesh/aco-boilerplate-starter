# Test HCL Commerce Login Endpoint
# This script tests the HCL REST API directly to see the actual error

param(
    [string]$HclHost = "https://20.40.52.251",
    [string]$StoreId = "715842834",
    [string]$Username = "auroraadobetest",
    [string]$Password = "passw0rd"
)

Write-Host "=== HCL Commerce Login Test ===" -ForegroundColor Cyan
Write-Host ""

# Test endpoint 1: /store/{storeId}/loginidentity
$endpoint1 = "$HclHost/store/$StoreId/loginidentity"
Write-Host "Testing Primary Endpoint:" -ForegroundColor Yellow
Write-Host "  URL: $endpoint1" -ForegroundColor White
Write-Host "  Method: POST" -ForegroundColor White
Write-Host "  Body: { logonId: '$Username', password: '***' }" -ForegroundColor White
Write-Host ""

try {
    $body = @{
        logonId = $Username
        password = $Password
    } | ConvertTo-Json
    
    Write-Host "Sending request..." -ForegroundColor Cyan
    
    [System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }
    
    $response = Invoke-WebRequest -Uri $endpoint1 `
        -Method POST `
        -Headers @{ 'Content-Type' = 'application/json'; 'Accept' = 'application/json' } `
        -Body $body `
        -TimeoutSec 10 `
        -ErrorAction SilentlyContinue
    
    if ($response) {
        Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor White
        Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 5) -ForegroundColor Green
    } else {
        Write-Host "No response received" -ForegroundColor Red
    }
    
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Diagnostic Information ===" -ForegroundColor Cyan
Write-Host "If you see 'tenant not found or not accessible':" -ForegroundColor Yellow
Write-Host "  1. Verify HCL_HOST is correct: $HclHost" -ForegroundColor White
Write-Host "  2. Verify HCL_STORE_ID exists: $StoreId" -ForegroundColor White
Write-Host "  3. Check if user exists in HCL: $Username" -ForegroundColor White
Write-Host "  4. Try alternative endpoint path" -ForegroundColor White
Write-Host ""
Write-Host "Alternative endpoint to try:" -ForegroundColor Yellow
Write-Host "  POST $HclHost/identity/v1/customers/login" -ForegroundColor White
