const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /api/menu
router.get('/', async (req, res) => {
    try {
        const { search, category, status, page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;
        let where = 'WHERE 1=1';
        const params = [];

        if (search) { where += ' AND (mi.Item_Name LIKE ? OR mi.Item_Code LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
        if (category) { where += ' AND mi.Category_ID = ?'; params.push(category); }
        if (status) { where += ' AND mi.Availability_Status = ?'; params.push(status); }

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM menu_item mi ${where}`, params);

        const [rows] = await db.query(`
      SELECT mi.*, cat.Category_Name, COUNT(DISTINCT ri.Inventory_Item_ID) AS ingredient_count
      FROM menu_item mi
      JOIN category cat ON mi.Category_ID = cat.Category_ID
      LEFT JOIN recipe_item ri ON mi.Menu_Item_ID = ri.Menu_Item_ID
      ${where}
      GROUP BY mi.Menu_Item_ID
      ORDER BY cat.Category_Name, mi.Item_Name
      LIMIT ? OFFSET ?
    `, [...params, parseInt(limit), parseInt(offset)]);

        res.json({ data: rows, total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch menu items' });
    }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
    try {
        const [[item]] = await db.query(`
      SELECT mi.*, cat.Category_Name FROM menu_item mi
      JOIN category cat ON mi.Category_ID = cat.Category_ID
      WHERE mi.Menu_Item_ID = ?
    `, [req.params.id]);

        if (!item) return res.status(404).json({ error: 'Menu item not found' });

        const [recipe] = await db.query(`
      SELECT ri.*, inv.Item_Name AS Ingredient_Name, inv.Unit, inv.Current_Stock
      FROM recipe_item ri
      JOIN inventory_item inv ON ri.Inventory_Item_ID = inv.Inventory_Item_ID
      WHERE ri.Menu_Item_ID = ?
    `, [req.params.id]);

        res.json({ item, recipe });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch menu item' });
    }
});

// POST /api/menu
router.post('/', async (req, res) => {
    try {
        const { Category_ID, Item_Code, Item_Name, Description, Price, Prep_Time_Min, Availability_Status, Tax_Rate } = req.body;
        if (!Category_ID || !Item_Code || !Item_Name || !Price)
            return res.status(400).json({ error: 'Category_ID, Item_Code, Item_Name, Price required' });

        const [result] = await db.query(
            'INSERT INTO menu_item (Category_ID, Item_Code, Item_Name, Description, Price, Prep_Time_Min, Availability_Status, Tax_Rate) VALUES (?,?,?,?,?,?,?,?)',
            [Category_ID, Item_Code, Item_Name, Description || null, Price, Prep_Time_Min || 5, Availability_Status || 'available', Tax_Rate || 5.00]
        );
        res.status(201).json({ message: 'Menu item created', Menu_Item_ID: result.insertId });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Item_Code already exists' });
        res.status(500).json({ error: 'Failed to create menu item' });
    }
});

// PUT /api/menu/:id
router.put('/:id', async (req, res) => {
    try {
        const { Category_ID, Item_Code, Item_Name, Description, Price, Prep_Time_Min, Availability_Status, Tax_Rate } = req.body;
        await db.query(
            'UPDATE menu_item SET Category_ID=?, Item_Code=?, Item_Name=?, Description=?, Price=?, Prep_Time_Min=?, Availability_Status=?, Tax_Rate=? WHERE Menu_Item_ID=?',
            [Category_ID, Item_Code, Item_Name, Description || null, Price, Prep_Time_Min || 5, Availability_Status, Tax_Rate, req.params.id]
        );
        res.json({ message: 'Menu item updated' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update menu item' });
    }
});

// DELETE /api/menu/:id
router.delete('/:id', async (req, res) => {
    try {
        const [[check]] = await db.query('SELECT COUNT(*) AS cnt FROM order_item WHERE Menu_Item_ID=?', [req.params.id]);
        if (check.cnt > 0) {
            await db.query("UPDATE menu_item SET Availability_Status='unavailable' WHERE Menu_Item_ID=?", [req.params.id]);
            return res.json({ message: 'Item marked unavailable (has order history)' });
        }
        await db.query('DELETE FROM menu_item WHERE Menu_Item_ID=?', [req.params.id]);
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete menu item' });
    }
});

module.exports = router;
