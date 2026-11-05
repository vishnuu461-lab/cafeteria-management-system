const express = require('express');
const router = express.Router();
const db = require('../config/db');

// In-memory OTP store
const otpStore = new Map();
function generateOTP() { return Math.floor(100000 + Math.random() * 900000).toString(); }

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
        console.log(`[OTP] Phone: ${phone} → OTP: ${otp}`);

        res.json({
            message: 'OTP sent!',
            is_new_user: !customer,
            existing_name: customer ? customer.Full_Name : null,
            demo_otp: otp
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to send OTP' }); }
});

// ─── POST /api/student/otp/verify ────────────────────────────
router.post('/otp/verify', async (req, res) => {
    try {
        const { phone, otp, name } = req.body;
        if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP required' });

        const stored = otpStore.get(String(phone));
        if (!stored) return res.status(400).json({ error: 'OTP not found. Request a new one.' });
        if (Date.now() > stored.expiry) { otpStore.delete(String(phone)); return res.status(400).json({ error: 'OTP expired.' }); }
        if (stored.otp !== String(otp)) return res.status(400).json({ error: 'Invalid OTP.' });

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
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to verify OTP' }); }
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

        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.Category_Name])
                grouped[item.Category_Name] = { Category_ID: item.Category_ID, items: [] };
            grouped[item.Category_Name].items.push(item);
        });

        res.json({ items, grouped });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch menu' }); }
});

// ─── GET /api/student/offers — active offers ──────────────────
router.get('/offers', async (req, res) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const [offers] = await db.query(`
            SELECT Offer_ID, Offer_Code, Offer_Name, Discount_Type,
                   Discount_Value, Min_Order_Value, Valid_From, Valid_To
            FROM offer
            WHERE Offer_Status = 'active'
              AND Valid_From <= ? AND Valid_To >= ?
            ORDER BY Discount_Value DESC
        `, [today, today]);
        res.json(offers);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to fetch offers' }); }
});

