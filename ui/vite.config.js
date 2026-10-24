import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    target: 'es2020',
    outDir: fileURLToPath(new URL('../public/native', import.meta.url)),
    emptyOutDir: true,
    lib: { entry: fileURLToPath(new URL('./src/main.jsx', import.meta.url)), formats: ['iife'], name: 'MessengerNativeBundle', fileName: () => 'messenger-native.js' },
    cssCodeSplit: false
  },
  esbuild: { jsx: 'automatic' }
});
