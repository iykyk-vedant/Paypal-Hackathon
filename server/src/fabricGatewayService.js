import { createPrivateKey, randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ulid } from 'ulid';
import * as grpc from '@grpc/grpc-js';
import { connect, hash, signers } from '@hyperledger/fabric-gateway';

const utf8Decoder = new TextDecoder();
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pendingTradeDetails = new Map();
const validationCodeNames = { 0: 'VALID', 10: 'ENDORSEMENT_POLICY_FAILURE', 11: 'MVCC_READ_CONFLICT', 12: 'PHANTOM_READ_CONFLICT', 254: 'NOT_VALIDATED', 255: 'INVALID_OTHER_REASON' };

const identityPrefixes = {
  BankA1MSP: 'FABRIC_BANKA1',
  BankB1MSP: 'FABRIC_BANKB1',
};

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

async function loadConfig(identityMspId) {
  if (!enabled()) return null;
  const mspId = identityMspId || process.env.FABRIC_MSP_ID;
  const prefix = identityMspId && identityMspId !== process.env.FABRIC_MSP_ID
    ? identityPrefixes[identityMspId]
    : null;
  const required = ['FABRIC_HOST', 'FABRIC_TLS_SERVER_NAME'];
  if (!mspId) required.push('FABRIC_MSP_ID');
  if (identityMspId && !prefix && identityMspId !== process.env.FABRIC_MSP_ID) {
    throw new Error(`Write identity is not supported for MSP ${identityMspId}`);
  }
  const missing = required.filter((name) => !process.env[name]);
  const identityEnv = prefix
    ? {
      certBase64: `${prefix}_CERT_BASE64`,
      certFile: `${prefix}_CERT_FILE`,
      keyBase64: `${prefix}_KEY_BASE64`,
      keyFile: `${prefix}_KEY_FILE`,
    }
    : {
      certBase64: 'FABRIC_USER_CERT_BASE64',
      certFile: 'FABRIC_USER_CERT_FILE',
      keyBase64: 'FABRIC_USER_KEY_BASE64',
      keyFile: 'FABRIC_USER_KEY_FILE',
    };
  const [certificate, privateKeyPem, tlsRootCert] = await Promise.all([
    envBytes(identityEnv.certBase64, identityEnv.certFile),
    envBytes(identityEnv.keyBase64, identityEnv.keyFile),
    envBytes('FABRIC_TLS_CA_BASE64', 'FABRIC_TLS_CA_FILE'),
  ]);
  if (!certificate) missing.push(`${identityEnv.certBase64} or ${identityEnv.certFile}`);
  if (!privateKeyPem) missing.push(`${identityEnv.keyBase64} or ${identityEnv.keyFile}`);
  if (!tlsRootCert) missing.push('FABRIC_TLS_CA_BASE64 or FABRIC_TLS_CA_FILE');
  if (missing.length) throw new Error(`Fabric Gateway configuration is incomplete: ${missing.join(', ')}`);

  return {
    host: process.env.FABRIC_HOST,
    port: process.env.FABRIC_PEER_PORT || '9051',
    mspId,
    channel: process.env.FABRIC_CHANNEL || 'settlement',
    chaincode: process.env.FABRIC_CHAINCODE || 'settlement-cc',
    tlsServerName: process.env.FABRIC_TLS_SERVER_NAME,
    certificate,
    privateKey: createPrivateKey(privateKeyPem),
    tlsRootCert,
  };
}

