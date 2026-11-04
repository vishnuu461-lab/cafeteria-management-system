const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/reports/daily-sales
router.get('/daily-sales', async (req, res) => {
    try {
        const { from, to } = req.query;
        const fromDate = from || new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
        const toDate = to || new Date().toISOString().slice(0, 10);

        const [rows] = await db.query(`
      SELECT DATE(Order_DateTime) AS date, COUNT(Order_ID) AS orders, SUM(Total_Amount) AS revenue,
             SUM(Tax_Amount) AS tax, SUM(Discount_Amount) AS discount
      FROM orders
      WHERE DATE(Order_DateTime) BETWEEN ? AND ? AND Order_Status != 'cancelled'
      GROUP BY DATE(Order_DateTime) ORDER BY date ASC
    `, [fromDate, toDate]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch daily sales' });
    }
});

// GET /api/reports/top-items
router.get('/top-items', async (req, res) => {
    try {
        const { limit = 8 } = req.query;
        const [rows] = await db.query(`
      SELECT mi.Menu_Item_ID, mi.Item_Name, cat.Category_Name,
             SUM(oi.Quantity) AS qty_sold, SUM(oi.Line_Total) AS revenue
      FROM order_item oi
      JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
      JOIN category cat ON mi.Category_ID  = cat.Category_ID
      JOIN orders o ON oi.Order_ID = o.Order_ID AND o.Order_Status != 'cancelled'
      GROUP BY mi.Menu_Item_ID, mi.Item_Name, cat.Category_Name
      ORDER BY qty_sold DESC LIMIT ?
    `, [parseInt(limit)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch top items' });
    }
});

// GET /api/reports/category-sales
router.get('/category-sales', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT cat.Category_Name, COUNT(DISTINCT oi.Order_ID) AS orders,
             SUM(oi.Quantity) AS qty_sold, SUM(oi.Line_Total) AS revenue
      FROM order_item oi
      JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
      JOIN category cat ON mi.Category_ID  = cat.Category_ID
      JOIN orders o ON oi.Order_ID = o.Order_ID AND o.Order_Status != 'cancelled'
      GROUP BY cat.Category_ID, cat.Category_Name ORDER BY revenue DESC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch category sales' });
    }
});

// GET /api/reports/customer-analysis
router.get('/customer-analysis', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT c.Customer_ID, c.Full_Name, c.Customer_Type,
             COUNT(o.Order_ID) AS total_orders,
             COALESCE(SUM(o.Total_Amount), 0) AS total_spent,
             COALESCE(AVG(o.Total_Amount), 0) AS avg_order,
             CASE
               WHEN COUNT(o.Order_ID) >= 10 THEN 'Regular'
               WHEN COUNT(o.Order_ID) >= 3  THEN 'Occasional'
               ELSE 'New'
             END AS category
      FROM customer c
      LEFT JOIN orders o ON c.Customer_ID = o.Customer_ID AND o.Order_Status != 'cancelled'
      GROUP BY c.Customer_ID, c.Full_Name, c.Customer_Type
      ORDER BY total_spent DESC LIMIT 20
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch customer analysis' });
    }
});

// GET /api/reports/low-stock
router.get('/low-stock', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT ii.*, s.Supplier_Name, s.Phone AS Supplier_Phone
      FROM inventory_item ii
      LEFT JOIN supplier s ON ii.Supplier_ID = s.Supplier_ID
      WHERE ii.Current_Stock <= ii.Reorder_Level AND ii.Inventory_Status = 'active'
      ORDER BY (ii.Current_Stock / NULLIF(ii.Reorder_Level, 0)) ASC
    `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch low stock items' });
    }
});

// GET /api/reports/feedback-analysis
router.get('/feedback-analysis', async (req, res) => {
    try {
        const [avgRating] = await db.query('SELECT AVG(Rating) AS avg FROM feedback');
        const [distribution] = await db.query(`
      SELECT Rating, COUNT(*) AS count FROM feedback GROUP BY Rating ORDER BY Rating DESC
    `);
        const [byCategory] = await db.query(`
      SELECT Feedback_Category, COUNT(*) AS count, AVG(Rating) AS avg_rating
      FROM feedback GROUP BY Feedback_Category ORDER BY count DESC
    `);
        res.json({ avgRating, distribution, byCategory });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch feedback analysis' });
    }
});

// GET /api/reports/payment-analysis
router.get('/payment-analysis', async (req, res) => {
    try {
        const [[totals]] = await db.query(`
      SELECT COUNT(*) AS total_txn, SUM(Amount) AS total_collected FROM payment WHERE Payment_Status='completed'
    `);
        const [byMethod] = await db.query(`
      SELECT Payment_Method, COUNT(*) AS count, SUM(Amount) AS total
      FROM payment WHERE Payment_Status='completed'
      GROUP BY Payment_Method ORDER BY total DESC
    `);
        res.json({ totals, byMethod });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch payment analysis' });
    }
});

module.exports = router;
