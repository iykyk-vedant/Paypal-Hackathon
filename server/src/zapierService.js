// Zapier Automation & Webhook Integration Service
// Dispatches real-time outbound webhooks to Zapier for automated ERP, Slack,
// and email notifications upon critical settlement and compliance triggers.

import { ulid } from 'ulid';

let ZAPIER_WEBHOOK_URL = process.env.ZAPIER_WEBHOOK_URL || '';
const dispatchedEvents = [];

/**
 * Update Zapier Webhook URL at runtime
 */
export function setZapierWebhookUrl(url) {
  ZAPIER_WEBHOOK_URL = url;
}

export function getZapierWebhookUrl() {
  return ZAPIER_WEBHOOK_URL;
}

/**
 * Dispatch an automated event to Zapier
 * @param {string} eventType e.g., 'TRADE_PROPOSED', 'ATOMIC_SETTLED', 'COMPLIANCE_REFUSED', 'PAYPAL_PAYOUT_SENT'
 * @param {object} payload
 */
export async function triggerZapierWebhook(eventType, payload) {
  const eventId = `EVT-${ulid()}`;
  const timestamp = new Date().toISOString();

  const eventRecord = {
    eventId,
    eventType,
    timestamp,
    webhookUrl: ZAPIER_WEBHOOK_URL || 'https://hooks.zapier.com/hooks/catch/simulated_paybridge_hook/',
    status: 'QUEUED',
    payload,
  };

  if (ZAPIER_WEBHOOK_URL) {
    try {
      const response = await fetch(ZAPIER_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'PayBridge AI Settlement Protocol',
          eventType,
          eventId,
          timestamp,
          data: payload,
        }),
      });
      eventRecord.status = response.ok ? 'DELIVERED' : `FAILED_${response.status}`;
      eventRecord.statusCode = response.status;
    } catch (err) {
      eventRecord.status = 'ERROR';
      eventRecord.error = err.message;
    }
  } else {
    // Simulated successful Zapier hook delivery
    eventRecord.status = 'DELIVERED (SIMULATED)';
  }

  dispatchedEvents.unshift(eventRecord);
  if (dispatchedEvents.length > 50) dispatchedEvents.pop();

  return eventRecord;
}

/**
 * Get recent Zapier dispatched events
 */
export function getZapierDispatchedHistory() {
  return dispatchedEvents;
}
