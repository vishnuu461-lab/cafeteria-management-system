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
      // Push to history
      setHistory(h => [{ sql: sql.trim(), ts: new Date(), ok: true }, ...h].slice(0, 20));
    } catch (e) {
      setError(e.message);
      setHistory(h => [{ sql: sql.trim(), ts: new Date(), ok: false }, ...h].slice(0, 20));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      execute();
    }
    // Tab indent
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 'calc(100vh - 130px)', overflow: 'hidden' }}>
      {/* Header */}
      <div className="card" style={{ padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Terminal size={20} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>SQL Console</h2>
            <span style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', borderRadius: 6, padding: '2px 10px', fontSize: 11, fontWeight: 600 }}>
              SELECT ONLY
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => setShowHistory(h => !h)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', cursor: 'pointer', fontSize: 13 }}>
              <History size={14} /> History ({history.length})
            </button>
          </div>
        </div>
        <div style={{ marginTop: 10, background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: 'var(--text-muted)' }}>
          🔒 Read-only mode: SELECT, SHOW, DESCRIBE and EXPLAIN are allowed. Write operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked for safety. Press <strong>Ctrl+Enter</strong> to run.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
        {/* Editor area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
          {/* SQL editor */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ background: 'var(--bg-overlay)', padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'monospace' }}>SQL Editor</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {SAMPLE_QUERIES.slice(0, 3).map((q, i) => (
                    <button key={i} onClick={() => setSql(q)}
                      style={{ padding: '3px 10px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-muted)', cursor: 'pointer' }}>
                      Sample {i + 1}
                    </button>
                  ))}
                </div>
                {sql && (
                  <button onClick={() => { setSql(''); setResult(null); setError(''); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', fontSize: 11, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--danger)', cursor: 'pointer' }}>
                    <Trash2 size={11} /> Clear
                  </button>
                )}
              </div>
            </div>
            <textarea
              ref={textareaRef}
              value={sql}
              onChange={e => setSql(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="-- Write your SQL here...\n-- Example: SELECT * FROM orders LIMIT 10\n-- Press Ctrl+Enter to execute"
              rows={8}
              style={{
                width: '100%', background: '#0f0f13', color: '#e2e8f0', fontFamily: '"Fira Code", "Cascadia Code", monospace',
                fontSize: 13, lineHeight: 1.7, padding: '14px 16px', border: 'none', outline: 'none', resize: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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

          {/* Results */}
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-overlay)', flexShrink: 0 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Results</span>
              {result && !error && (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#22c55e' }}>
                    <CheckCircle size={13} /> {result.row_count} rows
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                    <Clock size={13} /> {execMs}ms
                  </span>
                </>
              )}
              {error && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--danger)' }}>
                  <AlertCircle size={13} /> Error
                </span>
              )}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {!result && !error && !loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', flexDirection: 'column', gap: 8 }}>
                  <Terminal size={36} style={{ opacity: 0.2 }} />
                  <span style={{ fontSize: 13 }}>Write a SQL query above and press Run</span>
                </div>
              )}
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                  Executing query…
                </div>
              )}
              {error && (
                <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, margin: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: 'var(--danger)', fontWeight: 600 }}>
                    <AlertCircle size={16} /> Query Error
                  </div>
                  <pre style={{ color: '#fca5a5', fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', margin: 0 }}>{error}</pre>
                </div>
              )}
              {result && !error && result.columns.length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-overlay)', position: 'sticky', top: 0 }}>
                      {result.columns.map(col => (
                        <th key={col} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, ri) => (
                      <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {result.columns.map(col => (
                          <td key={col} style={{ padding: '9px 14px', color: 'var(--text-primary)', maxWidth: 240, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {row[col] === null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span> : String(row[col])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {result && !error && result.columns.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Query executed successfully. No rows returned.</div>
              )}
            </div>
          </div>
        </div>

        {/* History sidebar */}
        {showHistory && (
          <div className="card" style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
                    {h.ok
                      ? <CheckCircle size={12} color="#22c55e" />
                      : <AlertCircle size={12} color="var(--danger)" />}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{h.ts.toLocaleTimeString()}</span>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.sql.substring(0, 60)}{h.sql.length > 60 ? '…' : ''}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
