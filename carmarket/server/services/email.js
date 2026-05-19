'use strict';

const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  return transporter;
}

const FROM = process.env.EMAIL_FROM || 'AutoNG <no-reply@autong.ng>';

/**
 * Generic send helper — resolves false instead of throwing so a
 * failed email never breaks the main payment flow.
 */
async function send(to, subject, html) {
  try {
    const info = await getTransporter().sendMail({ from: FROM, to, subject, html });
    console.log(`[email] sent to ${to}: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error(`[email] failed to ${to}:`, err.message);
    return false;
  }
}

function formatNaira(amount) {
  return `₦${Number(amount).toLocaleString('en-NG')}`;
}

/* ── Email templates ─────────────────────────────────────────── */

/**
 * Sent to buyer/requester immediately after successful Paystack payment.
 * @param {string} name
 * @param {string} email
 * @param {string} carTitle  e.g. "2020 Toyota Camry"
 * @param {'inspect'|'inspect_hold'} type
 * @param {number} amountPaid - in naira
 */
async function sendInspectionConfirmation(name, email, carTitle, type, amountPaid) {
  const holdNote =
    type === 'inspect_hold'
      ? `<p style="margin:12px 0;padding:12px 16px;background:#fef3c7;border-left:4px solid #f59e0b;border-radius:4px;color:#92400e;">
           <strong>Hold active:</strong> This car is held exclusively for you for 72 hours.
           Our team will contact you to arrange the physical inspection.
         </p>`
      : '';

  const subject = `Inspection Confirmed — ${carTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
    <div style="background:#2563EB;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-.3px;">AutoNG</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,.8);font-size:13px;">Used Car Marketplace</p>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">Inspection Confirmed!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name}, your inspection request has been received.</p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:20px;margin-bottom:20px;">
        <p style="margin:0 0 8px;font-size:13px;color:#0369a1;font-weight:600;text-transform:uppercase;letter-spacing:.5px;">Car</p>
        <p style="margin:0;font-size:17px;font-weight:700;color:#1e293b;">${carTitle}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#64748b;font-size:14px;">Service type</td>
          <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;text-align:right;">
            ${type === 'inspect_hold' ? 'Inspection + Hold (72 hrs)' : 'Inspection Only'}
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;color:#64748b;font-size:14px;">Amount paid</td>
          <td style="padding:10px 0;font-size:14px;font-weight:700;text-align:right;color:#2563EB;">
            ${formatNaira(amountPaid)}
          </td>
        </tr>
      </table>

      ${holdNote}

      <p style="color:#475569;font-size:14px;line-height:1.6;">
        Our team will contact you <strong>within 2 hours</strong> with full inspection details
        including the inspector's name, phone number, and scheduled time.
      </p>

      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        Questions? Reply to this email or WhatsApp us at +234 800 AUTO NG.<br>
        AutoNG — Nigeria's trusted used car marketplace.
      </p>
    </div>
  </div>
</body>
</html>`;

  return send(email, subject, html);
}

/**
 * Sent to everyone who paid for an inspection on a car when the car is marked sold.
 */
async function sendCarSoldNotification(email, name, carTitle) {
  const subject = `Update: ${carTitle} has been sold`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
    <div style="background:#2563EB;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">AutoNG</h1>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 8px;font-size:20px;">Car Update</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name},</p>
      <p style="color:#475569;font-size:15px;line-height:1.6;">
        We wanted to let you know that the <strong>${carTitle}</strong> you expressed interest in
        has been <strong>sold</strong> and is no longer available.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;">
        We have hundreds of quality vehicles added every week. Visit AutoNG to browse similar cars.
      </p>
      <a href="https://autong.ng"
         style="display:inline-block;margin-top:8px;padding:12px 28px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        Browse More Cars
      </a>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">AutoNG — Nigeria's trusted used car marketplace.</p>
    </div>
  </div>
</body>
</html>`;

  return send(email, subject, html);
}

/**
 * Sent to the seller when their listing goes live.
 */
async function sendCarListingApproved(email, name, carTitle) {
  const subject = `Your listing is live — ${carTitle}`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Helvetica Neue',Arial,sans-serif;color:#1e293b;">
  <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">
    <div style="background:#2563EB;padding:32px 40px;">
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">AutoNG</h1>
    </div>
    <div style="padding:32px 40px;">
      <h2 style="margin:0 0 8px;font-size:20px;">Your car is now live! 🎉</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;">Hi ${name},</p>
      <p style="color:#475569;font-size:15px;line-height:1.6;">
        Great news! Your listing for the <strong>${carTitle}</strong> has been reviewed
        and is now live on AutoNG.
      </p>
      <p style="color:#475569;font-size:15px;line-height:1.6;">
        Buyers can now view your car, request inspections, and place holds.
        We'll notify you as soon as there's interest.
      </p>
      <a href="https://autong.ng"
         style="display:inline-block;margin-top:8px;padding:12px 28px;background:#2563EB;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">
        View Your Listing
      </a>
      <hr style="border:none;border-top:1px solid #f1f5f9;margin:24px 0;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">AutoNG — Nigeria's trusted used car marketplace.</p>
    </div>
  </div>
</body>
</html>`;

  return send(email, subject, html);
}

module.exports = {
  sendInspectionConfirmation,
  sendCarSoldNotification,
  sendCarListingApproved,
};
