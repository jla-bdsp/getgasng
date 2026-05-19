const express   = require('express');
const { createClient } = require('@supabase/supabase-js');
const router    = express.Router();

function db() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// GET /api/auction/next — returns nearest upcoming or live auction
router.get('/next', async (req, res) => {
  try {
    const { data, error } = await db()
      .from('auctions')
      .select('*')
      .in('status', ['upcoming', 'live'])
      .order('auction_date', { ascending: true })
      .limit(1)
      .single();

    if (error) return res.json({ auction: null });
    res.json({ auction: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
