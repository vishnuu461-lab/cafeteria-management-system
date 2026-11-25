const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── Use explicit DB name from env (never rely on DATABASE() context) ──
const DB_NAME = process.env.DB_NAME || 'defaultdb';

// ── Create audit_log table on startup ────────────────────────────
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS \`${DB_NAME}\`.audit_log (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                action      VARCHAR(100) NOT NULL,
                table_name  VARCHAR(100),
                details     TEXT,
                admin_user  VARCHAR(150),
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('✅ audit_log table ready');
    } catch (e) {
        console.error('audit_log table creation error:', e.message);
    }
})();

// ── Helper: log an audit entry ────────────────────────────────────
async function logAudit(action, tableName, details, adminUser) {
    try {
        await db.query(
            `INSERT INTO \`${DB_NAME}\`.audit_log (action, table_name, details, admin_user) VALUES (?, ?, ?, ?)`,
            [action, tableName || null, details || null, adminUser || 'admin']
        );
    } catch (e) {
        console.error('audit_log insert error:', e.message);
    }
}

// ── SQL safety: only allow SELECT statements ──────────────────────
function isSafeSQL(sql) {
    const cleaned = sql.trim()
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/--[^\n]*/g, '')
        .trim()
        .toUpperCase();
    const dangerous = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|RENAME|REPLACE|GRANT|REVOKE|CALL|EXEC|EXECUTE)\b/;
    if (dangerous.test(cleaned)) return false;
    if (!cleaned.startsWith('SELECT') &&
        !cleaned.startsWith('SHOW') &&
        !cleaned.startsWith('DESCRIBE') &&
        !cleaned.startsWith('EXPLAIN')) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dbmanager/tables — list all tables with metadata
