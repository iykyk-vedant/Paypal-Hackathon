import { createPrivateKey } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';

const utf8Decoder = new TextDecoder();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function enabled() {
  return ['1', 'true', 'yes', 'on'].includes(String(process.env.FABRIC_GATEWAY_ENABLED || '').toLowerCase());
}

function envBytes(base64Name, fileName) {
  const encoded = process.env[base64Name];
  if (encoded) return Buffer.from(encoded, 'base64');
  const file = process.env[fileName];
  if (!file) return null;
  return readFile(path.isAbsolute(file) ? file : path.resolve(projectRoot, file));
}

async function loadConfig() {
  if (!enabled()) return null;
  const required = ['FABRIC_HOST', 'FABRIC_MSP_ID', 'FABRIC_TLS_SERVER_NAME'];
  const missing = required.filter((name) => !process.env[name]);
  const [certificate, privateKeyPem, tlsRootCert] = await Promise.all([
    envBytes('FABRIC_USER_CERT_BASE64', 'FABRIC_USER_CERT_FILE'),
    envBytes('FABRIC_USER_KEY_BASE64', 'FABRIC_USER_KEY_FILE'),
    envBytes('FABRIC_TLS_CA_BASE64', 'FABRIC_TLS_CA_FILE'),
  ]);
  if (!certificate) missing.push('FABRIC_USER_CERT_BASE64 or FABRIC_USER_CERT_FILE');
  if (!privateKeyPem) missing.push('FABRIC_USER_KEY_BASE64 or FABRIC_USER_KEY_FILE');
  if (!tlsRootCert) missing.push('FABRIC_TLS_CA_BASE64 or FABRIC_TLS_CA_FILE');
  if (missing.length) throw new Error(`Fabric Gateway configuration is incomplete: ${missing.join(', ')}`);

  return {
    host: process.env.FABRIC_HOST,
    port: process.env.FABRIC_PEER_PORT || '9051',
    mspId: process.env.FABRIC_MSP_ID,
    channel: process.env.FABRIC_CHANNEL || 'settlement',
    chaincode: process.env.FABRIC_CHAINCODE || 'settlement-cc',
    tlsServerName: process.env.FABRIC_TLS_SERVER_NAME,
    certificate,
    privateKey: createPrivateKey(privateKeyPem),
    tlsRootCert,
  };
}

async function withContract(callback) {
  const config = await loadConfig();
  if (!config) throw new Error('Fabric Gateway is disabled. Set FABRIC_GATEWAY_ENABLED=true and configure a fresh identity.');

  const client = new grpc.Client(
    `${config.host}:${config.port}`,
    grpc.credentials.createSsl(config.tlsRootCert),
    {
      'grpc.ssl_target_name_override': config.tlsServerName,
      'grpc.default_authority': config.tlsServerName,
    },
  );
  const gateway = connect({
    client,
    identity: { mspId: config.mspId, credentials: config.certificate },
    signer: signers.newPrivateKeySigner(config.privateKey),
    hash: hash.sha256,
    evaluateOptions: () => ({ deadline: Date.now() + 10000 }),
  });

  try {
    const contract = gateway.getNetwork(config.channel).getContract(config.chaincode);
    return await callback(contract, config);
  } finally {
    gateway.close();
    client.close();
  }
}

function decodeResult(bytes) {
  const text = utf8Decoder.decode(bytes);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function evaluate(contract, transaction, ...args) {
  return decodeResult(await contract.evaluateTransaction(transaction, ...args));
}

function mspForOperator(operator = '') {
  const op = operator.toLowerCase();
  if (op.includes('rega')) return 'RegAMSP';
  if (op.includes('regb')) return 'RegBMSP';
  if (op.includes('b1')) return 'BankB1MSP';
  if (op.includes('aud')) return 'AuditorMSP';
  return 'BankA1MSP';
}

export async function getFabricGatewayStatus() {
  if (!enabled()) {
    return {
      connected: false,
      gatewayConnected: false,
      mode: 'DEMO_FIXTURES',
      ledgerSource: 'SEEDED_SAMPLE_DATA',
      configured: false,
      connectionNote: 'Fabric Gateway is disabled. The app is showing clearly labeled sample data.',
    };
  }

  try {
    const config = await loadConfig();
    const result = await withContract(async (contract) => evaluate(contract, 'GetRules', 'JUR-A'));
    return {
      connected: true,
      gatewayConnected: true,
      configured: true,
      mode: 'LIVE_READ_ONLY',
      ledgerSource: 'HYPERLEDGER_FABRIC_GATEWAY',
      endpoint: `${config.host}:${config.port}`,
      channelId: config.channel,
      chaincodeId: config.chaincode,
      mspId: config.mspId,
      probe: 'GetRules(JUR-A)',
      probeResult: result,
      connectionNote: 'Connected through Fabric Gateway using TLS-verified transport. This client exposes read-only query routes.',
    };
  } catch (error) {
    return {
      connected: false,
      gatewayConnected: false,
      configured: true,
      mode: 'GATEWAY_UNAVAILABLE',
      ledgerSource: 'SEEDED_SAMPLE_DATA',
      error: error.message,
      connectionNote: 'Gateway connection or read-only query failed; the app is still showing sample data.',
    };
  }
}

export async function getFabricLedgerSnapshot(operator) {
  return withContract(async (contract, config) => {
    const queries = {
      trades: () => evaluate(contract, 'ListTrades'),
      refusals: () => evaluate(contract, 'ListRefusals'),
      rulesJura: () => evaluate(contract, 'GetRules', 'JUR-A'),
      rulesJurb: () => evaluate(contract, 'GetRules', 'JUR-B'),
      reserveInr: () => evaluate(contract, 'GetReserve', 'INR'),
      reserveSgd: () => evaluate(contract, 'GetReserve', 'SGD'),
      supplyInr: () => evaluate(contract, 'GetSupply', 'INR'),
      supplySgd: () => evaluate(contract, 'GetSupply', 'SGD'),
      accountInr: () => evaluate(contract, 'GetAccount', 'INR', mspForOperator(operator)),
      accountSgd: () => evaluate(contract, 'GetAccount', 'SGD', mspForOperator(operator)),
    };

    const entries = await Promise.all(Object.entries(queries).map(async ([name, query]) => {
      try {
        return [name, { ok: true, data: await query() }];
      } catch (error) {
        return [name, { ok: false, error: error.message }];
      }
    }));

    return {
      mode: 'LIVE_READ_ONLY',
      source: 'HYPERLEDGER_FABRIC_GATEWAY',
      channelId: config.channel,
      chaincodeId: config.chaincode,
      queriedAs: { mspId: config.mspId, requestedAccountMspId: mspForOperator(operator) },
      queriedAt: new Date().toISOString(),
      queries: Object.fromEntries(entries),
      notice: 'Read-only chaincode query snapshot. It does not submit transactions or read Fabric block headers.',
    };
  });
}
