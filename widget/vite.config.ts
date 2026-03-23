import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'SomniaGate',
      fileName: () => 'embed.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    minify: true,
  },
});
