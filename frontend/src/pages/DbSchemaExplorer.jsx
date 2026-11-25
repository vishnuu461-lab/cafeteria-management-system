import React, { useState, useEffect } from 'react';
import { getDbSchema } from '../services/api';
import { Compass, Key, Link, ChevronRight, Database, Columns, AlertCircle } from 'lucide-react';

export default function DbSchemaExplorer() {
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setLoading(true);
    getDbSchema()
      .then(d => { setSchema(d); if (d.tables?.length) setSelected(d.tables[0].name); setError(''); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        <Compass size={40} style={{ marginBottom: 12, opacity: 0.5 }} />
        <div>Loading schema…</div>
      </div>
    </div>
  );
  if (error) return (
    <div className="card" style={{ padding: 24, color: 'var(--danger)', display: 'flex', gap: 8, alignItems: 'center' }}>
      <AlertCircle size={18} /> {error}
    </div>
  );
  if (!schema) return null;

  const selectedTable = schema.tables.find(t => t.name === selected);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        {[
          { label: 'Tables', value: schema.total_tables, icon: Database },
          { label: 'Columns', value: schema.total_columns, icon: Columns },
          { label: 'Foreign Keys', value: schema.total_fks, icon: Link },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ background: 'rgba(249,115,22,0.15)', borderRadius: 10, padding: 10 }}>
              <Icon size={20} color="var(--primary)" />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, height: 'calc(100vh - 260px)', overflow: 'hidden' }}>
        {/* Table list */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          {schema.tables.map(t => (
            <button key={t.name} onClick={() => setSelected(t.name)}
              style={{
                width: '100%', textAlign: 'left', background: selected === t.name ? 'var(--primary)' : 'var(--bg-card)',
                border: `1px solid ${selected === t.name ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                color: selected === t.name ? '#fff' : 'var(--text-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{t.name}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{t.columns.length}</span>
                <ChevronRight size={12} style={{ opacity: 0.6 }} />
              </div>
            </button>
          ))}
        </div>

        {/* Table detail */}
        {selectedTable && (
          <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <Database size={18} color="var(--primary)" />
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedTable.name}</h2>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                <span>{selectedTable.columns.length} columns</span>
                {selectedTable.foreign_keys.length > 0 && <span>{selectedTable.foreign_keys.length} foreign keys</span>}
              </div>
            </div>

            <div style={{ flex: 1, overflow: 'auto' }}>
              {/* Columns table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-overlay)', position: 'sticky', top: 0 }}>
                    {['Column', 'Type', 'Nullable', 'Key', 'Default', 'Extra'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTable.columns.map(col => (
                    <tr key={col.name} style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {col.key === 'PRI' && <Key size={13} color="var(--primary)" />}
                          {col.key === 'MUL' && <Link size={13} color="#818cf8" />}
                          {col.name}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 12, background: 'var(--bg-overlay)', padding: '2px 7px', borderRadius: 4, color: '#7dd3fc' }}>{col.type}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ color: col.nullable ? '#fbbf24' : '#6b7280', fontSize: 12 }}>{col.nullable ? 'YES' : 'NO'}</span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {col.key === 'PRI' && <span style={{ background: 'rgba(249,115,22,0.15)', color: 'var(--primary)', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>PRIMARY</span>}
                        {col.key === 'MUL' && <span style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>FOREIGN</span>}
                        {col.key === 'UNI' && <span style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: 4, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>UNIQUE</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
                        {col.default !== null ? String(col.default) : <span style={{ fontStyle: 'italic' }}>NULL</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                        {col.extra || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* FK relationships */}
              {selectedTable.foreign_keys.length > 0 && (
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link size={15} color="#818cf8" /> Foreign Key Relationships
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedTable.foreign_keys.map((fk, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.2)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                        <span style={{ fontFamily: 'monospace', color: '#818cf8', fontWeight: 600 }}>{selectedTable.name}.{fk.column}</span>
                        <span style={{ color: 'var(--text-muted)' }}>→ references →</span>
                        <span style={{ fontFamily: 'monospace', color: '#7dd3fc', fontWeight: 600 }}>{fk.references_table}.{fk.references_column}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
