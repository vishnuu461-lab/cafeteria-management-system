const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/inventory
router.get('/', async (req, res) => {
    try {
        const { search, low_stock, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

        if (search) { where += ' AND (ii.Item_Name LIKE ? OR ii.Item_Code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (low_stock === 'true') { where += ' AND ii.Current_Stock <= ii.Reorder_Level'; }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM inventory_item ii ${where}`, params);

        const [rows] = await db.query(`
      SELECT ii.*, s.Supplier_Name, s.Phone AS Supplier_Phone,
             (ii.Current_Stock <= ii.Reorder_Level) AS is_low_stock
      FROM inventory_item ii
      LEFT JOIN supplier s ON ii.Supplier_ID = s.Supplier_ID
      ${where}
      ORDER BY is_low_stock DESC, ii.Item_Name ASC
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({ data: rows, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// POST /api/inventory
router.post('/', async (req, res) => {
    try {
        const { Supplier_ID, Item_Code, Item_Name, Unit, Current_Stock, Reorder_Level, Unit_Cost } = req.body;
        if (!Item_Code || !Item_Name || !Unit_Cost) return res.status(400).json({ error: 'Item_Code, Item_Name, Unit_Cost required' });

        const [result] = await db.query(
            'INSERT INTO inventory_item (Supplier_ID, Item_Code, Item_Name, Unit, Current_Stock, Reorder_Level, Unit_Cost) VALUES (?,?,?,?,?,?,?)',
            [Supplier_ID || null, Item_Code, Item_Name, Unit || 'kg', Current_Stock || 0, Reorder_Level || 0, Unit_Cost]
        );
        res.status(201).json({ message: 'Inventory item created', Inventory_Item_ID: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Item_Code already exists' });
        res.status(500).json({ error: 'Failed to create inventory item' });
    }
});

// PUT /api/inventory/:id
router.put('/:id', async (req, res) => {
    try {
        const { Supplier_ID, Item_Code, Item_Name, Unit, Reorder_Level, Unit_Cost, Inventory_Status } = req.body;
        await db.query(
            'UPDATE inventory_item SET Supplier_ID=?, Item_Code=?, Item_Name=?, Unit=?, Reorder_Level=?, Unit_Cost=?, Inventory_Status=? WHERE Inventory_Item_ID=?',
            [Supplier_ID || null, Item_Code, Item_Name, Unit, Reorder_Level || 0, Unit_Cost, Inventory_Status || 'active', req.params.id]
        );
        res.json({ message: 'Inventory item updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
});

// POST /api/inventory/stock-transaction  — triggers trg_after_stock_txn_insert
router.post('/stock-transaction', async (req, res) => {
    try {
        const { Inventory_Item_ID, Employee_ID, Supplier_ID, Txn_Type, Quantity, Unit_Cost, Remarks } = req.body;
        if (!Inventory_Item_ID || !Employee_ID || !Quantity) return res.status(400).json({ error: 'Inventory_Item_ID, Employee_ID, Quantity required' });

        await db.query(
            'INSERT INTO stock_transaction (Inventory_Item_ID, Employee_ID, Supplier_ID, Txn_Type, Quantity, Unit_Cost, Remarks) VALUES (?,?,?,?,?,?,?)',
            [Inventory_Item_ID, Employee_ID, Supplier_ID || null, Txn_Type || 'purchase', Quantity, Unit_Cost || null, Remarks || null]
        );
        res.status(201).json({ message: 'Stock transaction recorded — trigger updated stock level' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to record stock transaction' });
    }
});

// GET /api/inventory/suppliers/all
router.get('/suppliers/all', async (req, res) => {
    try {
        const [rows] = await db.query("SELECT * FROM supplier WHERE Supplier_Status = 'active' ORDER BY Supplier_Name");
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
});

// POST /api/inventory/suppliers
router.post('/suppliers', async (req, res) => {
    try {
        const { Supplier_Name, Phone, Email, City } = req.body;
        const [result] = await db.query(
            'INSERT INTO supplier (Supplier_Name, Phone, Email, City) VALUES (?,?,?,?)',
            [Supplier_Name, Phone, Email || null, City || null]
        );
        res.status(201).json({ message: 'Supplier created', Supplier_ID: result.insertId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create supplier' });
    }
});

module.exports = router;
