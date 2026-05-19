'use strict';

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../lib/supabase');
const { initializeTransaction, verifyTransaction } = require('../services/paystack');
const { sendInspectionConfirmation, sendCarSoldNotification } = require('../services/email');
const { sendInspectionConfirmationWA } = require('../services/whatsapp');

const INSPECT_AMOUNT_NAIRA = 2500;
const HOLD_AMOUNT_NAIRA = 20000;
const INSPECT_HOLD_TOTAL_NAIRA = INSPECT_AMOUNT_NAIRA + HOLD_AMOUNT_NAIRA; // 22500

/* ── POST /api/inspect ─────────────────────────────────────────
   Body: { car_id, name, email, phone, whatsapp, type: 'inspect'|'inspect_hold' }
   Returns: { reference, amount, email, public_key } for Paystack inline popup
──────────────────────────────────────────────────────────────── */
router.post('/', async (req, res) => {
  const { car_id, name, email, phone, whatsapp, type } = req.body;

  // ── Validation ───────────────────────────────────────────────
  if (!car_id || !name || !email || !phone || !type) {
    return res.status(400).json({ success: false, error: 'Missing required fields' });
  }
  if (!['inspect', 'inspect_hold'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Invalid inspection type' });
  }

  try {
    const supabase = getSupabase();

    // ── Fetch car ────────────────────────────────────────────────
    const { data: car, error: carErr } = await supabase
      .from('cars')
      .select('id, make, model, year, status, is_approved')
      .eq('id', car_id)
      .eq('is_approved', true)
      .single();

    if (carErr || !car) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }
    if (car.status === 'sold') {
      return res.status(400).json({ success: false, error: 'This car has already been sold' });
    }

    // ── Check hold conflict ──────────────────────────────────────
    if (type === 'inspect_hold' && car.status === 'held') {
      return res.status(409).json({
        success: false,
        error: 'This car is already held by another buyer. You can still request Inspection Only.',
        code: 'CAR_ALREADY_HELD',
      });
    }

    // ── Compute amount ───────────────────────────────────────────
    const amountNaira =
      type === 'inspect_hold' ? INSPECT_HOLD_TOTAL_NAIRA : INSPECT_AMOUNT_NAIRA;
    const amountKobo = amountNaira * 100;

    const carTitle = `${car.year} ${car.make} ${car.model}`;

    // ── Create pending inspection_request row ────────────────────
    const requestId = uuidv4();
    const { error: insertErr } = await supabase.from('inspection_requests').insert({
      id: requestId,
      car_id,
      name,
      email,
      phone,
      whatsapp: whatsapp || phone,
      type,
      amount: amountNaira,
      payment_status: 'pending',
    });

    if (insertErr) throw insertErr;

    // ── Initialize Paystack transaction ──────────────────────────
    const metadata = {
      inspection_request_id: requestId,
      car_id,
      car_title: carTitle,
      inspection_type: type,
      custom_fields: [
        { display_name: 'Car', variable_name: 'car_title', value: carTitle },
        { display_name: 'Buyer Name', variable_name: 'buyer_name', value: name },
        {
          display_name: 'Service',
          variable_name: 'service',
          value: type === 'inspect_hold' ? 'Inspection + Hold' : 'Inspection Only',
        },
      ],
    };

    const txn = await initializeTransaction(email, amountKobo, metadata);

    // Store reference against the row
    await supabase
      .from('inspection_requests')
      .update({ paystack_reference: txn.reference })
      .eq('id', requestId);

    res.json({
      success: true,
      data: {
        reference: txn.reference,
        amount: amountKobo,
        email,
        public_key: process.env.PAYSTACK_PUBLIC_KEY,
        car_title: carTitle,
        inspection_request_id: requestId,
      },
    });
  } catch (err) {
    console.error('[POST /api/inspect]', err.message);
    res.status(500).json({ success: false, error: 'Failed to create inspection request' });
  }
});

/* ── POST /api/payment/verify ──────────────────────────────────
   Body: { reference }
   Verifies payment, updates DB, applies hold if needed, sends confirmations.
──────────────────────────────────────────────────────────────── */
router.post('/verify', async (req, res) => {
  const { reference } = req.body;
  if (!reference) {
    return res.status(400).json({ success: false, error: 'Reference is required' });
  }

  try {
    const supabase = getSupabase();

    // ── Verify with Paystack ─────────────────────────────────────
    const txn = await verifyTransaction(reference);

    if (txn.status !== 'success') {
      return res.status(402).json({
        success: false,
        error: `Payment not successful. Status: ${txn.status}`,
      });
    }

    // ── Fetch inspection request ─────────────────────────────────
    const { data: request, error: reqErr } = await supabase
      .from('inspection_requests')
      .select('*, cars(make, model, year, status, id)')
      .eq('paystack_reference', reference)
      .single();

    if (reqErr || !request) {
      return res.status(404).json({ success: false, error: 'Inspection request not found' });
    }

    // Idempotency — already processed
    if (request.payment_status === 'paid') {
      return res.json({ success: true, data: { already_processed: true } });
    }

    const car = request.cars;
    const carTitle = `${car.year} ${car.make} ${car.model}`;
    let holdApplied = false;
    let holdFailed = false;

    // ── Mark payment as paid ─────────────────────────────────────
    await supabase
      .from('inspection_requests')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', request.id);

    // ── Apply hold if requested ──────────────────────────────────
    if (request.type === 'inspect_hold') {
      if (car.status === 'held') {
        // Someone else held it between request and payment — hold portion cannot apply
        holdFailed = true;
        // Downgrade the request type note (the ₦20k hold refund would be manual in reality)
        await supabase
          .from('inspection_requests')
          .update({ hold_failed: true, hold_failure_reason: 'Car already held by another buyer' })
          .eq('id', request.id);
      } else {
        const { error: holdErr } = await supabase
          .from('cars')
          .update({
            status: 'held',
            held_by_email: request.email,
            held_at: new Date().toISOString(),
          })
          .eq('id', car.id)
          .neq('status', 'sold');

        if (!holdErr) holdApplied = true;
      }
    }

    // ── Send email confirmation ──────────────────────────────────
    const effectiveType = holdFailed ? 'inspect' : request.type;
    await sendInspectionConfirmation(
      request.name,
      request.email,
      carTitle,
      effectiveType,
      request.amount
    );

    // ── Send WhatsApp confirmation ───────────────────────────────
    await sendInspectionConfirmationWA(
      request.whatsapp || request.phone,
      request.name,
      carTitle,
      effectiveType
    );

    res.json({
      success: true,
      data: {
        car_title: carTitle,
        type: effectiveType,
        amount_paid: request.amount,
        hold_applied: holdApplied,
        hold_failed: holdFailed,
        hold_failure_message: holdFailed
          ? 'The hold could not be applied because the car was just held by another buyer. The ₦20,000 hold fee will be refunded within 24–48 hours.'
          : null,
      },
    });
  } catch (err) {
    console.error('[POST /api/payment/verify]', err.message);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

module.exports = router;
