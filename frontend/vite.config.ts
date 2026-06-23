import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the warning limit since we're splitting chunks
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — cached aggressively by browsers
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Animation library — large, rarely changes
          'vendor-motion': ['framer-motion'],
          // Icon library — large, rarely changes
          'vendor-icons': ['lucide-react'],
          // Markdown rendering — only used on AI Agents page
          'vendor-markdown': ['react-markdown', 'remark-gfm'],
          // Supabase client — rarely changes
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
  },
})

