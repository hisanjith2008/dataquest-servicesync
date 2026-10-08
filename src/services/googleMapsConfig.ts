// Google Maps Platform Configuration & Constants
// Adheres to Google Maps Platform Skills standard for AI Studio

export const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyB7WpXoI9_lsZPWqksTOuhZ8bmqII_lPRQ';

export const GMP_MAP_ID = 'DEMO_MAP_ID';
export const GMP_ATTRIBUTION_ID = 'gmp_mcp_codeassist_v1_aistudio';
