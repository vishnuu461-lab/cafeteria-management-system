import React, { useState, useRef } from 'react';
import { runDbQuery } from '../services/api';
import { Terminal, Play, Trash2, Clock, AlertCircle, CheckCircle, History, X } from 'lucide-react';

const SAMPLE_QUERIES = [
  "SELECT * FROM customer LIMIT 10",
  "SELECT Order_Status, COUNT(*) AS cnt FROM orders GROUP BY Order_Status",
  "SELECT mi.Item_Name, COUNT(oi.Order_Item_ID) AS sold FROM order_item oi JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID GROUP BY mi.Menu_Item_ID ORDER BY sold DESC LIMIT 5",
  "SHOW TABLES",
  "DESCRIBE orders",
];

export default function DbSQLConsole() {
  const [sql, setSql] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [execMs, setExecMs] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const textareaRef = useRef();
  const resultsRef = useRef();

  async function execute() {
    if (!sql.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    setExecMs(null);
    try {
      const data = await runDbQuery(sql.trim());
      setResult(data);
      setExecMs(data.execution_ms);
      setHistory(h => [{ sql: sql.trim(), ts: new Date(), ok: true }, ...h].slice(0, 20));
      // Scroll to results after render
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (e) {
      setError(e.message);
      setHistory(h => [{ sql: sql.trim(), ts: new Date(), ok: false }, ...h].slice(0, 20));
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      execute();
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const val = sql.substring(0, start) + '  ' + sql.substring(end);
      setSql(val);
      setTimeout(() => { e.target.selectionStart = e.target.selectionEnd = start + 2; }, 0);
    }
  }

  function loadFromHistory(item) {
    setSql(item.sql);
    setShowHistory(false);
    textareaRef.current?.focus();
  }

  function clearAll() {
    setSql('');
    setResult(null);
    setError('');
    setExecMs(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Terminal size={20} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>SQL Console</h2>
            <span style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
              SELECT ONLY
            </span>
          </div>
          <button onClick={() => setShowHistory(h => !h)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: showHistory ? 'rgba(249,115,22,0.15)' : 'var(--bg-overlay)', border: `1px solid ${showHistory ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, color: showHistory ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
            <History size={14} /> History ({history.length})
          </button>
        </div>
        <div style={{ marginTop: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
          🔒 Read-only mode: SELECT, SHOW, DESCRIBE and EXPLAIN are allowed. Write operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked for safety. Press <strong>Ctrl+Enter</strong> to run.
        </div>
      </div>

      {/* ── Editor + History side by side ──────────────────────── */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>

        {/* SQL Editor card */}
        <div className="card" style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ background: 'var(--bg-overlay)', padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>SQL Editor</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SAMPLE_QUERIES.slice(0, 3).map((q, i) => (
                <button key={i} onClick={() => setSql(q)}
                  style={{ padding: '3px 10px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
                  Sample {i + 1}
                </button>
              ))}
              {(sql || result || error) && (
                <button onClick={clearAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--danger)', cursor: 'pointer' }}>
                  <Trash2 size={11} /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={sql}
            onChange={e => setSql(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={'-- Write your SQL here...\n-- Example: SELECT * FROM orders LIMIT 10\n-- Press Ctrl+Enter to execute'}
            rows={10}
            style={{
              width: '100%',
              background: '#0f0f13',
              color: '#e2e8f0',
              fontFamily: '"Fira Code", "Cascadia Code", "Consolas", monospace',
              fontSize: 13,
              lineHeight: 1.7,
              padding: '14px 16px',
              border: 'none',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              minHeight: 180,
            }}
          />

          {/* Footer / Run */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {sql.split('\n').length} lines · {sql.length} characters
            </span>
            <button onClick={execute} disabled={loading || !sql.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: loading || !sql.trim() ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 14, opacity: loading || !sql.trim() ? 0.6 : 1 }}>
              <Play size={15} fill="currentColor" />
              {loading ? 'Executing…' : 'Run Query'}
            </button>
          </div>
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="card" style={{ width: 280, flexShrink: 0, maxHeight: 400, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-overlay)', flexShrink: 0 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Query History</span>
              <button onClick={() => setShowHistory(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No history yet</div>
              ) : history.map((h, i) => (
                <button key={i} onClick={() => loadFromHistory(h)}
                  style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', padding: '12px 16px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    {h.ok ? <CheckCircle size={12} color="#22c55e" /> : <AlertCircle size={12} color="var(--danger)" />}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.ts.toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.sql.substring(0, 55)}{h.sql.length > 55 ? '…' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Results ────────────────────────────────────────────── */}
      <div ref={resultsRef}>

        {/* Loading state */}
        {loading && (
          <div className="card" style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
            Executing query…
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="card" style={{ padding: '20px 24px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, color: 'var(--danger)', fontWeight: 600, fontSize: 15 }}>
              <AlertCircle size={18} /> Query Error
            </div>
            <pre style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
            {execMs !== null && (
              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} /> Failed in {execMs}ms
              </div>
            )}
          </div>
        )}

        {/* Success state */}
        {!loading && result && !error && (
          <div className="card" style={{ overflow: 'hidden' }}>
            {/* Results header bar */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-overlay)', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Results</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: '#22c55e' }}>
                <CheckCircle size={14} />
                <strong>{result.row_count}</strong> {result.row_count === 1 ? 'row' : 'rows'} returned
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13, color: 'var(--text-muted)' }}>
                <Clock size={13} /> {execMs}ms
              </span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                {result.columns.length} columns
              </span>
            </div>

            {result.row_count === 0 ? (
              <div style={{ padding: '32px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Query executed successfully. No rows returned.
              </div>
            ) : (
              <>
                {/* Scrollable table wrapper — horizontal + vertical scroll, NO row limit */}
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 600 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-overlay)', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', minWidth: 40 }}>#</th>
                        {result.columns.map(col => (
                          <th key={col} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* ALL rows — no slice, no truncation */}
                      {result.rows.map((row, ri) => (
                        <tr key={ri}
                          style={{ borderBottom: '1px solid var(--border)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 11 }}>{ri + 1}</td>
                          {result.columns.map(col => (
                            <td key={col} style={{ padding: '9px 14px', color: 'var(--text-primary)', maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                              title={row[col] !== null ? String(row[col]) : 'NULL'}>
                              {row[col] === null
                                ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span>
                                : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Footer row count info */}
                <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Showing all <strong style={{ color: 'var(--text-primary)' }}>{result.row_count}</strong> {result.row_count === 1 ? 'row' : 'rows'}</span>
                  {result.row_count > 100 && (
                    <span style={{ color: '#f59e0b', fontSize: 11 }}>
                      ⚠ Large result set — scroll table to see all rows, or add LIMIT to your query
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Idle state — no query run yet */}
        {!loading && !result && !error && (
          <div className="card" style={{ padding: '40px 24px', textAlign: 'center' }}>
            <Terminal size={40} style={{ opacity: 0.15, marginBottom: 12 }} />
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Write a SQL query above and press <strong>Run Query</strong> (or Ctrl+Enter)</div>
          </div>
        )}
      </div>
    </div>
  );
}
