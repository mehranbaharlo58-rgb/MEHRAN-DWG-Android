import { cp, mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = path.join(root, 'node_modules', '@mlightcad', 'libredwg-web', 'wasm');
const target = path.join(root, 'public', 'libredwg');
await access(path.join(source, 'libredwg-web.js'), constants.R_OK);
await access(path.join(source, 'libredwg-web.wasm'), constants.R_OK);
await mkdir(target, { recursive: true });
await cp(source, target, { recursive: true, force: true });
console.log('Bundled LibreDWG WebAssembly assets into public/libredwg for offline use.');
