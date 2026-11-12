import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
try {
  const endpoint = process.argv[2];
  if (!endpoint) throw new Error('Usage: npm run fabric:render-config -- tcp://HOST:PORT');
  const url = new URL(endpoint);
  if (url.protocol !== 'tcp:' || !url.hostname || !url.port || url.username || url.password || (url.pathname && url.pathname !== '/') || url.search || url.hash) {
    throw new Error('Provide a raw TCP endpoint such as tcp://example.tcp.ngrok.io:12345.');
  }
  const port = Number(url.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid TCP port.');
  const configPath = path.join(root, '.env.fabric.local');
  const lines = readFileSync(configPath, 'utf8').split(/\r?\n/);
  const local = Object.fromEntries(lines.filter(line => /^FABRIC_[A-Z0-9_]+=/.test(line)).map(line => {
    const pos = line.indexOf('='); return [line.slice(0, pos), line.slice(pos + 1)];
  }));
  const encodeFile = (key) => {
    if (!local[key]) throw new Error(`Missing ${key} in .env.fabric.local; run npm run fabric:configure first.`);
    return readFileSync(path.resolve(root, local[key])).toString('base64');
  };
  if (!local.FABRIC_WRITE_API_TOKEN || local.FABRIC_WRITE_API_TOKEN.length < 32) throw new Error('A local Fabric write token of at least 32 characters is required.');
  const env = {
    FABRIC_GATEWAY_ENABLED: 'true', FABRIC_GATEWAY_WRITE_ENABLED: 'true',
    FABRIC_HOST: url.hostname, FABRIC_PEER_PORT: String(port),
    FABRIC_TLS_SERVER_NAME: local.FABRIC_TLS_SERVER_NAME, FABRIC_MSP_ID: local.FABRIC_MSP_ID,
    FABRIC_CHANNEL: local.FABRIC_CHANNEL, FABRIC_CHAINCODE: local.FABRIC_CHAINCODE,
    FABRIC_TLS_CA_BASE64: encodeFile('FABRIC_TLS_CA_FILE'),
    FABRIC_BANKA1_CERT_BASE64: encodeFile('FABRIC_BANKA1_CERT_FILE'),
    FABRIC_BANKA1_KEY_BASE64: encodeFile('FABRIC_BANKA1_KEY_FILE'),
    FABRIC_BANKB1_CERT_BASE64: encodeFile('FABRIC_BANKB1_CERT_FILE'),
    FABRIC_BANKB1_KEY_BASE64: encodeFile('FABRIC_BANKB1_KEY_FILE'),
    FABRIC_WRITE_API_TOKEN: local.FABRIC_WRITE_API_TOKEN,
  };
  for (const [key, value] of Object.entries(env)) if (!value) throw new Error(`Missing ${key} in local configuration.`);
  const output = path.join(root, '.env.fabric.render');
  writeFileSync(output, '# Private Render Fabric settings. Never commit or share this file.\n' + Object.entries(env).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600 });
  console.log('Created .env.fabric.render. Import it into the Render API Environment page; keep it private.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
