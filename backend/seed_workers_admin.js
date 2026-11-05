// seed_workers_admin.js — Creates workers table, admins table, seeds accounts + 40 inventory items
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const cfg = {
    host: process.env.DB_HOST,
    port: +process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function run() {
    const db = await mysql.createConnection(cfg);
    console.log('✅ Connected\n');

    // ── 1. Create WORKERS table ───────────────────────────────────
    await db.query(`CREATE TABLE IF NOT EXISTS workers (
    Worker_ID   INT NOT NULL AUTO_INCREMENT,
    Name        VARCHAR(150) NOT NULL,
    Email       VARCHAR(150) NOT NULL UNIQUE,
    Password    VARCHAR(255) NOT NULL,
    Role        ENUM('counter','inventory') NOT NULL DEFAULT 'counter',
    Status      ENUM('active','inactive') NOT NULL DEFAULT 'active',
    Created_At  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Worker_ID)
  )`);
    console.log('✅ workers table ready');

    // ── 2. Create ADMINS table ────────────────────────────────────
    await db.query(`CREATE TABLE IF NOT EXISTS admins (
    Admin_ID    INT NOT NULL AUTO_INCREMENT,
    Name        VARCHAR(150) NOT NULL,
    Email       VARCHAR(150) NOT NULL UNIQUE,
    Password    VARCHAR(255) NOT NULL,
    Created_At  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (Admin_ID)
  )`);
    console.log('✅ admins table ready');

    // ── 3. Seed workers ───────────────────────────────────────────
    const workerPw = await bcrypt.hash('123456', 10);
    await db.query('DELETE FROM workers WHERE Email IN (?,?,?)',
        ['worker1@gmail.com', 'worker2@gmail.com', 'inventory@gmail.com']);
    await db.query(`INSERT INTO workers (Name,Email,Password,Role) VALUES
    ('Counter Worker 1','worker1@gmail.com',?,'counter'),
    ('Counter Worker 2','worker2@gmail.com',?,'counter'),
    ('Inventory Manager','inventory@gmail.com',?,'inventory')`,
        [workerPw, workerPw, workerPw]
    );
    console.log('✅ 3 workers seeded');

    // ── 4. Seed admin ─────────────────────────────────────────────
    const adminPw = await bcrypt.hash('123456', 10);
    await db.query('DELETE FROM admins WHERE Email = ?', ['vishnu461@gmail.com']);
    await db.query('INSERT INTO admins (Name,Email,Password) VALUES (?,?,?)',
        ['Vishnu (Admin)', 'vishnu461@gmail.com', adminPw]);
    console.log('✅ Admin seeded');

    // ── 5. Seed 40 inventory items ────────────────────────────────
    // Get a supplier
    const [[sup]] = await db.query('SELECT Supplier_ID FROM supplier LIMIT 1');
    const sid = sup?.Supplier_ID || 1;

    // Clear existing and re-insert all 40
    await db.query('DELETE FROM recipe_item');  // clear FK first
    await db.query('DELETE FROM inventory_item');

    const items = [
        // [Item_Code, Item_Name, Unit, Current_Stock, Reorder_Level, Unit_Cost, Status]
        ['INV001', 'Idli Batter', 'kg', 0.000, 5.000, 40.00, 'inactive'],  // OUT OF STOCK
        ['INV002', 'Dosa Batter', 'kg', 0.000, 5.000, 35.00, 'inactive'],  // OUT OF STOCK
        ['INV003', 'Rice (Basmati)', 'kg', 0.000, 20.000, 75.00, 'inactive'],  // OUT OF STOCK
        ['INV004', 'Wheat Flour', 'kg', 25.000, 8.000, 35.00, 'active'],
        ['INV005', 'Cooking Oil', 'litre', 20.000, 5.000, 130.00, 'active'],
        ['INV006', 'Salt', 'kg', 10.000, 2.000, 20.00, 'active'],
        ['INV007', 'Sugar', 'kg', 15.000, 4.000, 45.00, 'active'],
        ['INV008', 'Red Chilli Powder', 'kg', 3.000, 0.500, 180.00, 'active'],
        ['INV009', 'Turmeric Powder', 'kg', 2.000, 0.500, 150.00, 'active'],
        ['INV010', 'Tea Powder', 'kg', 4.000, 1.000, 250.00, 'active'],
        ['INV011', 'Coffee Powder', 'kg', 3.000, 0.500, 400.00, 'active'],
        ['INV012', 'Milk', 'litre', 50.000, 15.000, 50.00, 'active'],
        ['INV013', 'Curd', 'kg', 10.000, 3.000, 60.00, 'active'],
        ['INV014', 'Onions', 'kg', 30.000, 8.000, 18.00, 'active'],
        ['INV015', 'Tomatoes', 'kg', 25.000, 8.000, 25.00, 'active'],
        ['INV016', 'Potatoes', 'kg', 40.000, 10.000, 22.00, 'active'],
        ['INV017', 'Green Chillies', 'kg', 2.000, 0.500, 60.00, 'active'],
        ['INV018', 'Ginger', 'kg', 3.000, 0.500, 100.00, 'active'],
        ['INV019', 'Garlic', 'kg', 3.000, 0.500, 80.00, 'active'],
        ['INV020', 'Coriander Leaves', 'kg', 2.000, 0.500, 80.00, 'active'],
        ['INV021', 'Curry Leaves', 'kg', 1.000, 0.200, 60.00, 'active'],
        ['INV022', 'Mustard Seeds', 'kg', 5.000, 1.000, 80.00, 'active'],
        ['INV023', 'Urad Dal', 'kg', 30.000, 10.000, 90.00, 'active'],
        ['INV024', 'Chana Dal', 'kg', 25.000, 8.000, 85.00, 'active'],
        ['INV025', 'Toor Dal', 'kg', 20.000, 6.000, 95.00, 'active'],
        ['INV026', 'Coconut', 'piece', 30.000, 5.000, 25.00, 'active'],
        ['INV027', 'Bread', 'loaf', 8.000, 2.000, 40.00, 'active'],
        ['INV028', 'Butter', 'kg', 3.000, 1.000, 450.00, 'active'],
        ['INV029', 'Cheese', 'kg', 2.000, 0.500, 600.00, 'active'],
        ['INV030', 'Sambar Powder', 'kg', 3.000, 0.500, 160.00, 'active'],
        ['INV031', 'Tamarind', 'kg', 2.000, 0.500, 90.00, 'active'],
        ['INV032', 'Ghee', 'kg', 3.000, 1.000, 550.00, 'active'],
        ['INV033', 'Cardamom', 'kg', 0.500, 0.100, 1200.00, 'active'],
        ['INV034', 'Black Pepper', 'kg', 1.000, 0.200, 700.00, 'active'],
        ['INV035', 'Lemon', 'piece', 50.000, 10.000, 5.00, 'active'],
        ['INV036', 'Maida', 'kg', 20.000, 5.000, 40.00, 'active'],
        ['INV037', 'Besan (Gram Flour)', 'kg', 10.000, 3.000, 55.00, 'active'],
        ['INV038', 'Rava (Semolina)', 'kg', 15.000, 4.000, 45.00, 'active'],
        ['INV039', 'Paneer', 'kg', 5.000, 2.000, 280.00, 'active'],
        ['INV040', 'Mixed Vegetables', 'kg', 20.000, 5.000, 40.00, 'active'],
    ];

    for (const [code, name, unit, stock, reorder, cost, status] of items) {
        await db.query(
            `INSERT INTO inventory_item (Supplier_ID,Item_Code,Item_Name,Unit,Current_Stock,Reorder_Level,Unit_Cost,Inventory_Status) VALUES (?,?,?,?,?,?,?,?)`,
            [sid, code, name, unit, stock, reorder, cost, status]
        );
    }
    console.log('✅ 40 inventory items seeded (3 out of stock)');

    // ── 6. Link inventory to menu items via recipe_item ───────────
    // Get all menu item IDs by item_code
    const [menuItems] = await db.query('SELECT Menu_Item_ID, Item_Code FROM menu_item');
    const menuMap = {};
    menuItems.forEach(m => menuMap[m.Item_Code] = m.Menu_Item_ID);

    // Get inventory IDs by item_code
    const [invItems] = await db.query('SELECT Inventory_Item_ID, Item_Code FROM inventory_item');
    const invMap = {};
    invItems.forEach(i => invMap[i.Item_Code] = i.Inventory_Item_ID);

    // recipe_item links: [menu_code, inv_code, qty_required]
    const links = [
        ['SI001', 'INV001', 0.200], // Masala Dosa ← Dosa Batter
        ['SI001', 'INV016', 0.050], // Masala Dosa ← Potatoes
        ['SI002', 'INV001', 0.150], // Idli Sambar ← Idli Batter (using dosa batter as common)
        ['SI003', 'INV023', 0.100], // Medu Vada ← Urad Dal
        ['SI004', 'INV001', 0.200], // Uttapam ← Idli Batter
        ['NI001', 'INV003', 0.150], // Dal Makhani ← Rice
        ['NI001', 'INV024', 0.100], // Dal Makhani ← Chana Dal
        ['NI002', 'INV039', 0.200], // Paneer Butter Masala ← Paneer
        ['NI003', 'INV024', 0.200], // Chole Bhature ← Chana Dal
        ['NI003', 'INV036', 0.150], // Chole Bhature ← Maida
        ['NI004', 'INV003', 0.200], // Vegetable Biryani ← Rice
        ['NI004', 'INV040', 0.150], // Vegetable Biryani ← Vegetables
        ['BV001', 'INV010', 0.010], // Masala Chai ← Tea Powder
        ['BV001', 'INV012', 0.100], // Masala Chai ← Milk
        ['BV002', 'INV011', 0.015], // Filter Coffee ← Coffee Powder
        ['BV002', 'INV012', 0.100], // Filter Coffee ← Milk
        ['BV004', 'INV013', 0.200], // Lassi ← Curd
        ['SN001', 'INV016', 0.100], // Samosa ← Potatoes
        ['SN001', 'INV036', 0.050], // Samosa ← Maida
        ['SN002', 'INV016', 0.150], // Aloo Tikki ← Potatoes
        ['SN003', 'INV036', 0.100], // Maggi ← Maida (noodles proxy)
        ['DS001', 'INV012', 0.100], // Gulab Jamun ← Milk
        ['DS002', 'INV003', 0.100], // Kheer ← Rice
        ['CM001', 'INV003', 0.200], // Student Combo ← Rice
        ['CM001', 'INV040', 0.100], // Student Combo ← Vegetables
        ['CM002', 'INV001', 0.150], // Breakfast Combo ← Idli Batter
        ['CM002', 'INV023', 0.100], // Breakfast Combo ← Urad Dal
    ];

    let linked = 0;
    for (const [mc, ic, qty] of links) {
        const mid = menuMap[mc];
        const iid = invMap[ic];
        if (mid && iid) {
            await db.query(
                'INSERT INTO recipe_item (Menu_Item_ID, Inventory_Item_ID, Quantity_Required) VALUES (?,?,?) ON DUPLICATE KEY UPDATE Quantity_Required=VALUES(Quantity_Required)',
                [mid, iid, qty]
            );
            linked++;
        }
    }
    console.log(`✅ ${linked} recipe_item links created`);

    // ── 7. Update menu_item availability based on inventory ────────
    // Items that use out-of-stock ingredients → mark unavailable
    const outOfStockInvCodes = ['INV001', 'INV002', 'INV003'];
    for (const invCode of outOfStockInvCodes) {
        const iid = invMap[invCode];
        if (!iid) continue;
        await db.query(`
      UPDATE menu_item mi
      JOIN recipe_item ri ON mi.Menu_Item_ID = ri.Menu_Item_ID
      SET mi.Availability_Status = 'unavailable'
      WHERE ri.Inventory_Item_ID = ?
    `, [iid]);
    }
    console.log('✅ Menu availability updated based on inventory');

    await db.end();
    console.log('\n🎉 All seeding complete!');
    console.log('   Workers: worker1@gmail.com, worker2@gmail.com, inventory@gmail.com (pw: 123456)');
    console.log('   Admin:   vishnu461@gmail.com (pw: 123456)');
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
