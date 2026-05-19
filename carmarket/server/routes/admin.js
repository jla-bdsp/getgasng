const express   = require('express');
const { createClient } = require('@supabase/supabase-js');
const router    = express.Router();
const { sendCarSoldNotification, sendListingApproved } = require('../services/email');
const { sendCarSoldNotificationWA } = require('../services/whatsapp');

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  res.json({ token: process.env.ADMIN_TOKEN });
});

// GET /api/admin/cars — all cars including pending and sold
router.get('/cars', requireAdmin, async (req, res) => {
  const { status, approved } = req.query;
  let query = db().from('cars').select('*').order('created_at', { ascending: false });

  if (status)   query = query.eq('status', status);
  if (approved !== undefined) query = query.eq('is_approved', approved === 'true');

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ cars: data });
});

// GET /api/admin/inspections
router.get('/inspections', requireAdmin, async (req, res) => {
  const { data, error } = await db()
    .from('inspection_requests')
    .select('*, cars(title, make, model, year)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ inspections: data });
});

// PATCH /api/admin/cars/:id/approve
router.patch('/cars/:id/approve', requireAdmin, async (req, res) => {
  const supabase = db();
  const { data: car, error: carErr } = await supabase
    .from('cars').select('*').eq('id', req.params.id).single();

  if (carErr) return res.status(404).json({ error: 'Car not found' });

  const { error } = await supabase
    .from('cars')
    .update({ is_approved: true, approved_at: new Date().toISOString() })
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });

  // Notify seller
  if (car.seller_email) {
    sendListingApproved({ name: car.seller_name, email: car.seller_email }).catch(console.error);
  }

  res.json({ success: true });
});

// PATCH /api/admin/cars/:id/reject
router.patch('/cars/:id/reject', requireAdmin, async (req, res) => {
  const { error } = await db().from('cars').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// PATCH /api/admin/cars/:id/sold — mark sold, notify all paid inspectors
router.patch('/cars/:id/sold', requireAdmin, async (req, res) => {
  const supabase = db();

  // Get car
  const { data: car, error: carErr } = await supabase
    .from('cars').select('*').eq('id', req.params.id).single();
  if (carErr) return res.status(404).json({ error: 'Car not found' });

  // Mark sold
  await supabase
    .from('cars')
    .update({ status: 'sold', sold_at: new Date().toISOString() })
    .eq('id', req.params.id);

  // Fetch all paid inspectors
  const { data: inspectors } = await supabase
    .from('inspection_requests')
    .select('name, email, whatsapp')
    .eq('car_id', req.params.id)
    .eq('payment_status', 'paid');

  const carTitle = `${car.year} ${car.make} ${car.model}`;

  // Send notifications (non-blocking)
  if (inspectors?.length) {
    inspectors.forEach(i => {
      sendCarSoldNotification({ name: i.name, email: i.email, carTitle }).catch(console.error);
      if (i.whatsapp) {
        sendCarSoldNotificationWA({ phone: i.whatsapp, name: i.name, carTitle }).catch(console.error);
      }
    });
  }

  res.json({ success: true, notified: inspectors?.length || 0 });
});

// ── Auction management ────────────────────────────────────────────────────────
router.get('/auction', requireAdmin, async (req, res) => {
  const { data } = await db()
    .from('auctions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
  res.json({ auctions: data || [] });
});

router.put('/auction', requireAdmin, async (req, res) => {
  const { id, title, description, auction_date, status } = req.body;
  const supabase = db();

  if (id) {
    const { error } = await supabase
      .from('auctions')
      .update({ title, description, auction_date, status })
      .eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
  } else {
    const { error } = await supabase
      .from('auctions')
      .insert({ title, description, auction_date, status: status || 'upcoming' });
    if (error) return res.status(500).json({ error: error.message });
  }
  res.json({ success: true });
});

module.exports = router;
