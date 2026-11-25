import React, { useState, useEffect, useCallback } from 'react';
import { getAuditLog } from '../services/api';
import { ScrollText, Search, RefreshCw, ChevronLeft, ChevronRight, Filter, X } from 'lucide-react';

const ACTION_COLORS = {
  TABLE_LIST_VIEW: '#3b82f6',
  TABLE_VIEW: '#22c55e',
  QUERY_RUN: '#f97316',
  SCHEMA_VIEW: '#8b5cf6',
  ER_DIAGRAM_VIEW: '#ec4899',
  AUDIT_VIEW: '#6b7280',
};

function formatDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function DbAuditLog() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterTable, setFilterTable] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback((pg = 1, srch = '', fa = '', ft = '', df = '', dt = '') => {
    setLoading(true);
    const params = { page: pg, limit: 30, search: srch };
    if (fa) params.action = fa;
    if (ft) params.table = ft;
    if (df) params.from = df;
    if (dt) params.to = dt;
    getAuditLog(params)
      .then(d => { setData(d); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(1); }, [load]);

  function handleSearch(e) {
    e.preventDefault();
    setPage(1);
    load(1, search, filterAction, filterTable, dateFrom, dateTo);
  }

  function handlePage(np) {
    setPage(np);
    load(np, search, filterAction, filterTable, dateFrom, dateTo);
  }

  function clearFilters() {
    setSearch(''); setFilterAction(''); setFilterTable(''); setDateFrom(''); setDateTo('');
    setPage(1);
    load(1, '', '', '', '', '');
  }

  const hasFilters = search || filterAction || filterTable || dateFrom || dateTo;

  return (
    <div>
      {/* Header card */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScrollText size={20} color="var(--primary)" />
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Audit Log</h2>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>All database management activities by administrators</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowFilters(f => !f)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: showFilters ? 'var(--primary)' : 'var(--bg-overlay)', border: `1px solid ${showFilters ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', color: showFilters ? '#fff' : 'var(--text-muted)', fontSize: 13 }}>
              <Filter size={14} /> Filters {hasFilters && '•'}
            </button>
            <button onClick={() => load(page, search, filterAction, filterTable, dateFrom, dateTo)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by action, table, user, or details…"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 8, paddingBottom: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Search</button>
          {hasFilters && (
            <button type="button" onClick={clearFilters}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 12px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--danger)', cursor: 'pointer', fontSize: 13 }}>
              <X size={14} /> Clear
            </button>
          )}
        </form>

        {/* Filters panel */}
        {showFilters && (
          <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>ACTION TYPE</label>
              <select value={filterAction} onChange={e => { setFilterAction(e.target.value); setPage(1); load(1, search, e.target.value, filterTable, dateFrom, dateTo); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="">All Actions</option>
                {data?.actions?.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TABLE</label>
              <select value={filterTable} onChange={e => { setFilterTable(e.target.value); setPage(1); load(1, search, filterAction, e.target.value, dateFrom, dateTo); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13 }}>
                <option value="">All Tables</option>
                {data?.table_names?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>FROM DATE</label>
              <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); load(1, search, filterAction, filterTable, e.target.value, dateTo); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>TO DATE</label>
              <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); load(1, search, filterAction, filterTable, dateFrom, e.target.value); }}
                style={{ width: '100%', padding: '7px 10px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading audit log…</div>
        ) : error ? (
          <div style={{ padding: 24, color: 'var(--danger)' }}>{error}</div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-overlay)' }}>
                    {['#', 'Action', 'Table', 'Details', 'Admin User', 'Timestamp'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.rows?.length === 0 ? (
                    <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>No audit log entries found</td></tr>
                  ) : data?.rows?.map((row, i) => (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{row.id}</td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: (ACTION_COLORS[row.action] || '#6b7280') + '20',
                          color: ACTION_COLORS[row.action] || '#6b7280',
                          borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600
                        }}>
                          {row.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {row.table_name
                          ? <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--primary)' }}>{row.table_name}</span>
                          : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.details ? (row.details.length > 80 ? row.details.substring(0, 80) + '…' : row.details) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 12 }}>
                        <span style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '2px 8px' }}>{row.admin_user || 'admin'}</span>
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {formatDate(row.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {data?.total > 0 && (
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: 'var(--text-muted)' }}>
                  {data.total} total entries
                </span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={() => handlePage(page - 1)} disabled={page <= 1}
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    <ChevronLeft size={14} />
                  </button>
                  <span style={{ color: 'var(--text-muted)', padding: '0 8px' }}>Page {page} of {data.pages || 1}</span>
                  <button onClick={() => handlePage(page + 1)} disabled={page >= (data.pages || 1)}
                    style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', cursor: page >= (data.pages || 1) ? 'not-allowed' : 'pointer', color: page >= (data.pages || 1) ? 'var(--text-muted)' : 'var(--text-primary)' }}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
