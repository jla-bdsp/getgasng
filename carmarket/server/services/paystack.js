'use strict';

const axios = require('axios');

const BASE_URL = 'https://api.paystack.co';

function getHeaders() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not set');
  return {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Initialize a Paystack transaction.
 * @param {string} email - Customer email
 * @param {number} amount - Amount in kobo (multiply naira × 100)
 * @param {object} metadata - Arbitrary metadata to attach to the transaction
 * @returns {Promise<{reference: string, authorization_url: string, access_code: string}>}
 */
async function initializeTransaction(email, amount, metadata = {}) {
  const payload = {
    email,
    amount: Math.round(amount), // kobo
    metadata,
    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer'],
  };

  const response = await axios.post(`${BASE_URL}/transaction/initialize`, payload, {
    headers: getHeaders(),
  });

  if (!response.data.status) {
    throw new Error(response.data.message || 'Paystack initialization failed');
  }

  return response.data.data; // { reference, authorization_url, access_code }
}

/**
 * Verify a Paystack transaction by reference.
 * @param {string} reference - Transaction reference returned by Paystack
 * @returns {Promise<object>} Full Paystack transaction object
 */
async function verifyTransaction(reference) {
  if (!reference) throw new Error('Transaction reference is required');

  const response = await axios.get(
    `${BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: getHeaders() }
  );

  if (!response.data.status) {
    throw new Error(response.data.message || 'Paystack verification failed');
  }

  return response.data.data; // full transaction object
}

module.exports = { initializeTransaction, verifyTransaction };
