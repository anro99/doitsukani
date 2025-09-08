import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/postcss";
import autoprefixer from "autoprefixer";

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
    // Vite 7 optimizations
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-checkbox', '@radix-ui/react-label', '@radix-ui/react-progress'],
          utils: ['axios', 'jotai', 'clsx', 'tailwind-merge']
        }
      }
    }
  },
  css: {
    // PostCSS configuration for TailwindCSS 4
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer,
      ],
    },
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
