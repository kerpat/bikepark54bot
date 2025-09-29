
// Template for frontend configuration. 
// Copy this to config.js and fill in your actual values for each deployment.

window.APP_CONFIG = {
  // Supabase
  SUPABASE_URL: 'YOUR_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY',

  // Yandex Maps
  YANDEX_MAPS_API_KEY: 'YOUR_YANDEX_MAPS_API_KEY',

  // Base URL of the main Vercel deployment, used for redirects
  APP_BASE_URL: 'https://your-app-name.vercel.app',

  // URL for the separate server handling contracts (PDF generation)
  CONTRACTS_API_URL: 'https://your-contracts-server.onrender.com'
};
