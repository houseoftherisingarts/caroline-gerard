import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const racine = path.resolve(__dirname, '../../..');
export default defineConfig({
  root: racine,
  server: { port: 5199, host: '127.0.0.1' },
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^(\.\.\/)+lib\/firestore$/, replacement: path.resolve(__dirname, 'firestore-stub.ts') },
      { find: '@', replacement: racine },
    ],
  },
});
