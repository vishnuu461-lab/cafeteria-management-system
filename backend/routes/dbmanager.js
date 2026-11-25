const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── Create audit_log table on startup ────────────────────────────
(async () => {
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS audit_log (
                id          INT AUTO_INCREMENT PRIMARY KEY,
                action      VARCHAR(100) NOT NULL,
                table_name  VARCHAR(100),
                details     TEXT,
                admin_user  VARCHAR(150),
                created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
    } catch (e) {
        console.error('audit_log table creation error:', e.message);
    }
})();

// ── Helper: log an audit entry ────────────────────────────────────
async function logAudit(action, tableName, details, adminUser) {
    try {
        await db.query(
            'INSERT INTO audit_log (action, table_name, details, admin_user) VALUES (?, ?, ?, ?)',
            [action, tableName || null, details || null, adminUser || 'admin']
        );
    } catch (_) { /* non-critical */ }
}

// ── SQL safety: only allow SELECT statements ──────────────────────
function isSafeSQL(sql) {
    const cleaned = sql.trim().replace(/\/\*[\s\S]*?\*\//g, '').replace(/--[^\n]*/g, '').trim().toUpperCase();
    const dangerous = /\b(DROP|DELETE|UPDATE|INSERT|ALTER|CREATE|TRUNCATE|RENAME|REPLACE|GRANT|REVOKE|CALL|EXEC|EXECUTE)\b/;
    if (dangerous.test(cleaned)) return false;
    if (!cleaned.startsWith('SELECT') && !cleaned.startsWith('SHOW') && !cleaned.startsWith('DESCRIBE') && !cleaned.startsWith('EXPLAIN')) return false;
    return true;
}

// ═══════════════════════════════════════════════════════════════
// GET /api/dbmanager/tables — list all tables with metadata
// ═══════════════════════════════════════════════════════════════
router.get('/tables', async (req, res) => {
    try {
        // Get table list with column info and row counts
        const [tables] = await db.query(`
            SELECT 
                t.TABLE_NAME AS table_name,
                t.TABLE_ROWS AS approx_rows,
                COUNT(c.COLUMN_NAME) AS column_count
            FROM INFORMATION_SCHEMA.TABLES t
            JOIN INFORMATION_SCHEMA.COLUMNS c 
                ON c.TABLE_NAME = t.TABLE_NAME AND c.TABLE_SCHEMA = t.TABLE_SCHEMA
            WHERE t.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
            GROUP BY t.TABLE_NAME, t.TABLE_ROWS
            ORDER BY t.TABLE_NAME
        `);

        // Get PK info
        const [pks] = await db.query(`
            SELECT TABLE_NAME, COLUMN_NAME AS pk_column
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'PRIMARY'
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `);

        // Get FK counts
        const [fks] = await db.query(`
            SELECT TABLE_NAME, COUNT(*) AS fk_count
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY TABLE_NAME
        `);

        const pkMap = {};
        pks.forEach(r => {
            if (!pkMap[r.table_name]) pkMap[r.table_name] = [];
            pkMap[r.table_name].push(r.pk_column);
        });
        const fkMap = {};
        fks.forEach(r => { fkMap[r.TABLE_NAME] = r.fk_count; });

        // Get actual row counts (more accurate than TABLE_ROWS)
        const tableNames = tables.map(t => t.table_name);
        const rowCounts = {};
        await Promise.all(tableNames.map(async (tn) => {
            try {
                const [[rc]] = await db.query(`SELECT COUNT(*) AS cnt FROM \`${tn}\``);
                rowCounts[tn] = rc.cnt;
            } catch (_) { rowCounts[tn] = 0; }
        }));

        const result = tables.map(t => ({
            name: t.table_name,
            rows: rowCounts[t.table_name] ?? 0,
            columns: t.column_count,
            pk: pkMap[t.table_name] || [],
            fk_count: fkMap[t.table_name] || 0,
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
    // Validate table name (alphanum + underscore only)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) return res.status(400).json({ error: 'Invalid table name' });

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const sortCol = req.query.sort || '';
    const sortDir = req.query.dir === 'desc' ? 'DESC' : 'ASC';

    try {
        // Verify table exists in this DB
        const [[tableCheck]] = await db.query(
            `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
            [name]
        );
        if (!tableCheck.cnt) return res.status(404).json({ error: 'Table not found' });

        // Get columns
        const [cols] = await db.query(
            `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT, EXTRA
             FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
             ORDER BY ORDINAL_POSITION`,
            [name]
        );

        const columnNames = cols.map(c => c.COLUMN_NAME);

        // Build WHERE clause for search
        let where = '';
        const params = [];
        if (search && columnNames.length > 0) {
            const conditions = columnNames.map(col => `CAST(\`${col}\` AS CHAR) LIKE ?`);
            where = `WHERE ${conditions.join(' OR ')}`;
            columnNames.forEach(() => params.push(`%${search}%`));
        }

        // Sort clause
        let orderClause = '';
        if (sortCol && columnNames.includes(sortCol)) {
            orderClause = `ORDER BY \`${sortCol}\` ${sortDir}`;
        }

        // Count
        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM \`${name}\` ${where}`, params);

        // Data
        const [rows] = await db.query(
            `SELECT * FROM \`${name}\` ${where} ${orderClause} LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        await logAudit('TABLE_VIEW', name, `Page ${page}, search="${search}"`, 'admin');
        res.json({
            table: name,
            columns: cols,
            rows,
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
        });
    } catch (err) {
        console.error('dbmanager/table data error:', err.message);
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
            WHERE c.TABLE_SCHEMA = DATABASE() AND t.TABLE_TYPE = 'BASE TABLE'
            ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
        `);

        const [foreignKeys] = await db.query(`
            SELECT 
                kcu.TABLE_NAME,
                kcu.COLUMN_NAME,
                kcu.REFERENCED_TABLE_NAME,
                kcu.REFERENCED_COLUMN_NAME,
                kcu.CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS rc
                ON rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME AND rc.CONSTRAINT_SCHEMA = kcu.TABLE_SCHEMA
            WHERE kcu.TABLE_SCHEMA = DATABASE() AND kcu.REFERENCED_TABLE_NAME IS NOT NULL
            ORDER BY kcu.TABLE_NAME, kcu.COLUMN_NAME
        `);

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
        const totalCols = columns.length;
        const totalFKs = foreignKeys.length;

        await logAudit('SCHEMA_VIEW', null, `Viewed schema: ${tables.length} tables`, 'admin');
        res.json({ tables, total_tables: tables.length, total_columns: totalCols, total_fks: totalFKs });
    } catch (err) {
        console.error('dbmanager/schema error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════
// GET /api/dbmanager/audit — list audit log entries
// ═══════════════════════════════════════════════════════════════
router.get('/audit', async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 30);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const filterAction = req.query.action || '';
    const filterTable = req.query.table || '';
    const dateFrom = req.query.from || '';
    const dateTo = req.query.to || '';

    try {
        const conditions = [];
        const params = [];
        if (search) {
            conditions.push('(action LIKE ? OR table_name LIKE ? OR admin_user LIKE ? OR details LIKE ?)');
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (filterAction) { conditions.push('action = ?'); params.push(filterAction); }
        if (filterTable) { conditions.push('table_name = ?'); params.push(filterTable); }
        if (dateFrom) { conditions.push('DATE(created_at) >= ?'); params.push(dateFrom); }
        if (dateTo) { conditions.push('DATE(created_at) <= ?'); params.push(dateTo); }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM audit_log ${where}`, params);
        const [rows] = await db.query(
            `SELECT * FROM audit_log ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        // Get distinct actions for filter
        const [actions] = await db.query('SELECT DISTINCT action FROM audit_log ORDER BY action');
        const [tableNames] = await db.query('SELECT DISTINCT table_name FROM audit_log WHERE table_name IS NOT NULL ORDER BY table_name');

        res.json({ rows, total, page, limit, pages: Math.ceil(total / limit), actions: actions.map(a => a.action), table_names: tableNames.map(t => t.table_name) });
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
