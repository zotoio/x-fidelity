import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/x-fidelity/rule-builder/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      // Ensure web-tree-sitter is properly bundled
      output: {
        manualChunks: {
          'tree-sitter': ['web-tree-sitter'],
        },
      },
    },
  },
  optimizeDeps: {
    // Include web-tree-sitter in optimization to ensure proper ESM interop
    include: ['web-tree-sitter'],
    esbuildOptions: {
      // Handle CommonJS to ESM conversion
      target: 'esnext',
    },
  },
  assetsInclude: ['**/*.wasm'],
});
