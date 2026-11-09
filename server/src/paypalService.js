// PayPal Developer Platform Service (Sandbox & High-Fidelity Simulation)
// Integrates PayPal Orders v2 API, Payouts v1 API, and Webhooks

import { ulid } from 'ulid';

const PAYPAL_API_BASE = process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com';
const CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
const IS_SIMULATION_MODE = !CLIENT_ID || !CLIENT_SECRET || process.env.PAYPAL_MODE === 'mock';

let cachedAccessToken = null;
let tokenExpiresAt = 0;

/**
 * Obtain OAuth2 Access Token from PayPal Sandbox
 */
export async function getPayPalAccessToken() {
  if (IS_SIMULATION_MODE) {
    return 'simulated_sandbox_access_token_' + Date.now();
  }

  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  try {
    const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      console.warn(`[PayPal OAuth] Sandbox authentication failed (HTTP ${response.status})`);
      throw new Error(`PayPal Sandbox authentication failed (HTTP ${response.status})`);
    }

    const data = await response.json();
    cachedAccessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    console.log(`[PayPal OAuth] Successfully authenticated with PayPal Sandbox API`);
    return cachedAccessToken;
  } catch (err) {
    if (err.message?.startsWith('PayPal Sandbox authentication failed')) throw err;
    console.warn('[PayPal OAuth] Network request failed');
    throw new Error('PayPal Sandbox authentication could not reach the provider');
  }
}

/**
 * Create a PayPal Order (v2/checkout/orders)
 * @param {Object} orderData { tradeId, amount, currency, description, counterparty }
 */
export async function createPayPalOrder({ tradeId, amount, currency = 'USD', description, counterparty }) {
  const token = await getPayPalAccessToken();

  // If live credentials active
  if (!IS_SIMULATION_MODE && !token.startsWith('simulated_')) {
    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `order_${tradeId}_${Date.now()}`,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [
            {
              reference_id: tradeId,
              description: description || `PayBridge Cross-Border Settlement for ${tradeId}`,
              custom_id: tradeId,
              amount: {
                currency_code: currency,
                value: (Number(amount) / 100).toFixed(2),
              },
            },
          ],
          application_context: {
            brand_name: 'PayBridge AI Treasury',
            landing_page: 'NO_PREFERENCE',
            user_action: 'PAY_NOW',
            return_url: 'http://localhost:5173/checkout/success',
            cancel_url: 'http://localhost:5173/checkout/cancel',
          },
        }),
      });

      if (response.ok) {
        const liveOrder = await response.json();
        console.log(`[PayPal Orders] Created live Sandbox Order: ${liveOrder.id}`);
        return {
          orderId: liveOrder.id,
          status: liveOrder.status,
          tradeId,
          amount,
          currency,
          links: liveOrder.links,
          isSimulation: false,
          createdAt: new Date().toISOString(),
        };
      }
      console.warn(`[PayPal Orders] Sandbox order creation failed (HTTP ${response.status})`);
      throw new Error(`PayPal Sandbox order creation failed (HTTP ${response.status})`);
    } catch (err) {
      if (err.message?.startsWith('PayPal Sandbox order creation failed')) throw err;
      console.warn('[PayPal Orders] Sandbox request failed');
      throw new Error('PayPal Sandbox order creation could not reach the provider');
    }
  }

  // High-Fidelity Simulation Fallback
  const simulatedId = `PAYID-${ulid().slice(0, 16)}`;
  return {
    orderId: simulatedId,
    status: 'CREATED',
    tradeId,
    amount,
    currency,
    description: description || `PayBridge Settlement for ${tradeId}`,
    counterparty,
    links: [
      {
        href: `https://www.sandbox.paypal.com/checkoutnow?token=${simulatedId}`,
        rel: 'approve',
        method: 'GET',
      },
      {
        href: `http://localhost:3001/api/paypal/orders/${simulatedId}/capture`,
        rel: 'capture',
        method: 'POST',
      },
    ],
    isSimulation: true,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Capture an approved PayPal Order (v2/checkout/orders/{id}/capture)
 */
export async function capturePayPalOrder(orderId, tradeId) {
  const token = await getPayPalAccessToken();

  if (!IS_SIMULATION_MODE && !token.startsWith('simulated_')) {
    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `capture_${orderId}_${Date.now()}`,
        },
      });

      if (response.ok) {
        const liveCapture = await response.json();
        const captureUnit = liveCapture.purchase_units?.[0]?.payments?.captures?.[0];
        console.log(`[PayPal Capture] Captured live Sandbox Order: ${orderId}`);
        return {
          captureId: captureUnit?.id || `CAP-${ulid().slice(0, 12)}`,
          orderId,
          status: liveCapture.status || 'COMPLETED',
          tradeId,
          capturedAt: new Date().toISOString(),
          isSimulation: false,
          details: liveCapture,
        };
      }
      console.warn(`[PayPal Capture] Sandbox capture failed (HTTP ${response.status})`);
      throw new Error(`PayPal Sandbox capture failed (HTTP ${response.status})`);
    } catch (err) {
      if (err.message?.startsWith('PayPal Sandbox capture failed')) throw err;
      console.warn('[PayPal Capture] Sandbox request failed');
      throw new Error('PayPal Sandbox capture could not reach the provider');
    }
  }

  // High-Fidelity Simulation
  return {
    captureId: `CAP-${ulid().slice(0, 14)}`,
    orderId,
    status: 'COMPLETED',
    tradeId,
    capturedAt: new Date().toISOString(),
    isSimulation: true,
    amount: {
      currency_code: 'USD',
      value: '1000.00',
    },
    seller_receivable_breakdown: {
      gross_amount: { value: '1000.00', currency_code: 'USD' },
      paypal_fee: { value: '29.30', currency_code: 'USD' },
      net_amount: { value: '970.70', currency_code: 'USD' },
    },
  };
}

