// Corridor Rules, FX Rates, and Risk Limits for PayBridge AI

export const CORRIDORS = {
  'JUR-A': {
    jurisdiction: 'JUR-A',
    country: 'India',
    regulator: 'Reserve Bank of India (RBI)',
    currency: 'INR',
    utcOffsetMin: 330, // UTC+05:30
    opStartMin: 0,
    opEndMin: 1440,
    maxTxAmount: '500000000', // 5,000,000.00 INR (in minor units)
    maxDailyMint: '2500000000',
    halted: false,
    version: 4,
  },
  'JUR-B': {
    jurisdiction: 'JUR-B',
    country: 'Singapore',
    regulator: 'Monetary Authority of Singapore (MAS)',
    currency: 'SGD',
    utcOffsetMin: 480, // UTC+08:00
    opStartMin: 0,
    opEndMin: 1440,
    maxTxAmount: '10000000', // 100,000.00 SGD (in minor units)
    maxDailyMint: '50000000',
    halted: false,
    version: 4,
  },
  'JUR-C': {
    jurisdiction: 'JUR-C',
    country: 'United States',
    regulator: 'Federal Reserve / FinCEN',
    currency: 'USD',
    utcOffsetMin: -300, // UTC-05:00
    opStartMin: 0,
    opEndMin: 1440,
    maxTxAmount: '20000000', // 200,000.00 USD (in minor units)
    maxDailyMint: '100000000',
    halted: false,
    version: 2,
  },
};

// Benchmark FX Rates (relative to 1 USD)
export const FX_RATES = {
  USD: 1.0,
  SGD: 1.34,
  INR: 83.50,
  EUR: 0.92,
  GBP: 0.79,
};

export function getCalculatedFx(fromCcy, toCcy) {
  const fromRate = FX_RATES[fromCcy] || 1.0;
  const toRate = FX_RATES[toCcy] || 1.0;
  return (toRate / fromRate).toFixed(4);
}

export const REFUSAL_CODES = {
  REF_AMOUNT_EXCEEDS_CEILING: 'Amount exceeds corridor single-transaction regulatory ceiling',
  REF_OUTSIDE_OPERATING_HOURS: 'Corridor settlement window is currently closed',
  REF_CORRIDOR_HALTED: 'Regulatory jurisdiction has issued an emergency corridor halt',
  REF_SANCTIONS_ALERT: 'High-risk or sanctioned entity flagged by AI Sentinel agent',
  REF_INSUFFICIENT_HEADROOM: 'Insufficient currency reserve headroom for settlement',
  REF_PAYPAL_VERIFICATION_FAILED: 'PayPal sandbox authentication or capture verification failed',
};
