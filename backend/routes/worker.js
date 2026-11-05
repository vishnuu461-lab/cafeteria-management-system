// routes/worker.js — Counter & Inventory worker APIs
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─── COUNTER WORKER APIs ──────────────────────────────────────

// GET /api/worker/counter/orders — all orders with details
router.get('/counter/orders', async (req, res) => {
    try {
        const [orders] = await db.query(`
      SELECT o.Order_ID, o.Order_DateTime, o.Order_Type, o.Order_Status,
             o.Subtotal, o.Tax_Amount, o.Discount_Amount, o.Total_Amount,
             o.Payment_Status, c.Full_Name AS Customer_Name, c.Phone,
             p.Payment_Method, p.Amount AS Paid_Amount
      FROM orders o
      JOIN customer c ON o.Customer_ID = c.Customer_ID
      LEFT JOIN payment p ON o.Order_ID = p.Order_ID
      ORDER BY o.Order_DateTime DESC
      LIMIT 100
    `);
        for (const ord of orders) {
            const [items] = await db.query(`
        SELECT oi.Quantity, oi.Unit_Price, oi.Line_Total, mi.Item_Name
        FROM order_item oi JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
        WHERE oi.Order_ID = ?
      `, [ord.Order_ID]);
            ord.items = items;
        }
        res.json(orders);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// GET /api/worker/counter/order/:id — single order details
router.get('/counter/order/:id', async (req, res) => {
    try {
        const [[order]] = await db.query(`
      SELECT o.*, c.Full_Name AS Customer_Name, c.Phone, p.Payment_Method, p.Amount AS Paid_Amount
      FROM orders o
      JOIN customer c ON o.Customer_ID = c.Customer_ID
      LEFT JOIN payment p ON o.Order_ID = p.Order_ID
      WHERE o.Order_ID = ?
    `, [req.params.id]);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        const [items] = await db.query(`
      SELECT oi.Quantity, oi.Unit_Price, oi.Line_Total, mi.Item_Name
      FROM order_item oi JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
      WHERE oi.Order_ID = ?
    `, [order.Order_ID]);
        order.items = items;
        res.json(order);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch order' }); }
});

// PATCH /api/worker/counter/cash-confirm — confirm cash payment
router.patch('/counter/cash-confirm', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { order_id, amount_received } = req.body;
        if (!order_id || amount_received === undefined)
            return res.status(400).json({ error: 'order_id and amount_received required' });

        const [[order]] = await conn.query(
            'SELECT Order_ID, Total_Amount, Payment_Status FROM orders WHERE Order_ID=?', [order_id]
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.Payment_Status === 'paid') return res.status(400).json({ error: 'Already paid' });

        const expected = parseFloat(order.Total_Amount);
        const received = parseFloat(amount_received);
        if (Math.abs(received - expected) > 0.01)
            return res.status(400).json({
                error: `Amount mismatch! Expected ₹${expected.toFixed(2)}, but received ₹${received.toFixed(2)}`
            });

        // Check if payment record exists
        const [[existing]] = await conn.query('SELECT Payment_ID FROM payment WHERE Order_ID=?', [order_id]);
        if (existing) {
            await conn.query("UPDATE payment SET Payment_Status='completed' WHERE Order_ID=?", [order_id]);
        } else {
            await conn.query(
                "INSERT INTO payment (Order_ID,Payment_Method,Amount,Payment_Status) VALUES (?,'cash',?,'completed')",
                [order_id, expected]
            );
        }
        await conn.query("UPDATE orders SET Payment_Status='paid' WHERE Order_ID=?", [order_id]);
        await conn.commit();
        res.json({ success: true, message: 'Cash payment confirmed! Status updated to Paid.' });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ error: e.message || 'Failed to confirm payment' });
    } finally { conn.release(); }
});

