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
  server: {
    proxy: {
      '/api/deepl': {
        target: 'https://api-free.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepl/, ''),
        headers: {
          'Origin': 'https://api-free.deepl.com'
        }
      },
      '/api/deepl-pro': {
        target: 'https://api.deepl.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepl-pro/, ''),
        headers: {
          'Origin': 'https://api.deepl.com'
        }
      }
    }
  }
});
