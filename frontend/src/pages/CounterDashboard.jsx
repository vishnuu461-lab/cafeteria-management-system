import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../student.css';

const STATUS_COLORS = {
    pending: { bg: '#fef3c7', color: '#92400e' },
    confirmed: { bg: '#dbeafe', color: '#1e40af' },
    preparing: { bg: '#ede9fe', color: '#5b21b6' },
    ready: { bg: '#dcfce7', color: '#166534' },
    delivered: { bg: '#f0fdf4', color: '#15803d' },
    cancelled: { bg: '#fee2e2', color: '#991b1b' },
};
const PAY_COLORS = {
    unpaid: { bg: '#fff7ed', color: '#c2410c' },
    paid: { bg: '#f0fdf4', color: '#166534' },
};

export default function CounterDashboard({ worker, onLogout }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('all');
    const [selected, setSelected] = useState(null);
    const [cashInput, setCashInput] = useState('');
    const [cashErr, setCashErr] = useState('');
    const [cashOk, setCashOk] = useState('');
    const [updatingStatus, setUpdating] = useState(false);

    const fetchOrders = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/worker/counter/orders');
            setOrders(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchOrders(); const t = setInterval(fetchOrders, 15000); return () => clearInterval(t); }, [fetchOrders]);

    const filtered = orders.filter(o => {
        const matchSearch = !search ||
            String(o.Order_ID).includes(search) ||
            (o.Customer_Name || '').toLowerCase().includes(search.toLowerCase());
        const matchFilter = filter === 'all' || o.Order_Status === filter || o.Payment_Status === filter;
        return matchSearch && matchFilter;
    });

    async function confirmCash() {
        setCashErr(''); setCashOk('');
        if (!cashInput) { setCashErr('Enter the amount received.'); return; }
        try {
            const { data } = await axios.patch('/api/worker/counter/cash-confirm', {
                order_id: selected.Order_ID,
                amount_received: parseFloat(cashInput)
            });
            setCashOk(data.message);
            fetchOrders();
            setTimeout(() => { setCashOk(''); setCashInput(''); setSelected(null); }, 2000);
        } catch (e) { setCashErr(e.response?.data?.error || 'Failed to confirm payment'); }
    }

    async function updateStatus(status) {
        setUpdating(true);
        try {
            await axios.patch('/api/worker/counter/order-status', { order_id: selected.Order_ID, status });
            fetchOrders();
            setSelected(prev => ({ ...prev, Order_Status: status }));
        } catch (e) { alert(e.response?.data?.error || 'Failed'); }
        finally { setUpdating(false); }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'Plus Jakarta Sans, Inter, sans-serif' }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', padding: '16px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: 18 }}>🖥️ Counter Dashboard</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>Welcome, {worker.Name}</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <button onClick={fetchOrders} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>🔄 Refresh</button>
                    <button onClick={onLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer', fontSize: 12 }}>Logout</button>
                </div>
            </div>

            <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
                {/* Search + Filters */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <input value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="🔍 Search by Order ID or customer name…"
                        style={{ flex: 1, minWidth: 200, padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                    {['all', 'pending', 'preparing', 'ready', 'unpaid', 'paid'].map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            style={{
                                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, fontFamily: 'inherit',
                                background: filter === f ? '#1e40af' : '#e5e7eb',
                                color: filter === f ? '#fff' : '#374151'
                            }}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12, marginBottom: 20 }}>
                    {[
                        { label: 'Total Orders', val: orders.length, bg: '#eff6ff', col: '#1e40af' },
                        { label: 'Pending', val: orders.filter(o => o.Order_Status === 'pending').length, bg: '#fef3c7', col: '#92400e' },
                        { label: 'Preparing', val: orders.filter(o => o.Order_Status === 'preparing').length, bg: '#ede9fe', col: '#5b21b6' },
                        { label: 'Ready', val: orders.filter(o => o.Order_Status === 'ready').length, bg: '#dcfce7', col: '#166534' },
                        { label: 'Unpaid Cash', val: orders.filter(o => o.Payment_Status === 'unpaid' && o.Payment_Method === 'cash' || (!o.Payment_Method && o.Payment_Status === 'unpaid')).length, bg: '#fff7ed', col: '#c2410c' },
                    ].map(s => (
                        <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '12px 16px' }}>
                            <div style={{ fontSize: 22, fontWeight: 800, color: s.col }}>{s.val}</div>
                            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Orders List */}
                {loading ? <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>Loading orders…</div> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(o => {
                            const sc = STATUS_COLORS[o.Order_Status] || {};
                            const pc = PAY_COLORS[o.Payment_Status] || PAY_COLORS.unpaid;
                            return (
                                <div key={o.Order_ID} onClick={() => { setSelected(o); setCashInput(''); setCashErr(''); setCashOk(''); }}
                                    style={{
                                        background: '#fff', borderRadius: 14, padding: '14px 16px', cursor: 'pointer',
                                        border: selected?.Order_ID === o.Order_ID ? '2px solid #3b82f6' : '1.5px solid #e5e7eb',
                                        boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
                                        <div>
                                            <span style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>Order #{o.Order_ID}</span>
                                            <span style={{ marginLeft: 10, fontSize: 12, color: '#64748b' }}>{o.Customer_Name} · {o.Phone}</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <span style={{ ...sc, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{o.Order_Status}</span>
                                            <span style={{ ...pc, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{o.Payment_Status}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
                                        {o.items?.map(it => `${it.Item_Name} ×${it.Quantity}`).join(' · ')}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 13 }}>
                                        <span style={{ color: '#6b7280' }}>{o.Payment_Method?.toUpperCase() || 'CASH'} · {o.Order_Type?.replace('_', ' ')}</span>
                                        <strong style={{ color: '#1e293b' }}>₹{parseFloat(o.Total_Amount).toFixed(2)}</strong>
                                    </div>
                                </div>
                            );
                        })}
                        {!filtered.length && <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>No orders found</div>}
                    </div>
                )}
            </div>

            {/* Order Detail Panel */}
            {selected && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
                    onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
                    <div style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', padding: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <div style={{ fontWeight: 800, fontSize: 18 }}>Order #{selected.Order_ID}</div>
                            <button onClick={() => setSelected(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 14 }}>✕</button>
                        </div>

                        <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                                <span style={{ color: '#6b7280' }}>Customer</span><strong>{selected.Customer_Name}</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                                <span style={{ color: '#6b7280' }}>Phone</span><span>{selected.Phone}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                <span style={{ color: '#6b7280' }}>Payment</span><span>{selected.Payment_Method?.toUpperCase() || 'CASH'} · <strong style={{ color: selected.Payment_Status === 'paid' ? '#16a34a' : '#c2410c' }}>{selected.Payment_Status}</strong></span>
                            </div>
                        </div>

                        {/* Items */}
                        <div style={{ marginBottom: 14 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Items Ordered</div>
                            {selected.items?.map((it, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '5px 0', borderBottom: '1px dashed #f0f0f0' }}>
                                    <span>{it.Item_Name} × {it.Quantity}</span>
                                    <span>₹{parseFloat(it.Line_Total).toFixed(2)}</span>
                                </div>
                            ))}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, marginTop: 10, paddingTop: 10, borderTop: '2px solid #f0f0f0' }}>
                                <span>Total</span><span>₹{parseFloat(selected.Total_Amount).toFixed(2)}</span>
                            </div>
                        </div>

                        {/* Update Order Status */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Update Order Status</div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                {['pending', 'confirmed', 'preparing', 'ready', 'delivered'].map(s => (
                                    <button key={s} onClick={() => updateStatus(s)} disabled={updatingStatus || selected.Order_Status === s}
                                        style={{
                                            padding: '7px 14px', borderRadius: 8, border: 'none', cursor: selected.Order_Status === s ? 'default' : 'pointer',
                                            fontWeight: 600, fontSize: 12, fontFamily: 'inherit',
                                            background: selected.Order_Status === s ? '#1e40af' : '#e5e7eb',
                                            color: selected.Order_Status === s ? '#fff' : '#374151',
                                            opacity: updatingStatus ? 0.6 : 1
                                        }}>
                                        {s.charAt(0).toUpperCase() + s.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Cash Confirmation */}
                        {selected.Payment_Status !== 'paid' && (
                            <div style={{ background: '#fff7ed', borderRadius: 12, padding: 14 }}>
                                <div style={{ fontWeight: 700, fontSize: 13, color: '#9a3412', marginBottom: 8 }}>💵 Confirm Cash Payment</div>
                                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>Expected: <strong>₹{parseFloat(selected.Total_Amount).toFixed(2)}</strong></div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <input type="number" value={cashInput} onChange={e => setCashInput(e.target.value)}
                                        placeholder="Amount received" step="0.01"
                                        style={{ flex: 1, padding: '10px 12px', border: '1.5px solid #fed7aa', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
                                    <button onClick={confirmCash}
                                        style={{ background: '#ea580c', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                                        ✅ Confirm
                                    </button>
                                </div>
                                {cashErr && <div style={{ color: '#dc2626', fontSize: 12, marginTop: 8 }}>❌ {cashErr}</div>}
                                {cashOk && <div style={{ color: '#16a34a', fontSize: 12, marginTop: 8 }}>✅ {cashOk}</div>}
                            </div>
                        )}
                        {selected.Payment_Status === 'paid' && (
                            <div style={{ background: '#f0fdf4', borderRadius: 12, padding: 14, textAlign: 'center', color: '#166534', fontWeight: 700 }}>
                                ✅ Payment already confirmed — PAID
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
