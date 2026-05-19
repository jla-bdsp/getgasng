'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('../lib/supabase');
const { sendCarListingApproved } = require('../services/email');

// Multer: store in memory, we'll stream to Supabase Storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB per file
    files: 10,
  },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

/* ── POST /api/cars/submit ──────────────────────────────────────
   Multipart form — car details + up to 10 images.
   Saves car as is_approved=false (pending admin review).
──────────────────────────────────────────────────────────────── */
router.post('/', upload.array('images', 10), async (req, res) => {
  const files = req.files || [];

  if (files.length === 0) {
    return res.status(400).json({ success: false, error: 'At least one image is required' });
  }

  const {
    make, model, year, price, mileage,
    location, condition, transmission, fuel_type,
    color, description,
    seller_name, seller_phone, seller_whatsapp, seller_email,
  } = req.body;

  // Required field validation
  const required = { make, model, year, price, mileage, location, condition, transmission, fuel_type, seller_name, seller_phone, seller_email };
  for (const [field, val] of Object.entries(required)) {
    if (!val || String(val).trim() === '') {
      return res.status(400).json({ success: false, error: `Missing required field: ${field}` });
    }
  }

  try {
    const supabase = getSupabase();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'car-images';
    const carId = uuidv4();
    const imagePaths = [];

    // ── Upload images to Supabase Storage ───────────────────────
    for (const file of files) {
      const ext = file.originalname.split('.').pop().toLowerCase() || 'jpg';
      const path = `${carId}/${uuidv4()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadErr) {
        console.error('[submit] image upload error:', uploadErr.message);
        // Continue with remaining images rather than failing entirely
      } else {
        imagePaths.push(path);
      }
    }

    if (imagePaths.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to upload images. Please try again.' });
    }

    // ── Insert car row ───────────────────────────────────────────
    const { error: insertErr } = await supabase.from('cars').insert({
      id: carId,
      make: make.trim(),
      model: model.trim(),
      year: parseInt(year, 10),
      price: parseFloat(price),
      mileage: parseInt(mileage, 10),
      location: location.trim(),
      condition,
      transmission,
      fuel_type,
      color: color ? color.trim() : null,
      description: description ? description.trim() : null,
      image_paths: imagePaths,
      seller_name: seller_name.trim(),
      seller_phone: seller_phone.trim(),
      seller_whatsapp: (seller_whatsapp || seller_phone).trim(),
      seller_email: seller_email.trim().toLowerCase(),
      is_approved: false,
      status: 'available',
    });

    if (insertErr) throw insertErr;

    res.json({
      success: true,
      message: 'Submitted! Our team will review and list your car within 24 hours.',
      car_id: carId,
    });
  } catch (err) {
    console.error('[POST /api/cars/submit]', err.message);
    res.status(500).json({ success: false, error: 'Submission failed. Please try again.' });
  }
});

module.exports = router;
