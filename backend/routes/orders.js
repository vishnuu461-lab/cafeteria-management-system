const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/orders
router.get('/', async (req, res) => {
    try {
        const { search, status, payment_status, page = 1, limit = 15 } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

        if (search) { where += ' AND (o.Order_ID LIKE ? OR c.Full_Name LIKE ? OR c.Phone LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
        if (status) { where += ' AND o.Order_Status = ?'; params.push(status); }
        if (payment_status) { where += ' AND o.Payment_Status = ?'; params.push(payment_status); }

        const [[{ total }]] = await db.query(`
      SELECT COUNT(*) AS total FROM orders o JOIN customer c ON o.Customer_ID = c.Customer_ID ${where}
    `, params);

        const [rows] = await db.query(`
      SELECT o.*, c.Full_Name AS Customer_Name, c.Phone,
             cf.Cafeteria_Name, ct.Counter_Name, e.Employee_Name
      FROM orders o
      JOIN customer c   ON o.Customer_ID  = c.Customer_ID
      JOIN cafeteria cf ON o.Cafeteria_ID = cf.Cafeteria_ID
      JOIN counter ct   ON o.Counter_ID   = ct.Counter_ID
      JOIN employee e   ON o.Employee_ID  = e.Employee_ID
      ${where}
      ORDER BY o.Order_DateTime DESC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({ data: rows, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
    try {
        const [[order]] = await db.query(`
      SELECT o.*, c.Full_Name AS Customer_Name, c.Phone, c.Email,
             cf.Cafeteria_Name, ct.Counter_Name, e.Employee_Name, e.Role
      FROM orders o
      JOIN customer c   ON o.Customer_ID  = c.Customer_ID
      JOIN cafeteria cf ON o.Cafeteria_ID = cf.Cafeteria_ID
      JOIN counter ct   ON o.Counter_ID   = ct.Counter_ID
      JOIN employee e   ON o.Employee_ID  = e.Employee_ID
      WHERE o.Order_ID = ?
    `, [req.params.id]);

        if (!order) return res.status(404).json({ error: 'Order not found' });

        const [items] = await db.query(`
      SELECT oi.*, mi.Item_Name, mi.Item_Code, cat.Category_Name
      FROM order_item oi
      JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
      JOIN category cat ON mi.Category_ID = cat.Category_ID
      WHERE oi.Order_ID = ?
    `, [req.params.id]);

        const [[payment]] = await db.query('SELECT * FROM payment WHERE Order_ID = ?', [req.params.id]);
        const [[offer]] = await db.query(`
      SELECT oo.*, o.Offer_Code, o.Offer_Name, o.Discount_Type, o.Discount_Value
      FROM order_offer oo JOIN offer o ON oo.Offer_ID = o.Offer_ID
      WHERE oo.Order_ID = ?
    `, [req.params.id]);
        const [[feedback]] = await db.query('SELECT * FROM feedback WHERE Order_ID = ?', [req.params.id]);

        res.json({ order, items, payment: payment || null, offer: offer || null, feedback: feedback || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// POST /api/orders  — create order transactionally
router.post('/', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_Type, items, offer_id } = req.body;

        if (!Customer_ID || !Cafeteria_ID || !Counter_ID || !Employee_ID || !items?.length)
            return res.status(400).json({ error: 'Missing required fields or items' });

        // Insert order shell
        const [orderResult] = await conn.query(
            'INSERT INTO orders (Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_Type) VALUES (?,?,?,?,?)',
            [Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_Type || 'dine_in']
        );
        const Order_ID = orderResult.insertId;

        // Insert each order item
        for (const item of items) {
            const [[mi]] = await conn.query('SELECT Price, Tax_Rate FROM menu_item WHERE Menu_Item_ID = ?', [item.Menu_Item_ID]);
            if (!mi) throw new Error(`Menu item ${item.Menu_Item_ID} not found`);
            const line_total = parseFloat((item.quantity * mi.Price * (1 + mi.Tax_Rate / 100)).toFixed(2));
            await conn.query(
                'INSERT INTO order_item (Order_ID, Menu_Item_ID, Quantity, Unit_Price, Tax_Rate, Line_Total) VALUES (?,?,?,?,?,?)',
                [Order_ID, item.Menu_Item_ID, item.quantity, mi.Price, mi.Tax_Rate, line_total]
            );
        }

        // Get current totals (trigger has updated them)
        const [[totals]] = await conn.query('SELECT Subtotal, Tax_Amount FROM orders WHERE Order_ID = ?', [Order_ID]);
        let discount = 0;

        // Apply offer if provided
        if (offer_id) {
            const [[offer]] = await conn.query(
                "SELECT * FROM offer WHERE Offer_ID = ? AND Offer_Status = 'active' AND CURDATE() BETWEEN Valid_From AND Valid_To",
                [offer_id]
            );
            if (offer && totals.Subtotal >= offer.Min_Order_Value) {
                discount = offer.Discount_Type === 'percentage'
                    ? parseFloat((totals.Subtotal * offer.Discount_Value / 100).toFixed(2))
                    : parseFloat(offer.Discount_Value);
                await conn.query('INSERT INTO order_offer (Order_ID, Offer_ID, Applied_Discount) VALUES (?,?,?)', [Order_ID, offer_id, discount]);
            }
        }

        const total = parseFloat((totals.Subtotal + totals.Tax_Amount - discount).toFixed(2));
        await conn.query('UPDATE orders SET Discount_Amount=?, Total_Amount=? WHERE Order_ID=?', [discount, total, Order_ID]);

        await conn.commit();
        res.status(201).json({ message: 'Order created', Order_ID, Total_Amount: total });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to create order' });
    } finally {
        conn.release();
    }
});

// PATCH /api/orders/:id/status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
        await db.query('UPDATE orders SET Order_Status=? WHERE Order_ID=?', [status, req.params.id]);
        res.json({ message: `Order status updated to ${status}` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

module.exports = router;
