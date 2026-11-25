import React, { useState, useEffect, useCallback } from 'react';
import { getDbTables, getDbTableData } from '../services/api';
import { Database, Table2, Key, Link, Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, X, RefreshCw } from 'lucide-react';

export default function DbTableBrowser() {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [tableData, setTableData] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortCol, setSortCol] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    setLoading(true);
    getDbTables()
      .then(d => { setTables(d.tables); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadTableData = useCallback((name, pg = 1, srch = '', sc = '', sd = 'asc') => {
    setDataLoading(true);
    getDbTableData(name, { page: pg, limit: 20, search: srch, sort: sc, dir: sd })
      .then(d => { setTableData(d); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setDataLoading(false));
  }, []);

  function selectTable(t) {
    setSelected(t);
    setSearch('');
    setPage(1);
    setSortCol('');
    setSortDir('asc');
    loadTableData(t.name, 1, '', '', 'asc');
  }

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    loadTableData(selected.name, 1, search, sortCol, sortDir);
  }

  function handleSort(col) {
    const newDir = sortCol === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortCol(col);
    setSortDir(newDir);
    loadTableData(selected.name, page, search, col, newDir);
  }

  function handlePage(np) {
    setPage(np);
    loadTableData(selected.name, np, search, sortCol, sortDir);
  }

  const filtered = tables.filter(t => t.name.toLowerCase().includes(filterText.toLowerCase()));

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <Database size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
        <div>Loading tables…</div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 130px)', overflow: 'hidden' }}>
      {/* Left panel: table list */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="card" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Database size={18} color="var(--primary)" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Database Tables</span>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 12 }}>{tables.length} tables in database</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={filterText}
              onChange={e => setFilterText(e.target.value)}
              placeholder="Filter tables…"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {filtered.map(t => (
            <button key={t.name} onClick={() => selectTable(t)}
              style={{
                width: '100%', textAlign: 'left', background: selected?.name === t.name ? 'var(--primary)' : 'var(--bg-card)',
                border: `1px solid ${selected?.name === t.name ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 10, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s',
                color: selected?.name === t.name ? '#fff' : 'var(--text-primary)'
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Table2 size={14} />
                <span style={{ fontWeight: 600, fontSize: 13 }}>{t.name}</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, opacity: 0.8 }}>
                <span>{t.rows} rows</span>
                <span>·</span>
                <span>{t.columns} cols</span>
                {t.fk_count > 0 && <><span>·</span><span>{t.fk_count} FK</span></>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel: table data */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden' }}>
        {!selected ? (
          <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Table2 size={48} style={{ marginBottom: 16, opacity: 0.3 }} />
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Select a Table</div>
              <div style={{ fontSize: 13 }}>Choose a table from the left panel to view its records</div>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="card" style={{ padding: '14px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => { setSelected(null); setTableData(null); }}
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</span>
                  <span style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px', fontSize: 12, color: 'var(--text-muted)' }}>
                    {tableData?.total ?? '…'} rows
                  </span>
                  {selected.pk?.length > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', borderRadius: 6, padding: '2px 8px' }}>
                      <Key size={11} /> PK: {selected.pk.join(', ')}
                    </span>
                  )}
                  {selected.fk_count > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: 6, padding: '2px 8px' }}>
                      <Link size={11} /> {selected.fk_count} FK
                    </span>
                  )}
                </div>
                <button onClick={() => loadTableData(selected.name, page, search, sortCol, sortDir)}
                  style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                  <RefreshCw size={13} /> Refresh
                </button>
              </div>
              <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search across all columns…"
                    style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
                  />
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Search</button>
                {search && (
                  <button type="button" onClick={() => { setSearch(''); setPage(1); loadTableData(selected.name, 1, '', sortCol, sortDir); }}
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                )}
              </form>
            </div>

            {/* Table data */}
            <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {dataLoading ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Loading data…
                </div>
              ) : error ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--danger)' }}>{error}</div>
              ) : tableData ? (
                <>
                  <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'var(--bg-overlay)', position: 'sticky', top: 0 }}>
                          {tableData.columns.map(col => (
                            <th key={col.COLUMN_NAME}
                              onClick={() => handleSort(col.COLUMN_NAME)}
                              style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)', userSelect: 'none' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {col.COLUMN_KEY === 'PRI' && <Key size={10} color="var(--primary)" />}
                                {col.COLUMN_KEY === 'MUL' && <Link size={10} color="#818cf8" />}
                                {col.COLUMN_NAME}
                                {sortCol === col.COLUMN_NAME
                                  ? sortDir === 'asc' ? <ArrowUp size={12} color="var(--primary)" /> : <ArrowDown size={12} color="var(--primary)" />
                                  : <ArrowUpDown size={11} style={{ opacity: 0.3 }} />}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.length === 0 ? (
                          <tr><td colSpan={tableData.columns.length} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No records found</td></tr>
                        ) : tableData.rows.map((row, ri) => (
                          <tr key={ri} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            {tableData.columns.map(col => (
                              <td key={col.COLUMN_NAME} style={{ padding: '10px 14px', color: 'var(--text-primary)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {row[col.COLUMN_NAME] === null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span>
                                  : String(row[col.COLUMN_NAME]).length > 60 ? String(row[col.COLUMN_NAME]).substring(0, 60) + '…'
                                    : String(row[col.COLUMN_NAME])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, tableData.total)} of {tableData.total} rows
                    </span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page <= 1 ? 'not-allowed' : 'pointer' }}>
                        <ChevronLeft size={14} />
                      </button>
                      <span style={{ color: 'var(--text-muted)', padding: '0 8px' }}>Page {page} of {tableData.pages}</span>
                      <button onClick={() => handlePage(page + 1)} disabled={page >= tableData.pages}
                        style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', color: page >= tableData.pages ? 'var(--text-muted)' : 'var(--text-primary)', cursor: page >= tableData.pages ? 'not-allowed' : 'pointer' }}>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
