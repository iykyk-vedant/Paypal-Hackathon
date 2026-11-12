import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const configPath = path.join(root, '.env.fabric.local');
const orgs = path.join(root, 'network/organizations/peerOrganizations');
function identity(org) {
  const domain = `${org}.consortium.local`;
  const base = path.join(orgs, domain, 'users', `User1@${domain}`, 'msp');
  const findOne = (dir) => {
    const full = path.join(base, dir);
    if (!existsSync(full)) throw new Error(`Missing ${full}. Initialize the local Fabric network first.`);
    const files = readdirSync(full).filter((name) => !name.startsWith('.'));
    if (files.length !== 1) throw new Error(`Expected one identity file in ${full}.`);
    return path.relative(root, path.join(full, files[0])).replaceAll('\\', '/');
  };
  return { cert: findOne('signcerts'), key: findOne('keystore') };
}
try {
  const a = identity('banka1');
  const b = identity('bankb1');
  const ca = 'network/organizations/peerOrganizations/banka1.consortium.local/peers/peer0.banka1.consortium.local/tls/ca.crt';
  if (!existsSync(path.join(root, ca))) throw new Error(`Missing local peer TLS certificate: ${ca}`);
  const existing = existsSync(configPath) ? readFileSync(configPath, 'utf8') : '';
  const token = existing.match(/^FABRIC_WRITE_API_TOKEN=(.+)$/m)?.[1] || randomBytes(32).toString('hex');
  const config = {
    FABRIC_GATEWAY_ENABLED: 'true', FABRIC_HOST: '127.0.0.1', FABRIC_PEER_PORT: '9051',
    FABRIC_TLS_SERVER_NAME: 'peer0.banka1.consortium.local', FABRIC_MSP_ID: 'BankA1MSP',
    FABRIC_CHANNEL: 'settlement', FABRIC_CHAINCODE: 'settlement-cc', FABRIC_TLS_CA_FILE: ca,
    FABRIC_BANKA1_CERT_FILE: a.cert, FABRIC_BANKA1_KEY_FILE: a.key,
    FABRIC_BANKB1_CERT_FILE: b.cert, FABRIC_BANKB1_KEY_FILE: b.key,
    FABRIC_GATEWAY_WRITE_ENABLED: 'true', FABRIC_WRITE_API_TOKEN: token,
  };
  writeFileSync(configPath, '# Generated local Fabric settings. Keep this file private.\n' + Object.entries(config).map(([k, v]) => `${k}=${v}`).join('\n') + '\n', { mode: 0o600 });
  console.log('Local Fabric settings written to .env.fabric.local. Restart the API to apply them.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
