// routes/auth.js — Worker & Admin login using bcrypt
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const bcrypt = require('bcryptjs');

// POST /api/auth/worker/login
router.post('/worker/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const [[worker]] = await db.query('SELECT * FROM workers WHERE Email=? AND Status=?', [email, 'active']);
        if (!worker) return res.status(401).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, worker.Password);
        if (!match) return res.status(401).json({ error: 'Invalid email or password' });

        res.json({
            success: true,
            worker: { Worker_ID: worker.Worker_ID, Name: worker.Name, Email: worker.Email, Role: worker.Role }
        });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

// POST /api/auth/admin/login
router.post('/admin/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const [[admin]] = await db.query('SELECT * FROM admins WHERE Email=?', [email]);
        if (!admin) return res.status(401).json({ error: 'Invalid email or password' });

        const match = await bcrypt.compare(password, admin.Password);
        if (!match) return res.status(401).json({ error: 'Invalid email or password' });

        res.json({
            success: true,
            admin: { Admin_ID: admin.Admin_ID, Name: admin.Name, Email: admin.Email }
        });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Login failed' }); }
});

module.exports = router;
