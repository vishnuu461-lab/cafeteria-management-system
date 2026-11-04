const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/payments
router.get('/', async (req, res) => {
    try {
        const { search, method, page = 1, limit = 15 } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

        if (search) { where += ' AND (c.Full_Name LIKE ? OR p.Transaction_Ref LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (method) { where += ' AND p.Payment_Method = ?'; params.push(method); }

        const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM payment p
      JOIN orders o ON p.Order_ID = o.Order_ID
      JOIN customer c ON o.Customer_ID = c.Customer_ID
      ${where}
    `, params);

        const [rows] = await db.query(`
      SELECT p.*, c.Full_Name AS Customer_Name, o.Total_Amount AS Order_Total
      FROM payment p
      JOIN orders o   ON p.Order_ID  = o.Order_ID
      JOIN customer c ON o.Customer_ID = c.Customer_ID
      ${where}
      ORDER BY p.Payment_DateTime DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({ data: rows, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch payments' });
    }
});

// GET /api/payments/summary
router.get('/summary', async (req, res) => {
    try {
        const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total_txn, SUM(Amount) AS total_collected
      FROM payment WHERE Payment_Status = 'completed'
    `);
        const [byMethod] = await db.query(`
      SELECT Payment_Method, COUNT(*) AS count, SUM(Amount) AS total
      FROM payment WHERE Payment_Status = 'completed'
      GROUP BY Payment_Method ORDER BY total DESC
    `);
        res.json({ totals, byMethod });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payment summary' });
    }
});

// POST /api/payments
router.post('/', async (req, res) => {
    try {
        const { Order_ID, Payment_Method, Amount, Transaction_Ref } = req.body;
        if (!Order_ID || !Amount) return res.status(400).json({ error: 'Order_ID and Amount are required' });

        const [[order]] = await db.query('SELECT * FROM orders WHERE Order_ID = ?', [Order_ID]);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.Payment_Status === 'paid') return res.status(409).json({ error: 'Order already paid' });

        await db.query(
            'INSERT INTO payment (Order_ID, Payment_Method, Amount, Payment_Status, Transaction_Ref) VALUES (?,?,?,?,?)',
            [Order_ID, Payment_Method || 'cash', Amount, 'completed', Transaction_Ref || null]
        );
        // Trigger trg_after_payment_insert will update orders.Payment_Status automatically
        await db.query("UPDATE orders SET Order_Status='confirmed' WHERE Order_ID=? AND Order_Status='pending'", [Order_ID]);
        res.status(201).json({ message: 'Payment recorded successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record payment' });
    }
});

module.exports = router;
