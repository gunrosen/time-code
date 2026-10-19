import { defineConfig } from 'vite';

// Relative base so the build works on any host path (Vercel, sub-paths) and locally.
export default defineConfig({
  base: './',
});
