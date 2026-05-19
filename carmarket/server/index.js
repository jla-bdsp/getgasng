require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const path     = require('path');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));

// ── API routes ────────────────────────────────────────────────────────────────
app.use('/api/cars',     require('./routes/cars'));
app.use('/api/inspect',  require('./routes/inspect'));
app.use('/api/submit',   require('./routes/submit'));
app.use('/api/auction',  require('./routes/auction'));
app.use('/api/admin',    require('./routes/admin'));

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date() }));

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`AutoNG server running on port ${PORT}`));
