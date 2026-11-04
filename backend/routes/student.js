const express = require('express');
const router = express.Router();
const db = require('../config/db');

// In-memory OTP store: Map<phone, {otp, expiry, attempts}>
const otpStore = new Map();

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/student/otp/request ───────────────────────────
router.post('/otp/request', async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone || String(phone).length < 10)
            return res.status(400).json({ error: 'Valid 10-digit phone number required' });

        const otp = generateOTP();
        otpStore.set(String(phone), { otp, expiry: Date.now() + 10 * 60 * 1000 });

        const [[customer]] = await db.query(
            'SELECT Customer_ID, Full_Name FROM customer WHERE Phone = ?', [String(phone)]
        );

        console.log(`[OTP] Phone: ${phone} → OTP: ${otp}`); // shows in backend console

        res.json({
            message: 'OTP sent! (check server console for demo OTP)',
            is_new_user: !customer,
            existing_name: customer ? customer.Full_Name : null,
            demo_otp: otp // For college demo — remove in production
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// ─── POST /api/student/otp/verify ────────────────────────────
router.post('/otp/verify', async (req, res) => {
    try {
        const { phone, otp, name } = req.body;
        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

        const stored = otpStore.get(String(phone));
        if (!stored) return res.status(400).json({ error: 'OTP not found. Request a new one.' });
        if (Date.now() > stored.expiry) { otpStore.delete(String(phone)); return res.status(400).json({ error: 'OTP expired. Request a new one.' }); }
        if (stored.otp !== String(otp)) return res.status(400).json({ error: 'Invalid OTP. Try again.' });

        otpStore.delete(String(phone));

        let [[customer]] = await db.query('SELECT * FROM customer WHERE Phone = ?', [String(phone)]);

        if (!customer) {
            if (!name) return res.status(400).json({ error: 'Name required for new registration', needs_name: true });
            const [result] = await db.query(
                "INSERT INTO customer (Full_Name, Phone, Customer_Type, Account_Status) VALUES (?,?,'student','active')",
                [name, String(phone)]
            );
            [[customer]] = await db.query('SELECT * FROM customer WHERE Customer_ID = ?', [result.insertId]);
        }

        res.json({
            success: true,
            customer: {
                Customer_ID: customer.Customer_ID,
                Full_Name: customer.Full_Name,
                Phone: customer.Phone,
                Customer_Type: customer.Customer_Type,
                Account_Status: customer.Account_Status
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to verify OTP' });
    }
});

// ─── GET /api/student/menu ────────────────────────────────────
router.get('/menu', async (req, res) => {
    try {
        const [items] = await db.query(`
      SELECT mi.Menu_Item_ID, mi.Item_Code, mi.Item_Name, mi.Description,
             mi.Price, mi.Prep_Time_Min, mi.Availability_Status, mi.Tax_Rate,
             cat.Category_ID, cat.Category_Name
      FROM menu_item mi
      JOIN category cat ON mi.Category_ID = cat.Category_ID
      WHERE cat.Category_Status = 'active'
      ORDER BY cat.Category_Name, mi.Availability_Status DESC, mi.Item_Name
    `);

        // Group by category for easy rendering
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.Category_Name]) {
                grouped[item.Category_Name] = { Category_ID: item.Category_ID, items: [] };
            }
            grouped[item.Category_Name].items.push(item);
        });

        res.json({ items, grouped });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch menu' });
    }
});

// ─── POST /api/student/order ──────────────────────────────────
router.post('/order', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { Customer_ID, Order_Type, Payment_Method, items } = req.body;

        if (!Customer_ID || !items?.length)
            return res.status(400).json({ error: 'Customer and items required' });

        // Pick default active cafeteria / counter / employee
        const [[cafe]] = await conn.query("SELECT Cafeteria_ID FROM cafeteria WHERE Cafeteria_Status='open' LIMIT 1");
        const [[counter]] = await conn.query("SELECT Counter_ID FROM counter WHERE Counter_Status='open' LIMIT 1");
        const [[emp]] = await conn.query("SELECT Employee_ID FROM employee WHERE Employee_Status='active' LIMIT 1");
        if (!cafe || !counter || !emp) throw new Error('Cafeteria is currently closed. Please try later.');

        // Insert order
        const [orderResult] = await conn.query(
            'INSERT INTO orders (Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_Type, Order_Status, Payment_Status) VALUES (?,?,?,?,?,?,?)',
            [Customer_ID, cafe.Cafeteria_ID, counter.Counter_ID, emp.Employee_ID, Order_Type || 'dine_in', 'pending', 'unpaid']
        );
        const Order_ID = orderResult.insertId;

        // Insert each order item
        for (const item of items) {
            const [[mi]] = await conn.query(
                'SELECT Price, Tax_Rate, Availability_Status, Item_Name FROM menu_item WHERE Menu_Item_ID = ?',
                [item.Menu_Item_ID]
            );
            if (!mi) throw new Error(`Menu item not found`);
            if (mi.Availability_Status !== 'available')
                throw new Error(`"${mi.Item_Name}" is currently unavailable.`);

            const line_total = parseFloat((item.quantity * mi.Price * (1 + mi.Tax_Rate / 100)).toFixed(2));
            await conn.query(
                'INSERT INTO order_item (Order_ID, Menu_Item_ID, Quantity, Unit_Price, Tax_Rate, Line_Total) VALUES (?,?,?,?,?,?)',
                [Order_ID, item.Menu_Item_ID, item.quantity, mi.Price, mi.Tax_Rate, line_total]
            );
        }

        // Trigger has updated Subtotal & Tax — read final totals
        const [[totals]] = await conn.query(
            'SELECT Subtotal, Tax_Amount, Total_Amount FROM orders WHERE Order_ID = ?', [Order_ID]
        );

        // Record online/card payment immediately
        let payStatus = 'unpaid';
        if (Payment_Method && Payment_Method !== 'cash') {
            await conn.query(
                'INSERT INTO payment (Order_ID, Payment_Method, Amount, Payment_Status) VALUES (?,?,?,?)',
                [Order_ID, Payment_Method, totals.Total_Amount, 'completed']
            );
            await conn.query("UPDATE orders SET Payment_Status='paid' WHERE Order_ID=?", [Order_ID]);
            payStatus = 'paid';
        }

        // Get order items for confirmation screen
        const [orderItems] = await conn.query(`
      SELECT oi.Quantity, oi.Unit_Price, oi.Line_Total, mi.Item_Name, mi.Item_Code
      FROM order_item oi
      JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
      WHERE oi.Order_ID = ?
    `, [Order_ID]);

        await conn.commit();

        res.status(201).json({
            Order_ID,
            Subtotal: totals.Subtotal,
            Tax_Amount: totals.Tax_Amount,
            Total_Amount: totals.Total_Amount,
            Order_Type: Order_Type || 'dine_in',
            Payment_Method: Payment_Method || 'cash',
            Order_Status: 'pending',
            Payment_Status: payStatus,
            items: orderItems
        });
    } catch (err) {
        await conn.rollback();
        console.error(err);
        res.status(500).json({ error: err.message || 'Failed to place order' });
    } finally {
        conn.release();
    }
});

