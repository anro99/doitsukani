import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  base: process.env.NODE_ENV === "production" ? "/doitsukani/" : "/",
  build: {
    sourcemap: true, // Enable source maps explicitly
  },
  server: {
    proxy: {
      '/api/deepl': {
        target: 'https://api-free.deepl.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/deepl/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('DeepL proxy error:', err);
          });
        }
      },
      '/api/deepl-pro': {
        target: 'https://api.deepl.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/deepl-pro/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('DeepL Pro proxy error:', err);
          });
        }
      }
    }
  }
});
