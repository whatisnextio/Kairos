import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'logo192.png', 'logo512.png'],
      manifest: {
        name: '12K - Your 12-Week Transformation',
        short_name: '12K',
        description: '12K: Your 12-week transformation. Powered by Kairos.',
        theme_color: '#0B0B0B',
        background_color: '#0B0B0B',
        display: 'standalone',
        start_url: '/#/',
        orientation: 'portrait-primary',
        icons: [
          { src: 'favicon.ico', sizes: '64x64 32x32 24x24 16x16', type: 'image/x-icon' },
          { src: 'logo192.png', type: 'image/png', sizes: '192x192', purpose: 'any' },
          { src: 'logo512.png', type: 'image/png', sizes: '512x512', purpose: 'any' },
          { src: 'logo512.png', type: 'image/png', sizes: '512x512', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-state': ['zustand'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'node',
    exclude: ['node_modules', 'e2e', 'kairos/node_modules'],
  },
});