// PATCH /api/worker/counter/order-status — update order status
router.patch('/counter/order-status', async (req, res) => {
    try {
        const { order_id, status } = req.body;
        const valid = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
        if (!order_id || !valid.includes(status))
            return res.status(400).json({ error: 'Valid order_id and status required' });
        await db.query('UPDATE orders SET Order_Status=? WHERE Order_ID=?', [status, order_id]);
        res.json({ success: true, message: `Order #${order_id} status updated to ${status}` });
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to update status' }); }
});

// ─── INVENTORY WORKER APIs ────────────────────────────────────

// GET /api/worker/inventory — all inventory items
router.get('/inventory', async (req, res) => {
    try {
        const [items] = await db.query(`
      SELECT ii.Inventory_Item_ID, ii.Item_Code, ii.Item_Name, ii.Unit,
             ii.Current_Stock, ii.Reorder_Level, ii.Unit_Cost, ii.Inventory_Status,
             s.Supplier_Name
      FROM inventory_item ii
      LEFT JOIN supplier s ON ii.Supplier_ID = s.Supplier_ID
      ORDER BY ii.Item_Name
    `);
        // annotate stock status
        items.forEach(i => {
            if (i.Inventory_Status === 'inactive' || i.Current_Stock <= 0)
                i.Stock_Status = 'out_of_stock';
            else if (i.Current_Stock <= i.Reorder_Level)
                i.Stock_Status = 'low_stock';
            else
                i.Stock_Status = 'in_stock';
        });
        res.json(items);
    } catch (e) { console.error(e); res.status(500).json({ error: 'Failed to fetch inventory' }); }
});

// PATCH /api/worker/inventory/:id — update stock quantity / status
router.patch('/inventory/:id', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { current_stock, status, mark_out_of_stock } = req.body;
        const id = req.params.id;

        if (mark_out_of_stock) {
            await conn.query(
                "UPDATE inventory_item SET Current_Stock=0, Inventory_Status='inactive' WHERE Inventory_Item_ID=?", [id]
            );
            // Cascade: mark related menu items unavailable
            await conn.query(`
        UPDATE menu_item mi
        JOIN recipe_item ri ON mi.Menu_Item_ID = ri.Menu_Item_ID
        SET mi.Availability_Status = 'unavailable'
        WHERE ri.Inventory_Item_ID = ?
      `, [id]);
        } else {
            const updates = [];
            const vals = [];
            if (current_stock !== undefined) { updates.push('Current_Stock=?'); vals.push(parseFloat(current_stock)); }
            if (status) { updates.push('Inventory_Status=?'); vals.push(status); }
            if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });
            vals.push(id);
            await conn.query(`UPDATE inventory_item SET ${updates.join(',')} WHERE Inventory_Item_ID=?`, vals);

            // If restocking (stock > 0 and active), restore menu items IF ALL their ingredients are available
            if (current_stock > 0 || status === 'active') {
                // Find menu items that use this inventory item
                const [affectedMenuItems] = await conn.query(
                    'SELECT DISTINCT Menu_Item_ID FROM recipe_item WHERE Inventory_Item_ID=?', [id]
                );
                for (const { Menu_Item_ID } of affectedMenuItems) {
                    // Check if ALL ingredients for this menu item are in stock
                    const [[check]] = await conn.query(`
            SELECT COUNT(*) AS total,
                   SUM(CASE WHEN ii.Current_Stock <= 0 OR ii.Inventory_Status='inactive' THEN 1 ELSE 0 END) AS out_count
            FROM recipe_item ri
            JOIN inventory_item ii ON ri.Inventory_Item_ID = ii.Inventory_Item_ID
            WHERE ri.Menu_Item_ID = ?
          `, [Menu_Item_ID]);
                    if (check.out_count === 0) {
                        await conn.query(
                            "UPDATE menu_item SET Availability_Status='available' WHERE Menu_Item_ID=?", [Menu_Item_ID]
                        );
                    }
                }
            }
        }
        await conn.commit();
        res.json({ success: true, message: 'Inventory updated successfully' });
    } catch (e) {
        await conn.rollback();
        console.error(e);
        res.status(500).json({ error: 'Failed to update inventory' });
    } finally { conn.release(); }
});

module.exports = router;
