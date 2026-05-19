'use strict';

const express = require('express');
const router = express.Router();
const { getSupabase } = require('../lib/supabase');

/* ── GET /api/cars ──────────────────────────────────────────────
   Returns all approved, non-sold cars sorted newest first.
   Each car row includes a public_images array of signed/public URLs.
──────────────────────────────────────────────────────────────── */
router.get('/', async (req, res) => {
  try {
    const supabase = getSupabase();

    const { data: cars, error } = await supabase
      .from('cars')
      .select('*')
      .eq('is_approved', true)
      .neq('status', 'sold')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Attach public image URLs
    const carsWithImages = (cars || []).map((car) => ({
      ...car,
      images: buildImageUrls(supabase, car.image_paths || []),
    }));

    res.json({ success: true, data: carsWithImages });
  } catch (err) {
    console.error('[GET /api/cars]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch listings' });
  }
});

/* ── GET /api/cars/:id ──────────────────────────────────────────
   Returns a single car with full details.
──────────────────────────────────────────────────────────────── */
router.get('/:id', async (req, res) => {
  try {
    const supabase = getSupabase();
    const { id } = req.params;

    const { data: car, error } = await supabase
      .from('cars')
      .select('*')
      .eq('id', id)
      .eq('is_approved', true)
      .single();

    if (error || !car) {
      return res.status(404).json({ success: false, error: 'Car not found' });
    }

    res.json({
      success: true,
      data: {
        ...car,
        images: buildImageUrls(supabase, car.image_paths || []),
      },
    });
  } catch (err) {
    console.error('[GET /api/cars/:id]', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch car details' });
  }
});

/* ── helpers ────────────────────────────────────────────────── */
function buildImageUrls(supabase, paths) {
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'car-images';
  return paths.map((path) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl || path;
  });
}

module.exports = router;
