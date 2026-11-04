import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { getPayments, createPayment, getPaymentSummary } from '../services/api';
import toast from 'react-hot-toast';

function Modal({ show, onClose, title, children }) {
    if (!show) return null;
    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header">
                    <span className="modal-title">{title}</span>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function Payments() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [mF, setMF] = useState('');
    const [modal, setModal] = useState(false);
    const [form, setForm] = useState({ Order_ID: '', Payment_Method: 'cash', Amount: '', Transaction_Ref: '' });
    const [saving, setSaving] = useState(false);
    const LIMIT = 15;

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            getPayments({ search, method: mF, page, limit: LIMIT }),
            getPaymentSummary()
        ]).then(([p, s]) => { setData(p.data); setTotal(p.total); setSummary(s); })
            .catch(() => toast.error('Failed to load payments')).finally(() => setLoading(false));
    }, [search, mF, page]);

    useEffect(() => { load(); }, [load]);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    async function handlePay() {
        if (!form.Order_ID || !form.Amount) return toast.error('Order ID and Amount are required');
        setSaving(true);
        try {
            await createPayment(form);
            toast.success('Payment recorded!');
            setModal(false); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    const pages = Math.ceil(total / LIMIT);
    const fmtRs = v => '₹' + parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    const METHOD_COLORS = { cash: 'badge-green', upi: 'badge-blue', card: 'badge-purple', wallet: 'badge-orange', online: 'badge-yellow' };

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Payment Management</div>
                    <div className="section-subtitle">MySQL Table: PAYMENT JOIN ORDERS, CUSTOMER · {total} records</div>
                </div>
                <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={16} /> Record Payment</button>
            </div>

            {summary && (
                <div className="stat-grid" style={{ marginBottom: 20 }}>
                    <div className="stat-card">
                        <div className="stat-icon green">💰</div>
                        <div className="stat-label">Total Collected</div>
                        <div className="stat-value">{fmtRs(summary.totals?.total_collected)}</div>
                    </div>
                    <div className="stat-card blue">
                        <div className="stat-icon blue">🔢</div>
                        <div className="stat-label">Total Transactions</div>
                        <div className="stat-value">{summary.totals?.total_txn || 0}</div>
                    </div>
                    {summary.byMethod?.map(m => (
                        <div key={m.Payment_Method} className="stat-card">
                            <div className="stat-icon orange">{m.Payment_Method === 'cash' ? '💵' : m.Payment_Method === 'upi' ? '📱' : m.Payment_Method === 'card' ? '💳' : '🔁'}</div>
                            <div className="stat-label">{m.Payment_Method.toUpperCase()}</div>
                            <div className="stat-value">{fmtRs(m.total)}</div>
                        </div>
                    ))}
                </div>
            )}

            <div className="page-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input className="form-control" placeholder="Search customer, ref…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="form-control" style={{ width: 140 }} value={mF} onChange={e => { setMF(e.target.value); setPage(1); }}>
                    <option value="">All Methods</option>
                    {['cash', 'upi', 'card', 'wallet', 'online'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                </select>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? <div className="loader"><div className="spinner" /></div> : (
                    <>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead><tr><th>#Pay</th><th>Order #</th><th>Customer</th><th>Method</th><th>Amount</th><th>Status</th><th>Ref</th><th>Date</th></tr></thead>
                                <tbody>
                                    {data.map(p => (
                                        <tr key={p.Payment_ID}>
                                            <td><strong>#{p.Payment_ID}</strong></td>
                                            <td><span className="chip">#{p.Order_ID}</span></td>
                                            <td><strong>{p.Customer_Name}</strong></td>
                                            <td><span className={`badge ${METHOD_COLORS[p.Payment_Method] || 'badge-gray'}`}>{p.Payment_Method?.toUpperCase()}</span></td>
                                            <td><strong style={{ color: 'var(--success)' }}>{fmtRs(p.Amount)}</strong></td>
                                            <td><span className={`badge ${p.Payment_Status === 'completed' ? 'badge-green' : p.Payment_Status === 'failed' ? 'badge-red' : 'badge-yellow'}`}>{p.Payment_Status}</span></td>
                                            <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--text-muted)' }}>{p.Transaction_Ref || '—'}</td>
                                            <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(p.Payment_DateTime).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    {!data.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No payment records found</td></tr>}
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

            <Modal show={modal} onClose={() => setModal(false)} title="Record Payment">
                <div className="modal-body">
                    <div className="form-group">
                        <label className="form-label required">Order ID</label>
                        <input className="form-control" type="number" value={form.Order_ID} onChange={e => set('Order_ID', e.target.value)} placeholder="e.g. 9" />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Payment Method</label>
                        <select className="form-control" value={form.Payment_Method} onChange={e => set('Payment_Method', e.target.value)}>
                            {['cash', 'upi', 'card', 'wallet', 'online'].map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Amount (₹)</label>
                        <input className="form-control" type="number" min="0" step="0.01" value={form.Amount} onChange={e => set('Amount', e.target.value)} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Transaction Reference</label>
                        <input className="form-control" value={form.Transaction_Ref} onChange={e => set('Transaction_Ref', e.target.value)} placeholder="UPI/Card ref (optional)" />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                    <button className="btn btn-success" onClick={handlePay} disabled={saving}>{saving ? 'Processing…' : 'Record Payment'}</button>
                </div>
            </Modal>
        </div>
    );
}
