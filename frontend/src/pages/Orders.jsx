import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Eye, X, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { getOrders, getCustomers, getCafeterias, getCounters, getEmployees, getMenuItems, getActiveOffers, createOrder, updateOrderStatus, getOrder } from '../services/api';
import toast from 'react-hot-toast';

function StatusBadge({ s }) {
    const m = { pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-purple', ready: 'badge-orange', delivered: 'badge-green', cancelled: 'badge-red' };
    return <span className={`badge ${m[s] || 'badge-gray'}`}>{s}</span>;
}
function PayBadge({ s }) {
    return <span className={`badge ${s === 'paid' ? 'badge-green' : s === 'refunded' ? 'badge-blue' : 'badge-red'}`}>{s}</span>;
}
function Modal({ show, onClose, title, children, lg }) {
    if (!show) return null;
    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className={`modal${lg ? ' modal-lg' : ''}`}>
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function Orders() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stF, setStF] = useState('');
    const [payF, setPayF] = useState('');
    const [modal, setModal] = useState(null);
    const [detail, setDetail] = useState(null);
    const [saving, setSaving] = useState(false);
    const LIMIT = 15;

    // New order form
    const [customers, setCustomers] = useState([]);
    const [cafes, setCafes] = useState([]);
    const [counters, setCounters] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [menuItems, setMenuItems] = useState([]);
    const [offers, setOffers] = useState([]);
    const [nf, setNf] = useState({ Customer_ID: '', Cafeteria_ID: '', Counter_ID: '', Employee_ID: '', Order_Type: 'dine_in', items: [], offer_id: '' });

    const load = useCallback(() => {
        setLoading(true);
        getOrders({ search, status: stF, payment_status: payF, page, limit: LIMIT })
            .then(r => { setData(r.data); setTotal(r.total); })
            .catch(() => toast.error('Failed to load orders'))
            .finally(() => setLoading(false));
    }, [search, stF, payF, page]);

    useEffect(() => { load(); }, [load]);

    async function openNewOrder() {
        try {
            const [c, ca, co, e, m, o] = await Promise.all([
                getCustomers({ limit: 200 }), getCafeterias(), getCounters(), getEmployees({ status: 'active' }),
                getMenuItems({ status: 'available', limit: 100 }), getActiveOffers()
            ]);
            setCustomers(c.data); setCafes(ca); setCounters(co); setEmployees(e);
            setMenuItems(m.data); setOffers(o);
            setNf({ Customer_ID: '', Cafeteria_ID: '', Counter_ID: '', Employee_ID: '', Order_Type: 'dine_in', items: [], offer_id: '' });
            setModal('new');
        } catch { toast.error('Failed to load form data'); }
    }

    async function openDetail(id) {
        try {
            const d = await getOrder(id);
            setDetail(d); setModal('detail');
        } catch { toast.error('Failed to load order details'); }
    }

    function addItem(menuId) {
        const mi = menuItems.find(m => m.Menu_Item_ID === parseInt(menuId));
        if (!mi) return;
        setNf(f => {
            const existing = f.items.find(i => i.Menu_Item_ID === mi.Menu_Item_ID);
            if (existing) return { ...f, items: f.items.map(i => i.Menu_Item_ID === mi.Menu_Item_ID ? { ...i, quantity: i.quantity + 1 } : i) };
            return { ...f, items: [...f.items, { Menu_Item_ID: mi.Menu_Item_ID, name: mi.Item_Name, price: mi.Price, quantity: 1 }] };
        });
    }
    function removeItem(id) { setNf(f => ({ ...f, items: f.items.filter(i => i.Menu_Item_ID !== id) })); }
    function setQty(id, q) { setNf(f => ({ ...f, items: f.items.map(i => i.Menu_Item_ID === id ? { ...i, quantity: Math.max(1, parseInt(q) || 1) } : i) })); }

    const subtotal = nf.items.reduce((s, i) => s + i.price * i.quantity, 0);

    async function handleCreateOrder() {
        if (!nf.Customer_ID || !nf.Cafeteria_ID || !nf.Counter_ID || !nf.Employee_ID) return toast.error('All fields required');
        if (!nf.items.length) return toast.error('Add at least one menu item');
        setSaving(true);
        try {
            const r = await createOrder({ ...nf, offer_id: nf.offer_id || undefined });
            toast.success(`Order #${r.Order_ID} created! Total: ₹${r.Total_Amount}`);
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function changeStatus(id, status) {
        try {
            await updateOrderStatus(id, status);
            toast.success(`Status → ${status}`);
            load();
            if (modal === 'detail') openDetail(id);
        } catch (e) { toast.error(e.message); }
    }

    const pages = Math.ceil(total / LIMIT);

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Order Management</div>
                    <div className="section-subtitle">MySQL Table: ORDERS JOIN CUSTOMER, CAFETERIA, COUNTER, EMPLOYEE · {total} records</div>
                </div>
                <button className="btn btn-primary" onClick={openNewOrder}><Plus size={16} /> New Order</button>
            </div>

            <div className="page-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input className="form-control" placeholder="Search order ID, customer…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="form-control" style={{ width: 140 }} value={stF} onChange={e => { setStF(e.target.value); setPage(1); }}>
                    <option value="">All Status</option>
                    {['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-control" style={{ width: 140 }} value={payF} onChange={e => { setPayF(e.target.value); setPage(1); }}>
                    <option value="">Payment Status</option>
                    <option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="refunded">Refunded</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? <div className="loader"><div className="spinner" /></div> : (
                    <>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr><th>#</th><th>Customer</th><th>Cafeteria</th><th>Type</th><th>Status</th><th>Payment</th><th>Total</th><th>Date</th><th>Actions</th></tr>
                                </thead>
                                <tbody>
                                    {data.map(o => (
                                        <tr key={o.Order_ID}>
                                            <td><strong>#{o.Order_ID}</strong></td>
                                            <td><strong>{o.Customer_Name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.Phone}</div></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{o.Cafeteria_Name}</td>
                                            <td><span className="badge badge-gray">{o.Order_Type?.replace('_', ' ')}</span></td>
                                            <td><StatusBadge s={o.Order_Status} /></td>
                                            <td><PayBadge s={o.Payment_Status} /></td>
                                            <td><strong>₹{parseFloat(o.Total_Amount).toFixed(2)}</strong></td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(o.Order_DateTime).toLocaleString()}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openDetail(o.Order_ID)}><Eye size={14} /></button>
                                                    {o.Order_Status !== 'delivered' && o.Order_Status !== 'cancelled' && (
                                                        <button className="btn btn-secondary btn-sm" onClick={() => {
                                                            const next = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered' }[o.Order_Status];
                                                            if (next) changeStatus(o.Order_ID, next);
                                                        }}>
                                                            <CheckCircle size={13} /> Advance
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!data.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No orders found</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="pagination">
                            <div className="pagination-info">Showing {data.length} of {total}</div>
                            <div className="pagination-btns">
                                <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                                {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`pagination-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                ))}
                                <button className="pagination-btn" disabled={page === pages || !pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* New Order Modal */}
            <Modal show={modal === 'new'} onClose={() => setModal(null)} title="Create New Order" lg>
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Customer</label>
                            <select className="form-control" value={nf.Customer_ID} onChange={e => setNf(f => ({ ...f, Customer_ID: e.target.value }))}>
                                <option value="">Select customer…</option>
                                {customers.map(c => <option key={c.Customer_ID} value={c.Customer_ID}>{c.Full_Name} ({c.Customer_Type})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Cafeteria</label>
                            <select className="form-control" value={nf.Cafeteria_ID} onChange={e => setNf(f => ({ ...f, Cafeteria_ID: e.target.value }))}>
                                <option value="">Select cafeteria…</option>
                                {cafes.map(c => <option key={c.Cafeteria_ID} value={c.Cafeteria_ID}>{c.Cafeteria_Name}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Counter</label>
                            <select className="form-control" value={nf.Counter_ID} onChange={e => setNf(f => ({ ...f, Counter_ID: e.target.value }))}>
                                <option value="">Select counter…</option>
                                {counters.map(c => <option key={c.Counter_ID} value={c.Counter_ID}>{c.Counter_Name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Employee</label>
                            <select className="form-control" value={nf.Employee_ID} onChange={e => setNf(f => ({ ...f, Employee_ID: e.target.value }))}>
                                <option value="">Select employee…</option>
                                {employees.map(e => <option key={e.Employee_ID} value={e.Employee_ID}>{e.Employee_Name} ({e.Role})</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Order Type</label>
                            <select className="form-control" value={nf.Order_Type} onChange={e => setNf(f => ({ ...f, Order_Type: e.target.value }))}>
                                <option value="dine_in">Dine In</option><option value="takeaway">Takeaway</option><option value="online">Online</option>
                            </select>
                        </div>
                    </div>

                    <div className="divider" />

                    <div className="form-group">
                        <label className="form-label">Add Menu Item</label>
                        <select className="form-control" onChange={e => { if (e.target.value) { addItem(e.target.value); e.target.value = ''; } }} defaultValue="">
                            <option value="">-- Select item to add --</option>
                            {menuItems.map(m => <option key={m.Menu_Item_ID} value={m.Menu_Item_ID}>{m.Item_Name} – ₹{m.Price}</option>)}
                        </select>
                    </div>

                    {nf.items.length > 0 && (
                        <div style={{ background: 'var(--bg-overlay)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 12 }}>
                            <table style={{ width: '100%', fontSize: 13 }}>
                                <thead><tr>
                                    <th style={{ textAlign: 'left', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>Item</th>
                                    <th style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>Qty</th>
                                    <th style={{ textAlign: 'right', color: 'var(--text-muted)', padding: '4px 8px', fontWeight: 600 }}>Subtotal</th>
                                    <th></th>
                                </tr></thead>
                                <tbody>
                                    {nf.items.map(i => (
                                        <tr key={i.Menu_Item_ID}>
                                            <td style={{ padding: '4px 8px', color: 'var(--text-primary)' }}>{i.name}</td>
                                            <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                                                <input type="number" min="1" value={i.quantity} onChange={e => setQty(i.Menu_Item_ID, e.target.value)}
                                                    style={{ width: 56, padding: '3px 6px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', textAlign: 'center' }} />
                                            </td>
                                            <td style={{ padding: '4px 8px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>₹{(i.price * i.quantity).toFixed(2)}</td>
                                            <td style={{ padding: '4px 8px' }}>
                                                <button onClick={() => removeItem(i.Menu_Item_ID)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}>✕</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="divider" />
                            <div style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)', fontSize: 15 }}>Subtotal: ₹{subtotal.toFixed(2)}</div>
                        </div>
                    )}

                    {offers.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Apply Offer (optional)</label>
                            <select className="form-control" value={nf.offer_id} onChange={e => setNf(f => ({ ...f, offer_id: e.target.value }))}>
                                <option value="">No offer</option>
                                {offers.map(o => <option key={o.Offer_ID} value={o.Offer_ID}>{o.Offer_Code} – {o.Offer_Name} ({o.Discount_Type === 'percentage' ? o.Discount_Value + '%' : '₹' + o.Discount_Value} off, min ₹{o.Min_Order_Value})</option>)}
                            </select>
                        </div>
                    )}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleCreateOrder} disabled={saving}>{saving ? 'Creating…' : 'Create Order'}</button>
                </div>
            </Modal>

            {/* Order Detail Modal */}
            <Modal show={modal === 'detail'} onClose={() => setModal(null)} title={`Order #${detail?.order?.Order_ID || ''} Details`} lg>
                {detail && (
                    <>
                        <div className="modal-body">
                            <div className="grid-2" style={{ marginBottom: 16 }}>
                                <div>
                                    {[['Customer', detail.order.Customer_Name], ['Phone', detail.order.Phone], ['Cafeteria', detail.order.Cafeteria_Name], ['Counter', detail.order.Counter_Name], ['Employee', detail.order.Employee_Name]].map(([l, v]) => (
                                        <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-value">{v}</span></div>
                                    ))}
                                </div>
                                <div>
                                    {[['Order Type', detail.order.Order_Type?.replace('_', ' ')], ['Status', detail.order.Order_Status], ['Payment', detail.order.Payment_Status], ['Subtotal', '₹' + parseFloat(detail.order.Subtotal).toFixed(2)], ['Tax', '₹' + parseFloat(detail.order.Tax_Amount).toFixed(2)], ['Discount', '₹' + parseFloat(detail.order.Discount_Amount).toFixed(2)], ['TOTAL', '₹' + parseFloat(detail.order.Total_Amount).toFixed(2)]].map(([l, v]) => (
                                        <div key={l} className="detail-row"><span className="detail-label">{l}</span><span className="detail-value" style={l === 'TOTAL' ? { color: 'var(--primary)', fontWeight: 800, fontSize: 16 } : {}}>{v}</span></div>
                                    ))}
                                </div>
                            </div>

                            <div className="card-title" style={{ marginBottom: 10 }}>Order Items</div>
                            <table className="table">
                                <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Unit Price</th><th>Tax</th><th>Line Total</th></tr></thead>
                                <tbody>
                                    {detail.items.map(i => (
                                        <tr key={i.Order_Item_ID}>
                                            <td><strong>{i.Item_Name}</strong></td>
                                            <td><span className="badge badge-blue">{i.Category_Name}</span></td>
                                            <td>{i.Quantity}</td>
                                            <td>₹{parseFloat(i.Unit_Price).toFixed(2)}</td>
                                            <td>{i.Tax_Rate}%</td>
                                            <td><strong>₹{parseFloat(i.Line_Total).toFixed(2)}</strong></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {detail.payment && (
                                <div style={{ marginTop: 16 }}>
                                    <div className="card-title" style={{ marginBottom: 8 }}>Payment Record</div>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13 }}>
                                        {[['Method', detail.payment.Payment_Method], ['Amount', '₹' + parseFloat(detail.payment.Amount).toFixed(2)], ['Status', detail.payment.Payment_Status], ['Ref', detail.payment.Transaction_Ref || 'N/A']].map(([l, v]) => (
                                            <div key={l}><span style={{ color: 'var(--text-muted)' }}>{l}: </span><strong>{v}</strong></div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detail.offer && (
                                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                    🎟️ Offer Applied: <strong>{detail.offer.Offer_Code} – {detail.offer.Offer_Name}</strong> · Discount: <strong>₹{parseFloat(detail.offer.Applied_Discount).toFixed(2)}</strong>
                                </div>
                            )}

                            {detail.feedback && (
                                <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                    ⭐ Feedback: {'★'.repeat(detail.feedback.Rating) + ' – ' + detail.feedback.Feedback_Category} · {detail.feedback.Comments || 'No comments'}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
                            {detail.order.Order_Status !== 'delivered' && detail.order.Order_Status !== 'cancelled' && (
                                <button className="btn btn-primary" onClick={() => {
                                    const next = { pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'delivered' }[detail.order.Order_Status];
                                    if (next) changeStatus(detail.order.Order_ID, next);
                                }}>Advance Status</button>
                            )}
                            {detail.order.Order_Status === 'pending' && (
                                <button className="btn btn-danger" onClick={() => changeStatus(detail.order.Order_ID, 'cancelled')}>Cancel Order</button>
                            )}
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
