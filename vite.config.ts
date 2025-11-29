import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Allow Vite to prebundle lucide-react for faster dev cold starts
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // ========================================
      // LOCAL n8n PROXY - ACTIVE (For Demo)
      // ========================================
      '/api/n8n/ai-summary': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/n8n\/ai-summary/, '/webhook/ai-summary'),
      },
      '/api/n8n/report-chat': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/n8n\/report-chat/, '/webhook/report-chat'),
      },
      '/api/n8n/appointment-notification': {
        target: 'http://localhost:5678',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api\/n8n\/appointment-notification/, '/webhook/appointment-notification'),
      },

      // ========================================
      // CLOUD n8n - NO PROXY NEEDED (Commented for demo)
      // ========================================
    },
  },
});