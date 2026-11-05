import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../student.css';

const STOCK_BADGE = {
    in_stock: { bg: '#dcfce7', color: '#166534', label: 'In Stock' },
    low_stock: { bg: '#fef9c3', color: '#854d0e', label: 'Low Stock' },
    out_of_stock: { bg: '#fee2e2', color: '#991b1b', label: 'Out of Stock' },
};

export default function InventoryDashboard({ worker, onLogout }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [newQty, setNewQty] = useState('');
    const [newStatus, setNewStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState('');
    const [confirm, setConfirm] = useState(null); // {item} for out-of-stock confirm

    const fetchInventory = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/worker/inventory');
            setItems(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchInventory(); }, [fetchInventory]);

    const filtered = items.filter(i => {
        const matchSearch = !search || i.Item_Name.toLowerCase().includes(search.toLowerCase()) || i.Item_Code.includes(search);
        const matchFilter = filter === 'all' || i.Stock_Status === filter;
        return matchSearch && matchFilter;
    });

    async function saveUpdate() {
        if (!selected) return;
        setSaving(true); setMsg('');
        try {
            const payload = {};
            if (newQty !== '') payload.current_stock = parseFloat(newQty);
            if (newStatus) payload.status = newStatus;
            if (!Object.keys(payload).length) { setMsg('Nothing changed.'); setSaving(false); return; }
            await axios.patch(`/api/worker/inventory/${selected.Inventory_Item_ID}`, payload);
            setMsg('✅ Updated successfully!');
            fetchInventory();
            setTimeout(() => setMsg(''), 2000);
        } catch (e) { setMsg('❌ ' + (e.response?.data?.error || 'Failed')); }
        finally { setSaving(false); }
    }

    async function markOutOfStock(item) {
        setSaving(true); setMsg('');
        try {
            await axios.patch(`/api/worker/inventory/${item.Inventory_Item_ID}`, { mark_out_of_stock: true });
            setMsg('✅ Marked as Out of Stock. Related menu items updated.');
            setConfirm(null);
            fetchInventory();
            if (selected?.Inventory_Item_ID === item.Inventory_Item_ID) setSelected(null);
            setTimeout(() => setMsg(''), 3000);
        } catch (e) { setMsg('❌ Failed'); }
        finally { setSaving(false); }
    }

    const counts = {
        total: items.length,
        in_stock: items.filter(i => i.Stock_Status === 'in_stock').length,
        low_stock: items.filter(i => i.Stock_Status === 'low_stock').length,
        out_of_stock: items.filter(i => i.Stock_Status === 'out_of_stock').length,
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #166534, #16a34a)', padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>📦 Inventory Dashboard</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Welcome, {worker.Name}</div>
                </div>
                <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Logout</button>
            </div>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
                    {[
                        { label: 'Total Items', val: counts.total, bg: '#eff6ff', col: '#1e40af' },
                        { label: 'In Stock', val: counts.in_stock, bg: '#dcfce7', col: '#166534' },
                        { label: 'Low Stock', val: counts.low_stock, bg: '#fef9c3', col: '#854d0e' },
                        { label: 'Out of Stock', val: counts.out_of_stock, bg: '#fee2e2', col: '#991b1b' },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 16px' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.col }}>{s.val}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Search + Filter */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Search item name or code…"
                        style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                    {['all', 'in_stock', 'low_stock', 'out_of_stock'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit',
                                background: filter === f ? '#16a34a' : '#e5e7eb',
                                color: filter === f ? '#fff' : '#374151'
                            }}>
                            {f === 'all' ? 'All' : f.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </button>
                    ))}
                </div>

                {msg && <div style={{ background: msg.startsWith('✅') ? '#f0fdf4' : '#fef2f2', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: msg.startsWith('✅') ? '#166534' : '#dc2626', marginBottom: 12 }}>{msg}</div>}

                {/* Items Table */}
                {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading inventory…</div> : (
                    <div style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc' }}>
                                        {['Item', 'Code', 'Stock', 'Unit', 'Min Level', 'Unit Cost', 'Status', 'Actions'].map(h => (
                                            <th key={h} style={{ padding: '12px 14px', fontWeight: 700, color: '#374151', textAlign: 'left', borderBottom: '1.5px solid #e5e7eb', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(item => {
                                        const badge = STOCK_BADGE[item.Stock_Status] || STOCK_BADGE.in_stock;
                                        return (
                                            <tr key={item.Inventory_Item_ID} style={{ borderBottom: '1px solid #f1f5f9', background: selected?.Inventory_Item_ID === item.Inventory_Item_ID ? '#eff6ff' : 'transparent' }}>
                                                <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>{item.Item_Name}</td>
                                                <td style={{ padding: '10px 14px', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{item.Item_Code}</td>
                                                <td style={{ padding: '10px 14px', fontWeight: 700, color: item.Current_Stock <= 0 ? '#dc2626' : item.Current_Stock <= item.Reorder_Level ? '#ca8a04' : '#16a34a' }}>
                                                    {parseFloat(item.Current_Stock).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '10px 14px', color: '#64748b' }}>{item.Unit}</td>
                                                <td style={{ padding: '10px 14px', color: '#64748b' }}>{parseFloat(item.Reorder_Level).toFixed(2)}</td>
                                                <td style={{ padding: '10px 14px', color: '#64748b' }}>₹{parseFloat(item.Unit_Cost).toFixed(2)}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <span style={{ ...badge, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                                        {badge.label}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', gap: 6 }}>
                                                        <button onClick={() => { setSelected(item); setNewQty(''); setNewStatus(''); setMsg(''); }}
                                                            style={{ background: '#eff6ff', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, color: '#1e40af', fontFamily: 'inherit' }}>
                                                            ✏️ Edit
                                                        </button>
                                                        {item.Stock_Status !== 'out_of_stock' && (
                                                            <button onClick={() => setConfirm(item)}
                                                                style={{ background: '#fee2e2', border: 'none', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer', fontWeight: 600, color: '#991b1b', fontFamily: 'inherit' }}>
                                                                ❌ OOS
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {!filtered.length && <div style={{ textAlign: 'center', padding: 30, color: '#9ca3af' }}>No items found</div>}
                    </div>
                )}
            </div>

            {/* Edit Panel */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                    onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
                    <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontWeight: 800, fontSize: 16 }}>✏️ Update: {selected.Item_Name}</div>
                            <button onClick={() => setSelected(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ display: 'grid', gap: 12 }}>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>New Stock Quantity ({selected.Unit})</label>
                                <input type="number" value={newQty} onChange={e => setNewQty(e.target.value)}
                                    placeholder={`Current: ${parseFloat(selected.Current_Stock).toFixed(2)}`} step="0.01" min="0"
                                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Stock Status</label>
                                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                                    style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', outline: 'none' }}>
                                    <option value="">— Keep current —</option>
                                    <option value="active">Active (In Stock)</option>
                                    <option value="inactive">Inactive (Out of Stock)</option>
                                </select>
                            </div>
                            <button onClick={saveUpdate} disabled={saving}
                                style={{ background: 'linear-gradient(135deg,#166534,#16a34a)', color: '#fff', border: 'none', borderRadius: 10, padding: 14, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
                                {saving ? '⏳ Saving…' : '💾 Save Changes'}
                            </button>
                            <button onClick={() => setConfirm(selected)}
                                style={{ background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 10, padding: 12, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                ❌ Mark as Out of Stock
                            </button>
                            {msg && <div style={{ fontSize: 13, textAlign: 'center', color: msg.startsWith('✅') ? '#166534' : '#dc2626' }}>{msg}</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Out of Stock */}
            {confirm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                    <div style={{ background: '#fff', borderRadius: 16, padding: 24, maxWidth: 360, width: '100%' }}>
                        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
                        <div style={{ fontWeight: 800, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>Mark as Out of Stock?</div>
                        <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', marginBottom: 20 }}>
                            <strong>{confirm.Item_Name}</strong> will be marked Out of Stock.<br />
                            Related menu items will also be marked Unavailable for students.
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={() => setConfirm(null)}
                                style={{ flex: 1, padding: 12, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>
                                Cancel
                            </button>
                            <button onClick={() => markOutOfStock(confirm)} disabled={saving}
                                style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
                                {saving ? '⏳…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