// ═══════════════════════════════════════════════════════════════
router.get('/tables', async (req, res) => {
    try {
        // 1. Get all tables in this specific database
        const [tables] = await db.query(`
            SELECT TABLE_NAME AS table_name
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
            ORDER BY TABLE_NAME
        `, [DB_NAME]);

        if (!tables.length) {
            return res.json({ tables: [] });
        }

        // 2. Get column counts per table in one query
        const [colCounts] = await db.query(`
            SELECT TABLE_NAME AS table_name, COUNT(*) AS column_count
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            GROUP BY TABLE_NAME
        `, [DB_NAME]);
        const colCountMap = {};
        colCounts.forEach(r => { colCountMap[r.table_name] = r.column_count; });

        // 3. Get PK columns per table
        const [pks] = await db.query(`
            SELECT TABLE_NAME AS table_name, COLUMN_NAME AS pk_column
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND CONSTRAINT_NAME = 'PRIMARY'
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `, [DB_NAME]);
        const pkMap = {};
        pks.forEach(r => {
            if (!pkMap[r.table_name]) pkMap[r.table_name] = [];
            pkMap[r.table_name].push(r.pk_column);
        });

        // 4. Get FK counts per table
        const [fks] = await db.query(`
            SELECT TABLE_NAME AS table_name, COUNT(*) AS fk_count
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY TABLE_NAME
        `, [DB_NAME]);
        const fkMap = {};
        fks.forEach(r => { fkMap[r.table_name] = r.fk_count; });

        // 5. Get accurate row counts using a SINGLE connection in sequence
        //    (avoids exhausting the pool with 35 parallel queries)
        const tableNames = tables.map(t => t.table_name);
        const rowCounts = {};

        for (const tn of tableNames) {
            try {
                const [[rc]] = await db.query(
                    `SELECT COUNT(*) AS cnt FROM \`${DB_NAME}\`.\`${tn}\``
                );
                rowCounts[tn] = Number(rc.cnt);
            } catch (e) {
                console.error(`Row count failed for ${tn}:`, e.message);
                rowCounts[tn] = -1; // -1 signals "count unavailable"
            }
        }

        const result = tableNames.map(tn => ({
            name: tn,
            rows: rowCounts[tn] ?? 0,
            columns: colCountMap[tn] || 0,
            pk: pkMap[tn] || [],
            fk_count: fkMap[tn] || 0,
        }));

        await logAudit('TABLE_LIST_VIEW', null, `Viewed ${result.length} tables`, 'admin');
        res.json({ tables: result });
    } catch (err) {
        console.error('dbmanager/tables error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/dbmanager/tables/:name — paginated records of a table
// ═══════════════════════════════════════════════════════════════
router.get('/tables/:name', async (req, res) => {
    const { name } = req.params;

    // Strict validation — only allow alphanumeric and underscore
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    const page  = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search  = req.query.search || '';
    const sortCol = req.query.sort || '';
    const sortDir = req.query.dir === 'desc' ? 'DESC' : 'ASC';

    try {
        // 1. Verify table exists in this specific database
        const [[tableCheck]] = await db.query(
            `SELECT COUNT(*) AS cnt
             FROM INFORMATION_SCHEMA.TABLES
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
            [DB_NAME, name]
        );
        if (!tableCheck.cnt) {
            return res.status(404).json({ error: `Table '${name}' not found in database '${DB_NAME}'` });
        }

        // 2. Get columns (always use explicit schema)
        const [cols] = await db.query(
            `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
             FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION`,
            [DB_NAME, name]
        );

        const columnNames = cols.map(c => c.COLUMN_NAME);

        // 3. Build WHERE clause for search
        let where = '';
        const params = [];
        if (search && columnNames.length > 0) {
            const conditions = columnNames.map(col => `CAST(\`${col}\` AS CHAR) LIKE ?`);
            where = `WHERE ${conditions.join(' OR ')}`;
            columnNames.forEach(() => params.push(`%${search}%`));
        }

        // 4. Sort clause (validate column name is in this table)
        let orderClause = '';
        if (sortCol && columnNames.includes(sortCol)) {
            orderClause = `ORDER BY \`${sortCol}\` ${sortDir}`;
        }

        // 5. Count — always qualify with explicit schema.table
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM \`${DB_NAME}\`.\`${name}\` ${where}`,
            params
        );

        // 6. Data — always qualify with explicit schema.table
        const [rows] = await db.query(
            `SELECT * FROM \`${DB_NAME}\`.\`${name}\` ${where} ${orderClause} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        await logAudit('TABLE_VIEW', name, `Page ${page}, search="${search}"`, 'admin');
        res.json({
            table: name,
            columns: cols,
            rows,
            total: Number(total),
            page,
            limit,
            pages: Math.ceil(Number(total) / limit),
        });
    } catch (err) {
        console.error(`dbmanager/table [${name}] error:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/dbmanager/query — execute a read-only SQL query
// ═══════════════════════════════════════════════════════════════
router.post('/query', async (req, res) => {
    const { sql } = req.body;
    if (!sql || !sql.trim()) return res.status(400).json({ error: 'SQL query is required' });

    if (!isSafeSQL(sql)) {
        return res.status(403).json({
            error: 'Only SELECT, SHOW, DESCRIBE and EXPLAIN statements are allowed. Write operations are blocked for safety.'
        });
    }

    const start = Date.now();
    try {
        const [rows, fields] = await db.query(sql);
        const ms = Date.now() - start;
        const columns = fields ? fields.map(f => f.name) : [];

        await logAudit('QUERY_RUN', null, sql.substring(0, 500), 'admin');
        res.json({
            rows: Array.isArray(rows) ? rows : [rows],
            columns,
            row_count: Array.isArray(rows) ? rows.length : 1,
            execution_ms: ms,
        });
    } catch (err) {
        const ms = Date.now() - start;
        console.error('dbmanager/query error:', err.message);
        res.status(400).json({ error: err.message, execution_ms: ms });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/dbmanager/schema — full DB schema
// ═══════════════════════════════════════════════════════════════
router.get('/schema', async (req, res) => {
    try {
        // All columns in this database
        const [columns] = await db.query(`
            SELECT
                c.TABLE_NAME,
                c.COLUMN_NAME,
                c.DATA_TYPE,
                c.COLUMN_TYPE,
                c.IS_NULLABLE,
                c.COLUMN_KEY,
                c.COLUMN_DEFAULT,
                c.EXTRA,
                c.ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.COLUMNS c
            JOIN INFORMATION_SCHEMA.TABLES t
                ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
            WHERE c.TABLE_SCHEMA = ? AND t.TABLE_TYPE = 'BASE TABLE'
            ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        `, [DB_NAME]);

        // All foreign keys in this database
        const [foreignKeys] = await db.query(`
            SELECT
                kcu.TABLE_NAME,
                kcu.COLUMN_NAME,
                kcu.REFERENCED_TABLE_NAME,
                kcu.REFERENCED_COLUMN_NAME,
                kcu.CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
               AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
            WHERE kcu.TABLE_SCHEMA = ? AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME
        `, [DB_NAME]);

        // Group by table
        const schema = {};
        columns.forEach(col => {
            if (!schema[col.TABLE_NAME]) {
                schema[col.TABLE_NAME] = { name: col.TABLE_NAME, columns: [], foreign_keys: [] };
            }
            schema[col.TABLE_NAME].columns.push({
                name: col.COLUMN_NAME,
                type: col.COLUMN_TYPE,
                data_type: col.DATA_TYPE,
                nullable: col.IS_NULLABLE === 'YES',
                key: col.COLUMN_KEY,
                default: col.COLUMN_DEFAULT,
                extra: col.EXTRA,
            });
        });

        foreignKeys.forEach(fk => {
            if (schema[fk.TABLE_NAME]) {
                schema[fk.TABLE_NAME].foreign_keys.push({
                    column: fk.COLUMN_NAME,
                    references_table: fk.REFERENCED_TABLE_NAME,
                    references_column: fk.REFERENCED_COLUMN_NAME,
                    constraint: fk.CONSTRAINT_NAME,
                });
            }
        });

        const tables = Object.values(schema);
        await logAudit('SCHEMA_VIEW', null, `Viewed schema: ${tables.length} tables`, 'admin');
        res.json({
            tables,
            total_tables: tables.length,
            total_columns: columns.length,
            total_fks: foreignKeys.length,
        });
    } catch (err) {
        console.error('dbmanager/schema error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/dbmanager/audit — list audit log entries
// ═══════════════════════════════════════════════════════════════
router.get('/audit', async (req, res) => {
    const page   = Math.max(1, parseInt(req.query.page) || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 30);
    const offset = (page - 1) * limit;
    const search      = req.query.search || '';
    const filterAction = req.query.action || '';
    const filterTable  = req.query.table || '';
    const dateFrom    = req.query.from || '';
    const dateTo      = req.query.to || '';

    try {
        const conditions = [];
        const params = [];

        if (search) {
            conditions.push('(action LIKE ? OR table_name LIKE ? OR admin_user LIKE ? OR details LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (filterAction) { conditions.push('action = ?'); params.push(filterAction); }
        if (filterTable)  { conditions.push('table_name = ?'); params.push(filterTable); }
        if (dateFrom)     { conditions.push('DATE(created_at) >= ?'); params.push(dateFrom); }
        if (dateTo)       { conditions.push('DATE(created_at) <= ?'); params.push(dateTo); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const tbl = `\`${DB_NAME}\`.audit_log`;

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM ${tbl} ${where}`, params);
        const [rows] = await db.query(
            `SELECT * FROM ${tbl} ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        const [actions]    = await db.query(`SELECT DISTINCT action FROM ${tbl} ORDER BY action`);
        const [tableNames] = await db.query(`SELECT DISTINCT table_name FROM ${tbl} WHERE table_name IS NOT NULL ORDER BY table_name`);

        res.json({
            rows,
            total: Number(total),
            page,
            limit,
            pages: Math.ceil(Number(total) / limit),
            actions: actions.map(a => a.action),
            table_names: tableNames.map(t => t.table_name),
        });
    } catch (err) {
        console.error('dbmanager/audit error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// POST /api/dbmanager/audit — insert audit log entry
// ═══════════════════════════════════════════════════════════════
router.post('/audit', async (req, res) => {
    const { action, table_name, details, admin_user } = req.body;
    if (!action) return res.status(400).json({ error: 'action is required' });
    await logAudit(action, table_name, details, admin_user || 'admin');
    res.json({ ok: true });
});

module.exports = router;
