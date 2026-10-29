import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps motif and isen paths relative, so dist/ works from any folder or sub-path.
// VITE_PARTNER_URL (optional) points the design partner at an endpoint you host; see server/partner-proxy.mjs.
export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __PARTNER_URL__: JSON.stringify(process.env.VITE_PARTNER_URL || '') },
});
