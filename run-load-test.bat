@echo off
REM HCL Load Test Runner
REM Starts backend proxy and runs load test

cd /d "c:\Users\MA432SL\OneDrive - EY\Documents\Projects\Adobe\ACO\aco-boilerplate-starter"

echo Starting backend proxy...
start /B node api/server.js

timeout /t 3 /nobreak

echo Running load test...
node api/load-test.mjs 10 100

echo.
echo Load test complete. Backend proxy is still running on port 3001.
echo Press Ctrl+C to stop the proxy.