// ─── GET /api/student/orders/:customer_id ─────────────────────
router.get('/orders/:customer_id', async (req, res) => {
    try {
        const [orders] = await db.query(`
      SELECT o.Order_ID, o.Order_DateTime, o.Order_Type, o.Order_Status,
             o.Subtotal, o.Tax_Amount, o.Total_Amount, o.Payment_Status,
             p.Payment_Method
      FROM orders o
      LEFT JOIN payment p ON o.Order_ID = p.Order_ID
      WHERE o.Customer_ID = ?
      ORDER BY o.Order_DateTime DESC LIMIT 20
    `, [req.params.customer_id]);

        for (const order of orders) {
            const [items] = await db.query(`
        SELECT oi.Quantity, oi.Line_Total, mi.Item_Name
        FROM order_item oi
        JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
        WHERE oi.Order_ID = ?
      `, [order.Order_ID]);
            order.items = items;
        }

        res.json(orders);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

// ─── GET /api/student/order/:order_id/status ─────────────────
router.get('/order/:order_id/status', async (req, res) => {
    try {
        const [[order]] = await db.query(
            'SELECT Order_ID, Order_Status, Payment_Status, Total_Amount, Order_DateTime FROM orders WHERE Order_ID = ?',
            [req.params.order_id]
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch order status' });
    }
});

module.exports = router;
