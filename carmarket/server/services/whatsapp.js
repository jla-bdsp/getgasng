'use strict';

const twilio = require('twilio');

let client;

function getClient() {
  if (client) return client;

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    console.warn('[whatsapp] Twilio credentials not set — WhatsApp notifications disabled');
    return null;
  }

  client = twilio(sid, token);
  return client;
}

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

/**
 * Core send helper.
 * @param {string} to   - Recipient phone in international format e.g. "+2348012345678"
 * @param {string} body - Plain text message
 */
async function sendWhatsApp(to, body) {
  const c = getClient();
  if (!c) return false;

  // Normalise number — ensure "whatsapp:" prefix
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;

  try {
    const message = await c.messages.create({ from: FROM, to: toFormatted, body });
    console.log(`[whatsapp] sent to ${toFormatted}: ${message.sid}`);
    return true;
  } catch (err) {
    console.error(`[whatsapp] failed to ${toFormatted}:`, err.message);
    return false;
  }
}

/**
 * Confirmation WA after successful payment for an inspection request.
 */
async function sendInspectionConfirmationWA(phone, name, carTitle, type) {
  const holdLine =
    type === 'inspect_hold'
      ? '\n🔒 *Hold active* — this car is reserved for you for 72 hours.'
      : '';

  const body =
    `✅ *Inspection Confirmed — AutoNG*\n\n` +
    `Hi ${name}! Your inspection request has been received.\n\n` +
    `🚗 *Car:* ${carTitle}\n` +
    `📋 *Type:* ${type === 'inspect_hold' ? 'Inspection + Hold' : 'Inspection Only'}` +
    holdLine +
    `\n\nOur team will contact you within *2 hours* with inspection details.\n\n` +
    `Questions? Reply to this message.\n— AutoNG Team`;

  return sendWhatsApp(phone, body);
}

/**
 * Notification to interested buyers when a car they inspected is sold.
 */
async function sendCarSoldNotificationWA(phone, name, carTitle) {
  const body =
    `📢 *Update from AutoNG*\n\n` +
    `Hi ${name}, the *${carTitle}* you were interested in has been *sold*.\n\n` +
    `Visit autong.ng to browse similar cars — we add new inventory every week!\n\n` +
    `— AutoNG Team`;

  return sendWhatsApp(phone, body);
}

module.exports = {
  sendWhatsApp,
  sendInspectionConfirmationWA,
  sendCarSoldNotificationWA,
};
