const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/offers
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT o.*,
             COUNT(oo.Order_ID) AS times_used,
             COALESCE(SUM(oo.Applied_Discount), 0) AS total_discount_given
      FROM offer o
      LEFT JOIN order_offer oo ON o.Offer_ID = oo.Offer_ID
      GROUP BY o.Offer_ID ORDER BY o.Valid_From DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch offers' });
    }
});

// GET /api/offers/active
router.get('/active', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT * FROM offer
      WHERE Offer_Status = 'active' AND CURDATE() BETWEEN Valid_From AND Valid_To
      ORDER BY Discount_Value DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch active offers' });
    }
});

// POST /api/offers
router.post('/', async (req, res) => {
    try {
        const { Offer_Code, Offer_Name, Discount_Type, Discount_Value, Min_Order_Value, Valid_From, Valid_To, Offer_Status } = req.body;
        if (!Offer_Code || !Offer_Name || !Discount_Value || !Valid_From || !Valid_To)
            return res.status(400).json({ error: 'All required fields must be provided' });

        const [result] = await db.query(
            'INSERT INTO offer (Offer_Code, Offer_Name, Discount_Type, Discount_Value, Min_Order_Value, Valid_From, Valid_To, Offer_Status) VALUES (?,?,?,?,?,?,?,?)',
            [Offer_Code, Offer_Name, Discount_Type || 'percentage', Discount_Value, Min_Order_Value || 0, Valid_From, Valid_To, Offer_Status || 'active']
        );
        res.status(201).json({ message: 'Offer created', Offer_ID: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Offer code already exists' });
        res.status(500).json({ error: 'Failed to create offer' });
    }
});

// PUT /api/offers/:id
router.put('/:id', async (req, res) => {
    try {
        const { Offer_Code, Offer_Name, Discount_Type, Discount_Value, Min_Order_Value, Valid_From, Valid_To, Offer_Status } = req.body;
        await db.query(
            'UPDATE offer SET Offer_Code=?, Offer_Name=?, Discount_Type=?, Discount_Value=?, Min_Order_Value=?, Valid_From=?, Valid_To=?, Offer_Status=? WHERE Offer_ID=?',
            [Offer_Code, Offer_Name, Discount_Type, Discount_Value, Min_Order_Value || 0, Valid_From, Valid_To, Offer_Status, req.params.id]
        );
        res.json({ message: 'Offer updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update offer' });
    }
});

// PATCH /api/offers/:id/deactivate
router.patch('/:id/deactivate', async (req, res) => {
    try {
        await db.query("UPDATE offer SET Offer_Status='inactive' WHERE Offer_ID=?", [req.params.id]);
        res.json({ message: 'Offer deactivated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to deactivate offer' });
    }
});

// GET /api/offers/feedback/all
router.get('/feedback/all', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT f.*, c.Full_Name AS Customer_Name, cf.Cafeteria_Name
      FROM feedback f
      JOIN customer c   ON f.Customer_ID  = c.Customer_ID
      JOIN orders o     ON f.Order_ID     = o.Order_ID
      JOIN cafeteria cf ON o.Cafeteria_ID = cf.Cafeteria_ID
      ORDER BY f.Feedback_Date DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch feedback' });
    }
});

// POST /api/offers/feedback
router.post('/feedback', async (req, res) => {
    try {
        const { Order_ID, Customer_ID, Rating, Feedback_Category, Comments } = req.body;
        if (!Order_ID || !Customer_ID || !Rating) return res.status(400).json({ error: 'Order_ID, Customer_ID, Rating required' });

        const [result] = await db.query(
            'INSERT INTO feedback (Order_ID, Customer_ID, Rating, Feedback_Category, Comments) VALUES (?,?,?,?,?)',
            [Order_ID, Customer_ID, Rating, Feedback_Category || 'food_quality', Comments || null]
        );
        res.status(201).json({ message: 'Feedback submitted', Feedback_ID: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Feedback already submitted for this order' });
        res.status(500).json({ error: 'Failed to submit feedback' });
    }
});

module.exports = router;
