import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    open: true
  },
  base: '/pingpong/',
  build: {
    outDir: 'dist'
  }
}); 