export function requireSuccessfulChaincodeResult(result, transactionName, transactionId, validationCode) {
  if (result && typeof result === 'object' && result.status === 'OK') return;
  const reason = typeof result?.reasonCode === 'string' ? result.reasonCode : 'UNKNOWN_RESULT';
  const error = new Error(`Fabric ${transactionName} did not succeed: ${reason}`);
  error.transactionId = transactionId;
  error.validationCode = validationCode;
  error.reasonCode = reason;
  throw error;
}