// ─── POST /api/student/coupon/validate ───────────────────────
router.post('/coupon/validate', async (req, res) => {
    try {
        const { code, subtotal } = req.body;
        if (!code) return res.status(400).json({ error: 'Coupon code required' });

        const today = new Date().toISOString().slice(0, 10);
        const [[offer]] = await db.query(`
            SELECT * FROM offer
            WHERE Offer_Code = ? AND Offer_Status = 'active'
              AND Valid_From <= ? AND Valid_To >= ?
        `, [code.toUpperCase(), today, today]);

        if (!offer) return res.status(400).json({ error: 'Invalid or expired coupon code' });

        const sub = parseFloat(subtotal) || 0;
        if (sub < parseFloat(offer.Min_Order_Value || 0))
            return res.status(400).json({
                error: `Minimum order of ₹${offer.Min_Order_Value} required for this coupon`
            });

        let discount = 0;
        if (offer.Discount_Type === 'percentage') {
            discount = (sub * parseFloat(offer.Discount_Value)) / 100;
        } else {
            discount = parseFloat(offer.Discount_Value);
        }
        discount = Math.min(discount, sub); // can't exceed subtotal

        res.json({
            valid: true,
            offer_id: offer.Offer_ID,
            offer_name: offer.Offer_Name,
            discount_type: offer.Discount_Type,
            discount_value: offer.Discount_Value,
            discount_amount: parseFloat(discount.toFixed(2)),
            message: `Coupon applied! You save ₹${discount.toFixed(2)}`
        });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to validate coupon' }); }
});

// ─── POST /api/student/order ──────────────────────────────────
router.post('/order', async (req, res) => {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        const { Customer_ID, Order_Type, Payment_Method, items, coupon_code, offer_id } = req.body;

        if (!Customer_ID || !items?.length)
            return res.status(400).json({ error: 'Customer and items required' });

        const [[cafe]] = await conn.query("SELECT Cafeteria_ID FROM cafeteria WHERE Cafeteria_Status='open' LIMIT 1");
        const [[counter]] = await conn.query("SELECT Counter_ID FROM counter WHERE Counter_Status='open' LIMIT 1");
        const [[emp]] = await conn.query("SELECT Employee_ID FROM employee WHERE Employee_Status='active' LIMIT 1");
        if (!cafe || !counter || !emp) throw new Error('Cafeteria is currently closed. Please try later.');

        // Insert order
        const [orderResult] = await conn.query(
            'INSERT INTO orders (Customer_ID,Cafeteria_ID,Counter_ID,Employee_ID,Order_Type,Order_Status,Payment_Status) VALUES (?,?,?,?,?,?,?)',
            [Customer_ID, cafe.Cafeteria_ID, counter.Counter_ID, emp.Employee_ID, Order_Type || 'dine_in', 'pending', 'unpaid']
        );
        const Order_ID = orderResult.insertId;

        // Insert each order item
        let rawSubtotal = 0;
        let rawTax = 0;
        for (const item of items) {
            const [[mi]] = await conn.query(
                'SELECT Price, Tax_Rate, Availability_Status, Item_Name FROM menu_item WHERE Menu_Item_ID=?',
                [item.Menu_Item_ID]
            );
            if (!mi) throw new Error('Menu item not found');
            if (mi.Availability_Status !== 'available')
                throw new Error(`"${mi.Item_Name}" is currently unavailable.`);

            const line_total = parseFloat((item.quantity * mi.Price * (1 + mi.Tax_Rate / 100)).toFixed(2));
            rawSubtotal += item.quantity * mi.Price;
            rawTax += item.quantity * mi.Price * (mi.Tax_Rate / 100);
            await conn.query(
                'INSERT INTO order_item (Order_ID,Menu_Item_ID,Quantity,Unit_Price,Tax_Rate,Line_Total) VALUES (?,?,?,?,?,?)',
                [Order_ID, item.Menu_Item_ID, item.quantity, mi.Price, mi.Tax_Rate, line_total]
            );
        }

        // Apply coupon discount (server-side validation)
        let discountAmount = 0;
        let appliedOfferID = null;
        if (coupon_code) {
            const today = new Date().toISOString().slice(0, 10);
            const [[offer]] = await conn.query(
                "SELECT * FROM offer WHERE Offer_Code=? AND Offer_Status='active' AND Valid_From<=? AND Valid_To>=?",
                [coupon_code.toUpperCase(), today, today]
            );
            if (offer) {
                if (rawSubtotal >= parseFloat(offer.Min_Order_Value || 0)) {
                    if (offer.Discount_Type === 'percentage')
                        discountAmount = (rawSubtotal * parseFloat(offer.Discount_Value)) / 100;
                    else
                        discountAmount = parseFloat(offer.Discount_Value);
                    discountAmount = Math.min(discountAmount, rawSubtotal);
                    appliedOfferID = offer.Offer_ID;
                }
            }
        }

        const finalTotal = Math.max(0, parseFloat((rawSubtotal + rawTax - discountAmount).toFixed(2)));

        // Update order totals
        await conn.query(
            'UPDATE orders SET Subtotal=?,Tax_Amount=?,Discount_Amount=?,Total_Amount=? WHERE Order_ID=?',
            [rawSubtotal.toFixed(2), rawTax.toFixed(2), discountAmount.toFixed(2), finalTotal, Order_ID]
        );

        // Link offer if applied
        if (appliedOfferID) {
            await conn.query(
                'INSERT INTO order_offer (Order_ID, Offer_ID) VALUES (?,?) ON DUPLICATE KEY UPDATE Offer_ID=Offer_ID',
                [Order_ID, appliedOfferID]
            );
        }

        // Record online payment
        let payStatus = 'unpaid';
        if (Payment_Method && Payment_Method !== 'cash') {
            await conn.query(
                'INSERT INTO payment (Order_ID,Payment_Method,Amount,Payment_Status) VALUES (?,?,?,?)',
                [Order_ID, Payment_Method, finalTotal, 'completed']
            );
            await conn.query("UPDATE orders SET Payment_Status='paid' WHERE Order_ID=?", [Order_ID]);
            payStatus = 'paid';
        }

        const [orderItems] = await conn.query(`
            SELECT oi.Quantity, oi.Unit_Price, oi.Line_Total, mi.Item_Name, mi.Item_Code
            FROM order_item oi
            JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
            WHERE oi.Order_ID = ?
        `, [Order_ID]);

        await conn.commit();

        res.status(201).json({
            Order_ID,
            Subtotal: parseFloat(rawSubtotal.toFixed(2)),
            Tax_Amount: parseFloat(rawTax.toFixed(2)),
            Discount_Amount: parseFloat(discountAmount.toFixed(2)),
            Total_Amount: finalTotal,
            Coupon_Code: coupon_code || null,
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
    } finally { conn.release(); }
});

// ─── GET /api/student/orders/:customer_id ─────────────────────
router.get('/orders/:customer_id', async (req, res) => {
    try {
        const [orders] = await db.query(`
            SELECT o.Order_ID, o.Order_DateTime, o.Order_Type, o.Order_Status,
                   o.Subtotal, o.Tax_Amount, o.Discount_Amount, o.Total_Amount, o.Payment_Status,
                   p.Payment_Method
            FROM orders o
            LEFT JOIN payment p ON o.Order_ID = p.Order_ID
            WHERE o.Customer_ID = ?
            ORDER BY o.Order_DateTime DESC LIMIT 50
        `, [req.params.customer_id]);

        for (const order of orders) {
            const [items] = await db.query(`
                SELECT oi.Quantity, oi.Line_Total, oi.Unit_Price, mi.Item_Name
                FROM order_item oi JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
                WHERE oi.Order_ID = ?
            `, [order.Order_ID]);
            order.items = items;
        }
        res.json(orders);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch orders' }); }
});

// ─── GET /api/student/order/:order_id/status ─────────────────
router.get('/order/:order_id/status', async (req, res) => {
    try {
        const [[order]] = await db.query(
            'SELECT Order_ID, Order_Status, Payment_Status, Total_Amount, Order_DateTime FROM orders WHERE Order_ID=?',
            [req.params.order_id]
        );
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch order status' }); }
});

// ─── GET /api/student/order/:order_id/receipt ────────────────
router.get('/order/:order_id/receipt', async (req, res) => {
    try {
        const [[order]] = await db.query(`
            SELECT o.*, c.Full_Name AS Customer_Name, c.Phone,
                   p.Payment_Method
            FROM orders o
            JOIN customer c ON o.Customer_ID = c.Customer_ID
            LEFT JOIN payment p ON o.Order_ID = p.Order_ID
            WHERE o.Order_ID = ?
        `, [req.params.order_id]);
        if (!order) return res.status(404).json({ error: 'Order not found' });

        const [items] = await db.query(`
            SELECT oi.Quantity, oi.Unit_Price, oi.Line_Total, mi.Item_Name
            FROM order_item oi JOIN menu_item mi ON oi.Menu_Item_ID=mi.Menu_Item_ID
            WHERE oi.Order_ID=?
        `, [order.Order_ID]);

        const [[oo]] = await db.query(
            'SELECT of.Offer_Code FROM order_offer oo JOIN offer of ON oo.Offer_ID=of.Offer_ID WHERE oo.Order_ID=?',
            [order.Order_ID]
        ).catch(() => [[null]]);

        res.json({ ...order, items, applied_coupon: oo?.Offer_Code || null });
    } catch (err) { res.status(500).json({ error: 'Failed to fetch receipt' }); }
});

module.exports = router;
