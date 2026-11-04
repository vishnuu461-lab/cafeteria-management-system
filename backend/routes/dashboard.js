const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
    try {
        const [[stats]] = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM customer WHERE Account_Status = 'active')                        AS active_customers,
        (SELECT COUNT(*) FROM menu_item WHERE Availability_Status = 'available')               AS available_items,
        (SELECT COUNT(*) FROM orders WHERE DATE(Order_DateTime) = CURDATE())                   AS today_orders,
        (SELECT COALESCE(SUM(Total_Amount),0) FROM orders
         WHERE DATE(Order_DateTime) = CURDATE() AND Order_Status != 'cancelled')               AS today_revenue,
        (SELECT COUNT(*) FROM orders WHERE Payment_Status = 'unpaid'
         AND Order_Status NOT IN ('cancelled'))                                                 AS unpaid_orders,
        (SELECT COUNT(*) FROM inventory_item
         WHERE Current_Stock <= Reorder_Level AND Inventory_Status = 'active')                 AS low_stock_alerts,
        (SELECT COUNT(*) FROM orders WHERE Order_Status = 'pending')                           AS pending_orders,
        (SELECT COUNT(*) FROM employee WHERE Employee_Status = 'active')                       AS active_employees
    `);

        const [dailySales] = await db.query(`
      SELECT DATE(Order_DateTime) AS date, COUNT(Order_ID) AS orders, SUM(Total_Amount) AS revenue
      FROM orders
      WHERE Order_Status != 'cancelled' AND Order_DateTime >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY DATE(Order_DateTime) ORDER BY date ASC
    `);

        const [topItems] = await db.query(`
      SELECT mi.Item_Name, SUM(oi.Quantity) AS qty_sold
      FROM order_item oi
      JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
      JOIN orders o ON oi.Order_ID = o.Order_ID
      WHERE o.Order_Status != 'cancelled'
      GROUP BY mi.Menu_Item_ID, mi.Item_Name
      ORDER BY qty_sold DESC LIMIT 5
    `);

        const [orderStatus] = await db.query(`
      SELECT Order_Status AS status, COUNT(*) AS count FROM orders GROUP BY Order_Status
    `);

        const [paymentMethods] = await db.query(`
      SELECT Payment_Method AS method, COUNT(*) AS count, SUM(Amount) AS total
      FROM payment WHERE Payment_Status = 'completed' GROUP BY Payment_Method
    `);

        const [recentOrders] = await db.query(`
      SELECT o.Order_ID, c.Full_Name AS customer, o.Total_Amount,
             o.Order_Status, o.Payment_Status, o.Order_DateTime
      FROM orders o
      JOIN customer c ON o.Customer_ID = c.Customer_ID
      ORDER BY o.Order_DateTime DESC LIMIT 8
    `);

        res.json({ stats, dailySales, topItems, orderStatus, paymentMethods, recentOrders });
    } catch (err) {
        console.error('Dashboard error:', err.message);
        res.status(500).json({ error: 'Failed to load dashboard data' });
    }
});

module.exports = router;
