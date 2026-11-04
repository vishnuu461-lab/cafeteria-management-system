const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/customers
router.get('/', async (req, res) => {
    try {
        const { search, type, status, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

        if (search) { where += ' AND (c.Full_Name LIKE ? OR c.Phone LIKE ? OR c.Email LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (type) { where += ' AND c.Customer_Type = ?'; params.push(type); }
        if (status) { where += ' AND c.Account_Status = ?'; params.push(status); }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM customer c ${where}`, params);

        const [rows] = await db.query(`
      SELECT c.*, COUNT(o.Order_ID) AS total_orders, COALESCE(SUM(o.Total_Amount),0) AS total_spent
      FROM customer c
      LEFT JOIN orders o ON c.Customer_ID = o.Customer_ID AND o.Order_Status != 'cancelled'
      ${where}
      GROUP BY c.Customer_ID
      ORDER BY c.Created_At DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({ data: rows, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch customers' });
    }
});

// GET /api/customers/:id
router.get('/:id', async (req, res) => {
    try {
        const [[customer]] = await db.query('SELECT * FROM customer WHERE Customer_ID = ?', [req.params.id]);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });

        const [orders] = await db.query(`
      SELECT Order_ID, Order_DateTime, Order_Type, Order_Status, Total_Amount, Payment_Status
      FROM orders WHERE Customer_ID = ? ORDER BY Order_DateTime DESC LIMIT 10
    `, [req.params.id]);

        res.json({ customer, orders });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch customer' });
    }
});

// POST /api/customers
router.post('/', async (req, res) => {
    try {
        const { Full_Name, Phone, Email, Customer_Type, Account_Status } = req.body;
        if (!Full_Name || !Phone) return res.status(400).json({ error: 'Full_Name and Phone are required' });

        const [result] = await db.query(
            'INSERT INTO customer (Full_Name, Phone, Email, Customer_Type, Account_Status) VALUES (?,?,?,?,?)',
            [Full_Name, Phone, Email || null, Customer_Type || 'student', Account_Status || 'active']
        );
        res.status(201).json({ message: 'Customer created', Customer_ID: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Phone or Email already exists' });
        res.status(500).json({ error: 'Failed to create customer' });
    }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
    try {
        const { Full_Name, Phone, Email, Customer_Type, Account_Status } = req.body;
        await db.query(
            'UPDATE customer SET Full_Name=?, Phone=?, Email=?, Customer_Type=?, Account_Status=? WHERE Customer_ID=?',
            [Full_Name, Phone, Email || null, Customer_Type, Account_Status, req.params.id]
        );
        res.json({ message: 'Customer updated' });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Phone or Email already exists' });
        res.status(500).json({ error: 'Failed to update customer' });
    }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
    try {
        const [[check]] = await db.query('SELECT COUNT(*) AS cnt FROM orders WHERE Customer_ID=?', [req.params.id]);
        if (check.cnt > 0) {
            await db.query("UPDATE customer SET Account_Status='inactive' WHERE Customer_ID=?", [req.params.id]);
            return res.json({ message: 'Customer deactivated (has order history)' });
        }
        await db.query('DELETE FROM customer WHERE Customer_ID=?', [req.params.id]);
        res.json({ message: 'Customer deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete customer' });
    }
});

module.exports = router;
