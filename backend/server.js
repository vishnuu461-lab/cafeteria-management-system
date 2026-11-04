require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

// ── Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow all in production (Vercel same-origin) or specific origins in dev
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174').split(',').map(s => s.trim());
app.use(cors({
    origin: (origin, cb) => {
        // Allow no-origin (server-to-server) & all Vercel/localhost origins
        if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
            cb(null, true);
        } else {
            cb(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// ── Routes ────────────────────────────────────────────────────
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/offers', require('./routes/offers'));
app.use('/api', require('./routes/management'));
app.use('/api/student', require('./routes/student'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        project: 'Cafeteria Management System',
        version: '1.0.0',
        env: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
    });
});

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('Server error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
});

// ── Start server ONLY when running locally (not on Vercel) ────
if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
        console.log(`\n🚀 Cafeteria Management System API`);
        console.log(`   Running on: http://localhost:${PORT}`);
        console.log(`   Health:     http://localhost:${PORT}/health`);
        console.log(`   Mode:       ${process.env.NODE_ENV || 'development'}\n`);
    });
}

module.exports = app;
