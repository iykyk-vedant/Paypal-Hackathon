import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const destination = resolve(root, 'apimatic/src/spec/openapi.yaml');

await mkdir(dirname(destination), { recursive: true });
await copyFile(resolve(root, 'openapi.yaml'), destination);
console.log('Synced root openapi.yaml to the APIMatic portal project.');
