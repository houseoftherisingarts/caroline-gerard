// Config Vite à part pour scripts/qa-factures-2.cjs : bâtit qa-factures.html seul dans dist-verif-factures-2,
// sans toucher à vite.config.ts ni au dist-verif de l'autre harnais. Lancer avec --mode verif.
import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const RACINE = path.resolve(__dirname, '..');

export default defineConfig({
  root: RACINE,
  plugins: [react()],
  build: {
    outDir: path.resolve(RACINE, 'dist-verif-factures-2'),
    emptyOutDir: false,
    rollupOptions: {
      input: path.resolve(RACINE, 'qa-factures.html'),
    },
  },
  resolve: {
    alias: {
      '@': RACINE,
    },
  },
});
