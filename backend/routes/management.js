const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ─── CATEGORIES ───────────────────────────────────────────────
router.get('/categories', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT c.*, COUNT(mi.Menu_Item_ID) AS item_count
      FROM category c
      LEFT JOIN menu_item mi ON c.Category_ID = mi.Category_ID
      GROUP BY c.Category_ID ORDER BY c.Category_Name
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch categories' }); }
});

router.post('/categories', async (req, res) => {
    try {
        const { Category_Name, Category_Status } = req.body;
        if (!Category_Name) return res.status(400).json({ error: 'Category_Name required' });
        const [r] = await db.query('INSERT INTO category (Category_Name, Category_Status) VALUES (?,?)', [Category_Name, Category_Status || 'active']);
        res.status(201).json({ message: 'Category created', Category_ID: r.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Category already exists' });
        res.status(500).json({ error: 'Failed to create category' });
    }
});

router.put('/categories/:id', async (req, res) => {
    try {
        const { Category_Name, Category_Status } = req.body;
        await db.query('UPDATE category SET Category_Name=?, Category_Status=? WHERE Category_ID=?', [Category_Name, Category_Status, req.params.id]);
        res.json({ message: 'Category updated' });
    } catch (err) { res.status(500).json({ error: 'Failed to update category' }); }
});

router.delete('/categories/:id', async (req, res) => {
    try {
        const [[check]] = await db.query('SELECT COUNT(*) AS cnt FROM menu_item WHERE Category_ID=?', [req.params.id]);
        if (check.cnt > 0) return res.status(409).json({ error: 'Category has menu items. Remove items first.' });
        await db.query('DELETE FROM category WHERE Category_ID=?', [req.params.id]);
        res.json({ message: 'Category deleted' });
    } catch (err) { res.status(500).json({ error: 'Failed to delete category' }); }
});

// ─── CAFETERIAS ────────────────────────────────────────────────
router.get('/cafeterias', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT c.*,
             COUNT(DISTINCT co.Counter_ID) AS counter_count,
             COUNT(DISTINCT e.Employee_ID) AS employee_count
      FROM cafeteria c
      LEFT JOIN counter co ON c.Cafeteria_ID = co.Cafeteria_ID
      LEFT JOIN employee e ON c.Cafeteria_ID = e.Cafeteria_ID AND e.Employee_Status = 'active'
      GROUP BY c.Cafeteria_ID ORDER BY c.Cafeteria_Name
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch cafeterias' }); }
});

router.post('/cafeterias', async (req, res) => {
    try {
        const { Cafeteria_Name, Building_Name, Opening_Time, Closing_Time, Cafeteria_Status } = req.body;
        if (!Cafeteria_Name || !Building_Name) return res.status(400).json({ error: 'Cafeteria_Name and Building_Name required' });
        const [r] = await db.query(
            'INSERT INTO cafeteria (Cafeteria_Name, Building_Name, Opening_Time, Closing_Time, Cafeteria_Status) VALUES (?,?,?,?,?)',
            [Cafeteria_Name, Building_Name, Opening_Time || '08:00', Closing_Time || '20:00', Cafeteria_Status || 'open']
        );
        res.status(201).json({ message: 'Cafeteria created', Cafeteria_ID: r.insertId });
    } catch (err) { res.status(500).json({ error: 'Failed to create cafeteria' }); }
});

router.put('/cafeterias/:id', async (req, res) => {
    try {
        const { Cafeteria_Name, Building_Name, Opening_Time, Closing_Time, Cafeteria_Status } = req.body;
        await db.query(
            'UPDATE cafeteria SET Cafeteria_Name=?, Building_Name=?, Opening_Time=?, Closing_Time=?, Cafeteria_Status=? WHERE Cafeteria_ID=?',
            [Cafeteria_Name, Building_Name, Opening_Time, Closing_Time, Cafeteria_Status, req.params.id]
        );
        res.json({ message: 'Cafeteria updated' });
    } catch (err) { res.status(500).json({ error: 'Failed to update cafeteria' }); }
});

// ─── COUNTERS ──────────────────────────────────────────────────
router.get('/counters', async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT co.*, c.Cafeteria_Name FROM counter co
      JOIN cafeteria c ON co.Cafeteria_ID = c.Cafeteria_ID
      ORDER BY c.Cafeteria_Name, co.Counter_Name
    `);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch counters' }); }
});

router.post('/counters', async (req, res) => {
    try {
        const { Cafeteria_ID, Counter_Name, Counter_Type, Counter_Status } = req.body;
        if (!Cafeteria_ID || !Counter_Name) return res.status(400).json({ error: 'Cafeteria_ID and Counter_Name required' });
        const [r] = await db.query(
            'INSERT INTO counter (Cafeteria_ID, Counter_Name, Counter_Type, Counter_Status) VALUES (?,?,?,?)',
            [Cafeteria_ID, Counter_Name, Counter_Type || 'general', Counter_Status || 'open']
        );
        res.status(201).json({ message: 'Counter created', Counter_ID: r.insertId });
    } catch (err) { res.status(500).json({ error: 'Failed to create counter' }); }
});

// ─── EMPLOYEES ─────────────────────────────────────────────────
router.get('/employees', async (req, res) => {
    try {
        const { status, limit } = req.query;
        let where = 'WHERE 1=1';
        const params = [];
        if (status) { where += ' AND e.Employee_Status = ?'; params.push(status); }

        const [rows] = await db.query(`
      SELECT e.*, c.Cafeteria_Name,
             COUNT(o.Order_ID) AS orders_handled
      FROM employee e
      JOIN cafeteria c ON e.Cafeteria_ID = c.Cafeteria_ID
      LEFT JOIN orders o ON e.Employee_ID = o.Employee_ID
      ${where}
      GROUP BY e.Employee_ID
      ORDER BY e.Employee_Name
      ${limit ? 'LIMIT ' + parseInt(limit) : ''}
    `, params);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: 'Failed to fetch employees' }); }
});

router.post('/employees', async (req, res) => {
    try {
        const { Cafeteria_ID, Employee_Name, Role, Phone, Employee_Status } = req.body;
        if (!Cafeteria_ID || !Employee_Name || !Phone) return res.status(400).json({ error: 'Cafeteria_ID, Employee_Name, Phone required' });
        const [r] = await db.query(
            'INSERT INTO employee (Cafeteria_ID, Employee_Name, Role, Phone, Employee_Status) VALUES (?,?,?,?,?)',
            [Cafeteria_ID, Employee_Name, Role || 'cashier', Phone, Employee_Status || 'active']
        );
        res.status(201).json({ message: 'Employee created', Employee_ID: r.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Phone number already exists' });
        res.status(500).json({ error: 'Failed to create employee' });
    }
});

router.put('/employees/:id', async (req, res) => {
    try {
        const { Cafeteria_ID, Employee_Name, Role, Phone, Employee_Status } = req.body;
        await db.query(
            'UPDATE employee SET Cafeteria_ID=?, Employee_Name=?, Role=?, Phone=?, Employee_Status=? WHERE Employee_ID=?',
            [Cafeteria_ID, Employee_Name, Role, Phone, Employee_Status, req.params.id]
        );
        res.json({ message: 'Employee updated' });
    } catch (err) { res.status(500).json({ error: 'Failed to update employee' }); }
});

module.exports = router;