async function withContract(callback, identityMspId) {
  const config = await loadConfig(identityMspId);
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
    endorseOptions: () => ({ deadline: Date.now() + 30000 }),
    submitOptions: () => ({ deadline: Date.now() + 30000 }),
    commitStatusOptions: () => ({ deadline: Date.now() + 30000 }),
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

function writesEnabled() {
  return enabled() && ['1', 'true', 'yes', 'on'].includes(String(process.env.FABRIC_GATEWAY_WRITE_ENABLED || '').toLowerCase());
}

async function identityConfigured(mspId) {
  try {
    return Boolean(await loadConfig(mspId));
  } catch {
    return false;
  }
}

export async function getFabricWriteStatus() {
  const bankAConfigured = await identityConfigured('BankA1MSP');
  const bankBConfigured = await identityConfigured('BankB1MSP');
  const enabledByOperator = writesEnabled();
  const writeTokenConfigured = String(process.env.FABRIC_WRITE_API_TOKEN || '').length >= 32;
  return {
    writesEnabled: enabledByOperator,
    writeTokenConfigured,
    writeReady: enabledByOperator && writeTokenConfigured && bankAConfigured && bankBConfigured,
    configuredWriteIdentities: { BankA1MSP: bankAConfigured, BankB1MSP: bankBConfigured },
  };
}

function validTradeId(tradeId) {
  return typeof tradeId === 'string' && /^T-[A-Za-z0-9_-]{6,80}$/.test(tradeId);
}

function positiveSafeAmount(value, field) {
  const amount = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error(`${field} must be a positive integer amount in minor units`);
  return amount;
}

function extractTradeValue(data, field) {
  if (!data || typeof data !== 'object') return undefined;
  if (Object.hasOwn(data, field)) return data[field];
  for (const value of Object.values(data)) {
    const found = extractTradeValue(value, field);
    if (found !== undefined) return found;
  }
  return undefined;
}

async function submitAndConfirm(contract, transactionName, options = {}) {
  const submitted = await contract.submitAsync(transactionName, options);
  const transactionId = submitted.getTransactionId();
  const result = decodeResult(submitted.getResult());
  let status;
  try {
    status = await submitted.getStatus({ deadline: Date.now() + 30000 });
  } catch (error) {
    error.transactionId = transactionId;
    error.commitStatusUnknown = true;
    throw error;
  }
  if (!status.successful) {
    const validationCode = validationCodeNames[status.code] || String(status.code);
    const error = new Error(`Fabric transaction committed with validation code ${validationCode}`);
    error.transactionId = transactionId;
    error.validationCode = validationCode;
    throw error;
  }
  return { transactionId, result, validationCode: validationCodeNames[status.code] || String(status.code), blockNumber: String(status.blockNumber) };
}

function requireWrites() {
  if (!writesEnabled()) throw new Error('Fabric writes are disabled. Set FABRIC_GATEWAY_WRITE_ENABLED=true after configuring rotated identities.');
}

export async function proposeFabricTrade(input) {
  requireWrites();
  const proposerMsp = input?.proposerMsp;
  if (!['BankA1MSP', 'BankB1MSP'].includes(proposerMsp)) throw new Error('proposerMsp must be BankA1MSP or BankB1MSP');
  const counterpartyMsp = proposerMsp === 'BankA1MSP' ? 'BankB1MSP' : 'BankA1MSP';
  const ccyA = String(input?.ccyA || '').toUpperCase();
  const ccyB = String(input?.ccyB || '').toUpperCase();
  const expectedCurrencies = proposerMsp === 'BankA1MSP' ? ['INR', 'SGD'] : ['SGD', 'INR'];
  if (ccyA !== expectedCurrencies[0] || ccyB !== expectedCurrencies[1]) {
    throw new Error(`Currency legs for ${proposerMsp} must be ${expectedCurrencies[0]}→${expectedCurrencies[1]}`);
  }
  const amountA = positiveSafeAmount(input?.amountA, 'amountA');
  const amountB = positiveSafeAmount(input?.amountB, 'amountB');
  const reference = String(input?.reference || 'Fabric demo trade').trim().slice(0, 160);
  const tradeId = `T-${ulid()}`;
  const now = Math.floor(Date.now() / 1000);
  const acceptBy = now + 600;
  const cutoff = now + 1200;
  const detail = {
    tradeId, ccyA, amountA, ccyB, amountB,
    proposer: proposerMsp,
    cparty: counterpartyMsp,
    fxRate: Number(amountB / amountA).toPrecision(8),
    reference,
    salt: randomBytes(16).toString('hex'),
  };
  const transientData = {
    detail: Buffer.from(JSON.stringify(detail)),
    salt: Buffer.from(randomBytes(16).toString('hex')),
  };
  const args = [tradeId, ccyA, String(amountA), ccyB, String(amountB), counterpartyMsp, String(acceptBy), String(cutoff)];

  const outcome = await withContract(
    (contract) => submitAndConfirm(contract, 'ProposeTrade', { arguments: args, transientData }),
    proposerMsp,
  );
  pendingTradeDetails.set(tradeId, { detail, createdAt: Date.now() });
  return { ...outcome, tradeId, proposerMsp, counterpartyMsp, acceptBy, cutoff, status: 'PROPOSED' };
}

export async function acceptFabricTrade(tradeId) {
  requireWrites();
  if (!validTradeId(tradeId)) throw new Error('Invalid Fabric trade ID');
  const pending = pendingTradeDetails.get(tradeId);
  if (!pending || Date.now() - pending.createdAt > 30 * 60 * 1000) {
    pendingTradeDetails.delete(tradeId);
    throw new Error('Transient trade details are unavailable. Propose a new trade from this running app session before accepting.');
  }
  const trade = await withContract((contract) => evaluate(contract, 'GetTrade', tradeId), pending.detail.cparty);
  const status = extractTradeValue(trade, 'status');
  const counterpartyMsp = extractTradeValue(trade, 'cparty') || extractTradeValue(trade, 'counterpartyMsp');
  if (status !== 'PROPOSED' || !identityPrefixes[counterpartyMsp]) {
    throw new Error('On-ledger trade is not a proposed BankA1/BankB1 trade; refusing acceptance.');
  }
  const detailBytes = Buffer.from(JSON.stringify(pending.detail));
  const transientData = { detail: detailBytes, salt: Buffer.from(randomBytes(16).toString('hex')) };
  const outcome = await withContract(
    (contract) => submitAndConfirm(contract, 'AcceptTrade', { arguments: [tradeId], transientData }),
    counterpartyMsp,
  );
  pendingTradeDetails.delete(tradeId);
  return { ...outcome, tradeId, status: 'ACCEPTED', acceptedAs: counterpartyMsp };
}

export async function settleFabricTrade(tradeId, confirmed) {
  requireWrites();
  if (!confirmed) throw new Error('confirmSettlement=true is required to submit a Fabric settlement');
  if (!validTradeId(tradeId)) throw new Error('Invalid Fabric trade ID');
  const trade = await withContract((contract) => evaluate(contract, 'GetTrade', tradeId), process.env.FABRIC_MSP_ID);
  const status = extractTradeValue(trade, 'status');
  const proposerMsp = extractTradeValue(trade, 'proposer') || 'BankA1MSP';
  if (status !== 'ACCEPTED' || !identityPrefixes[proposerMsp]) {
    throw new Error('On-ledger trade is not accepted or has no supported proposer; refusing settlement.');
  }
  const outcome = await withContract(
    (contract) => submitAndConfirm(contract, 'Settle', {
      arguments: [tradeId],
      endorsingOrganizations: ['RegAMSP', 'RegBMSP'],
    }),
    proposerMsp,
  );
  return { ...outcome, tradeId, status: 'SETTLED', endorsedBy: ['RegAMSP', 'RegBMSP'] };
}

export async function performFabricLegAction(tradeId, leg, operation, confirmed) {
  requireWrites();
  if (!confirmed) throw new Error('confirmSettlement=true is required to move Fabric ledger balances');
  if (!validTradeId(tradeId)) throw new Error('Invalid Fabric trade ID');
  if (!['A', 'B'].includes(leg)) throw new Error('Leg must be A or B');
  if (!['debit', 'credit'].includes(operation)) throw new Error('Operation must be debit or credit');

  const trade = await withContract((contract) => evaluate(contract, 'GetTrade', tradeId), process.env.FABRIC_MSP_ID);
  const status = extractTradeValue(trade, 'status');
  const proposerMsp = extractTradeValue(trade, 'proposer') || extractTradeValue(trade, 'proposerMsp');
  const counterpartyMsp = extractTradeValue(trade, 'cparty') || extractTradeValue(trade, 'counterpartyMsp');
  if (status !== 'SETTLED' || !identityPrefixes[proposerMsp] || !identityPrefixes[counterpartyMsp]) {
    throw new Error('The on-ledger trade must be SETTLED and identify both bank parties before balance movements.');
  }

  const isDebit = operation === 'debit';
  const signerMsp = leg === 'A'
    ? (isDebit ? proposerMsp : counterpartyMsp)
    : (isDebit ? counterpartyMsp : proposerMsp);
  const transactionName = isDebit ? 'SettleDebit' : 'CreditPayee';
  const outcome = await withContract(
    (contract) => submitAndConfirm(contract, transactionName, { arguments: [tradeId, leg] }),
    signerMsp,
  );
  return { ...outcome, tradeId, leg, operation, signedBy: signerMsp };
}

export async function getFabricGatewayStatus() {
  const writeStatus = await getFabricWriteStatus();
  if (!enabled()) {
    return {
      connected: false,
      gatewayConnected: false,
      mode: 'DEMO_FIXTURES',
      ledgerSource: 'SEEDED_SAMPLE_DATA',
      configured: false,
      ...writeStatus,
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
      mode: writeStatus.writeReady ? 'LIVE_READ_WRITE' : 'LIVE_READ_ONLY',
      ledgerSource: 'HYPERLEDGER_FABRIC_GATEWAY',
      endpoint: `${config.host}:${config.port}`,
      channelId: config.channel,
      chaincodeId: config.chaincode,
      mspId: config.mspId,
      probe: 'GetRules(JUR-A)',
      probeResult: result,
      ...writeStatus,
      connectionNote: writeStatus.writeReady
        ? 'Connected through Fabric Gateway. Read queries and explicitly enabled trade writes are available.'
        : 'Connected through Fabric Gateway for queries. Write actions require both bank identities and the write feature flag.',
    };
  } catch (error) {
    return {
      connected: false,
      gatewayConnected: false,
      configured: true,
      ...writeStatus,
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