/**
 * Execute PayPal Batch Payout (v1/payments/payouts)
 * Used by Autonomous Treasury Agent to disburse settlements to international vendor accounts
 */
export async function executePayPalPayout({ tradeId, recipientEmail, amount, currency = 'USD', note }) {
  const token = await getPayPalAccessToken();
  const batchId = `BATCH-${ulid()}`;
  const senderItemId = `ITEM-${tradeId}-${Date.now()}`;

  if (!IS_SIMULATION_MODE && !token.startsWith('simulated_')) {
    try {
      const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender_batch_header: {
            sender_batch_id: batchId,
            email_subject: 'PayBridge Cross-Border Treasury Payout',
            email_message: note || `Disbursement for atomic trade ${tradeId}`,
          },
          items: [
            {
              recipient_type: 'EMAIL',
              amount: {
                value: (Number(amount) / 100).toFixed(2),
                currency,
              },
              note: note || `Atomic settlement payout ${tradeId}`,
              sender_item_id: senderItemId,
              receiver: recipientEmail || 'vendor-payout-sandbox@paybridge.ai',
            },
          ],
        }),
      });

      if (response.ok) {
        const livePayout = await response.json();
        console.log(`[PayPal Payouts] Live Sandbox Payout Batch created: ${livePayout.batch_header?.payout_batch_id}`);
        return {
          payoutBatchId: livePayout.batch_header?.payout_batch_id || batchId,
          status: livePayout.batch_header?.batch_status || 'PENDING',
          tradeId,
          recipientEmail: recipientEmail || 'vendor-payout-sandbox@paybridge.ai',
          amount,
          currency,
          isSimulation: false,
          executedAt: new Date().toISOString(),
        };
      }
      console.warn(`[PayPal Payouts] Sandbox payout failed (HTTP ${response.status})`);
      throw new Error(`PayPal Sandbox payout failed (HTTP ${response.status})`);
    } catch (err) {
      if (err.message?.startsWith('PayPal Sandbox payout failed')) throw err;
      console.warn('[PayPal Payouts] Sandbox request failed');
      throw new Error('PayPal Sandbox payout could not reach the provider');
    }
  }

  // High-Fidelity Simulation
  return {
    payoutBatchId: batchId,
    payoutItemId: senderItemId,
    status: 'SUCCESS',
    tradeId,
    recipientEmail: recipientEmail || 'treasury-desk-sg@bankb1.sandbox.paypal.com',
    amount,
    currency,
    note: note || `Autonomous Agentic Payout for Settlement ${tradeId}`,
    isSimulation: true,
    executedAt: new Date().toISOString(),
  };
}
