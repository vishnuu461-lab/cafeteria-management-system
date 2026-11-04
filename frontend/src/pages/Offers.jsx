import React, { useEffect, useState } from 'react';
import { Plus, Edit2, X, Star } from 'lucide-react';
import { getOffers, createOffer, updateOffer, deactivateOffer, getFeedback } from '../services/api';
import toast from 'react-hot-toast';

function Modal({ show, onClose, title, children }) {
    if (!show) return null;
    return (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <div className="modal-header"><span className="modal-title">{title}</span>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button></div>
                {children}
            </div>
        </div>
    );
}

const EMPTY = { Offer_Code: '', Offer_Name: '', Discount_Type: 'percentage', Discount_Value: '', Min_Order_Value: '0', Valid_From: '', Valid_To: '', Offer_Status: 'active' };

export default function Offers() {
    const [offers, setOffers] = useState([]);
    const [feedback, setFeedback] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('offers');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        Promise.all([getOffers(), getFeedback()])
            .then(([o, f]) => { setOffers(o); setFeedback(f); })
            .catch(() => toast.error('Failed to load'))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    async function handleSave() {
        if (!form.Offer_Code || !form.Offer_Name || !form.Discount_Value || !form.Valid_From || !form.Valid_To)
            return toast.error('All required fields must be filled');
        setSaving(true);
        try {
            if (selected) { await updateOffer(selected.Offer_ID, form); toast.success('Offer updated!'); }
            else { await createOffer(form); toast.success('Offer created!'); }
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleDeactivate(id) {
        if (!confirm('Deactivate this offer?')) return;
        try { await deactivateOffer(id); toast.success('Offer deactivated'); load(); }
        catch (e) { toast.error(e.message); }
    }

    const OFFER_FIELDS = [
        ['Offer_Code', 'Offer Code', 'e.g. SUMMER20'], ['Offer_Name', 'Offer Name', 'Summer 20% Off'],
    ];

    const avgRating = feedback.length ? (feedback.reduce((s, f) => s + f.Rating, 0) / feedback.length).toFixed(1) : '—';

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Offers & Feedback</div>
                    <div className="section-subtitle">OFFER, ORDER_OFFER, FEEDBACK tables · {offers.length} offers · {feedback.length} feedback records</div>
                </div>
                {tab === 'offers' && (
                    <button className="btn btn-primary" onClick={() => { setForm(EMPTY); setSelected(null); setModal('form'); }}>
                        <Plus size={16} /> Add Offer
                    </button>
                )}
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {['offers', 'feedback'].map(t => (
                    <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(t)}>
                        {t === 'offers' ? '🎟️ Offers' : '⭐ Feedback'}
                    </button>
                ))}
            </div>

            {loading ? <div className="loader"><div className="spinner" /></div> : (
                tab === 'offers' ? (
                    <div className="card" style={{ padding: 0 }}>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Value</th><th>Min Order</th><th>Valid From</th><th>Valid To</th><th>Used</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {offers.map(o => (
                                        <tr key={o.Offer_ID}>
                                            <td><strong style={{ color: 'var(--primary)' }}>{o.Offer_Code}</strong></td>
                                            <td>{o.Offer_Name}</td>
                                            <td><span className="badge badge-blue">{o.Discount_Type}</span></td>
                                            <td><strong>{o.Discount_Type === 'percentage' ? o.Discount_Value + '%' : '₹' + o.Discount_Value}</strong></td>
                                            <td>₹{o.Min_Order_Value}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.Valid_From}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{o.Valid_To}</td>
                                            <td>{o.times_used} times · ₹{parseFloat(o.total_discount_given || 0).toFixed(0)} saved</td>
                                            <td><span className={`badge ${o.Offer_Status === 'active' ? 'badge-green' : o.Offer_Status === 'expired' ? 'badge-gray' : 'badge-red'}`}>{o.Offer_Status}</span></td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setForm({ Offer_Code: o.Offer_Code, Offer_Name: o.Offer_Name, Discount_Type: o.Discount_Type, Discount_Value: o.Discount_Value, Min_Order_Value: o.Min_Order_Value, Valid_From: o.Valid_From, Valid_To: o.Valid_To, Offer_Status: o.Offer_Status }); setSelected(o); setModal('form'); }}>
                                                        <Edit2 size={14} />
                                                    </button>
                                                    {o.Offer_Status === 'active' && <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDeactivate(o.Offer_ID)} style={{ color: 'var(--danger)' }}>✕</button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!offers.length && <tr><td colSpan={10} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No offers yet</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <>
                        <div style={{ background: 'linear-gradient(135deg,rgba(245,158,11,0.12),rgba(249,115,22,0.06))', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16 }}>
                            <Star size={32} style={{ color: '#f59e0b' }} />
                            <div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#f59e0b' }}>{avgRating} / 5</div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Average rating from {feedback.length} reviews · FEEDBACK JOIN CUSTOMER, ORDERS, CAFETERIA</div>
                            </div>
                        </div>
                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-wrapper" style={{ border: 'none' }}>
                                <table className="table">
                                    <thead><tr><th>Order #</th><th>Customer</th><th>Cafeteria</th><th>Rating</th><th>Category</th><th>Comments</th><th>Date</th></tr></thead>
                                    <tbody>
                                        {feedback.map(f => (
                                            <tr key={f.Feedback_ID}>
                                                <td><span className="chip">#{f.Order_ID}</span></td>
                                                <td><strong>{f.Customer_Name}</strong></td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.Cafeteria_Name}</td>
                                                <td><span style={{ color: '#f59e0b', fontWeight: 700 }}>{'★'.repeat(f.Rating) + '☆'.repeat(5 - f.Rating)}</span></td>
                                                <td><span className="badge badge-blue">{f.Feedback_Category?.replace(/_/g, ' ')}</span></td>
                                                <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 200 }}>{f.Comments || '—'}</td>
                                                <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(f.Feedback_Date).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                        {!feedback.length && <tr><td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No feedback yet</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )
            )}

            <Modal show={modal === 'form'} onClose={() => setModal(null)} title={selected ? 'Edit Offer' : 'Create Offer'}>
                <div className="modal-body">
                    {OFFER_FIELDS.map(([key, label, placeholder]) => (
                        <div key={key} className="form-group"><label className="form-label required">{label}</label>
                            <input className="form-control" value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} />
                        </div>
                    ))}
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Discount Type</label>
                            <select className="form-control" value={form.Discount_Type} onChange={e => set('Discount_Type', e.target.value)}>
                                <option value="percentage">Percentage (%)</option><option value="flat">Flat (₹)</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label required">Discount Value</label>
                            <input className="form-control" type="number" min="0" value={form.Discount_Value} onChange={e => set('Discount_Value', e.target.value)} placeholder={form.Discount_Type === 'percentage' ? '10' : '50'} />
                        </div>
                        <div className="form-group"><label className="form-label">Min Order (₹)</label>
                            <input className="form-control" type="number" min="0" value={form.Min_Order_Value} onChange={e => set('Min_Order_Value', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Valid From</label>
                            <input className="form-control" type="date" value={form.Valid_From} onChange={e => set('Valid_From', e.target.value)} />
                        </div>
                        <div className="form-group"><label className="form-label required">Valid To</label>
                            <input className="form-control" type="date" value={form.Valid_To} onChange={e => set('Valid_To', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group"><label className="form-label">Status</label>
                        <select className="form-control" value={form.Offer_Status} onChange={e => set('Offer_Status', e.target.value)}>
                            <option value="active">Active</option><option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Offer'}</button>
                </div>
            </Modal>
        </div>
    );
}
