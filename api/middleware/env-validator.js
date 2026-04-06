/**
 * Environment Variable Validator
 * Ensures all required env vars are set on startup
 */

const REQUIRED_ENV_VARS = [
  'HCL_HOST',
  'HCL_STORE_ID',
  'HCL_AUTH_USERNAME',
  'HCL_AUTH_PASSWORD',
];

export const validateEnvVars = () => {
  const missing = REQUIRED_ENV_VARS.filter(v => !process.env[v]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease set these variables in your .env file');
    process.exit(1);
  }

  console.log('✅ All required environment variables present');
};
