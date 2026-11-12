import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const action = process.argv[2];
if (!['start', 'stop'].includes(action)) throw new Error('Expected start or stop');
if (!existsSync(path.join(root, 'network/organizations')) || !existsSync(path.join(root, 'network/ccaas/package-ids.env'))) {
  console.error('Local Fabric is not initialized. Follow the first-time setup in README.md.');
  process.exit(1);
}
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
run('docker', ['info', '--format', '{{.ServerVersion}}']);
const chaincode = ['compose', '--env-file', 'network/ccaas/package-ids.env', '-f', 'docker-compose-cc.yml'];
if (action === 'start') {
  run('docker', ['compose', 'up', '-d']);
  run('docker', [...chaincode, 'up', '-d']);
  run(process.execPath, ['network/scripts/configure-local.mjs']);
  console.log('Restart the API to load the local Fabric configuration.');
} else {
  run('docker', [...chaincode, 'stop']);
  run('docker', ['compose', 'stop']);
}
