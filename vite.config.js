import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // Disable source maps for production
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          mui: ['@mui/material', '@emotion/react', '@emotion/styled']
        }
      }
    }
  },
  server: {
    proxy: {
      // Proxy health check to local backend
      '/api/health': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path, // no rewrite needed
      },
      // Proxy database API to local Express backend
      '/api/database': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path, // no rewrite needed
      },
      // Proxy all other /api requests to SOAP server
      '/api': {
        target: 'https://int1aa.azurewebsites.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        configure: (proxy, options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('Origin', 'https://int1aa.azurewebsites.net');
          });
        }
      }
    }
  },
  define: {
    // Ensure environment variables are available
    __DEVELOPMENT__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
