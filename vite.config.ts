import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/download': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/media': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },

  // ======================== BUILD OPTIMIZATIONS ========================
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Split vendor libs into separate cached chunks
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React — changes rarely, cached long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // UI framework
          'vendor-ui': ['framer-motion', 'lucide-react', '@tanstack/react-query'],
          // Editor.js (heavy, only used on create-post and admin)
          'vendor-editor': [
            '@editorjs/editorjs',
            '@editorjs/header',
            '@editorjs/image',
            '@editorjs/list',
            '@editorjs/code',
            '@editorjs/embed',
            '@editorjs/table',
            '@editorjs/quote',
            '@editorjs/marker',
            '@editorjs/delimiter',
            '@editorjs/checklist',
            '@editorjs/warning',
            '@editorjs/inline-code',
            '@editorjs/link',
            '@editorjs/raw',
            '@editorjs/underline',
            '@editorjs/attaches',
          ],
        },
      },
    },
    // Increase warning threshold for chunks
    chunkSizeWarningLimit: 600,
  },
}));
