// Lance scripts/verif-compta.ts : esbuild le compile en remplaçant firebase.ts par un bouchon (le vrai
// initializeAuth plante sous Node 24 avec firebase 12.18, et aucune fonction testée n'appelle Firestore).
//   node scripts/verif-compta-run.mjs
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';

const sortie = '.verif-compta-tmp.mjs';
await build({
  entryPoints: ['scripts/verif-compta.ts'], bundle: true, platform: 'node', format: 'esm', packages: 'external', outfile: sortie, logLevel: 'error',
  define: { 'import.meta.env': '{"MODE":"verif"}' },
  plugins: [{ name: 'bouchon-firebase', setup(b) {
    b.onResolve({ filter: /(^|\/)firebase$/ }, (a) => (a.path.endsWith('firebase') && a.path.startsWith('.') ? { path: a.path, namespace: 'bouchon' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'bouchon' }, () => ({ contents: 'export const app = {}; export const db = {}; export const storage = {}; export const auth = {};', loader: 'js' }));
  } }],
});
const r = spawnSync('node', [sortie], { stdio: 'inherit' });
rmSync(sortie, { force: true });
process.exit(r.status ?? 1);
