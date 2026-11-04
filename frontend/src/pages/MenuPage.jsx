import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { getMenuItems, getCategories, createMenuItem, updateMenuItem, deleteMenuItem } from '../services/api';
import toast from 'react-hot-toast';

function AvailBadge({ status }) {
    const m = { available: 'badge-green', unavailable: 'badge-red', seasonal: 'badge-yellow' };
    return <span className={`badge ${m[status] || 'badge-gray'}`}>{status}</span>;
}

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

const EMPTY = { Category_ID: '', Item_Code: '', Item_Name: '', Description: '', Price: '', Prep_Time_Min: '5', Availability_Status: 'available', Tax_Rate: '5.00' };

export default function MenuPage() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [cats, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [catF, setCatF] = useState('');
    const [stF, setStF] = useState('');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState(EMPTY);
    const [saving, setSaving] = useState(false);

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            getMenuItems({ search, category: catF, status: stF }),
            getCategories()
        ]).then(([menu, categories]) => {
            setData(menu.data); setTotal(menu.total); setCats(categories);
        }).catch(() => toast.error('Failed to load menu')).finally(() => setLoading(false));
    }, [search, catF, stF]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setForm(EMPTY); setSelected(null); setModal('form'); };
    const openEdit = (row) => {
        setForm({
            Category_ID: row.Category_ID, Item_Code: row.Item_Code, Item_Name: row.Item_Name,
            Description: row.Description || '', Price: row.Price, Prep_Time_Min: row.Prep_Time_Min,
            Availability_Status: row.Availability_Status, Tax_Rate: row.Tax_Rate
        });
        setSelected(row); setModal('form');
    };

    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    async function handleSave() {
        if (!form.Category_ID || !form.Item_Code || !form.Item_Name || !form.Price)
            return toast.error('Category, Code, Name, and Price are required');
        setSaving(true);
        try {
            if (selected) {
                await updateMenuItem(selected.Menu_Item_ID, form);
                toast.success('Menu item updated!');
            } else {
                await createMenuItem(form);
                toast.success('Menu item added!');
            }
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete or mark this item unavailable?')) return;
        try {
            const r = await deleteMenuItem(id);
            toast.success(r.message); load();
        } catch (e) { toast.error(e.message); }
    }

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Menu Management</div>
                    <div className="section-subtitle">MySQL Table: MENU_ITEM JOIN CATEGORY · {total} items</div>
                </div>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Menu Item</button>
            </div>

            <div className="page-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input className="form-control" placeholder="Search item name or code…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 160 }} value={catF} onChange={e => setCatF(e.target.value)}>
                    <option value="">All Categories</option>
                    {cats.map(c => <option key={c.Category_ID} value={c.Category_ID}>{c.Category_Name}</option>)}
                </select>
                <select className="form-control" style={{ width: 140 }} value={stF} onChange={e => setStF(e.target.value)}>
                    <option value="">All Status</option>
                    <option value="available">Available</option>
                    <option value="unavailable">Unavailable</option>
                    <option value="seasonal">Seasonal</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? <div className="loader"><div className="spinner" /></div> : (
                    <div className="table-wrapper" style={{ border: 'none' }}>
                        <table className="table">
                            <thead>
                                <tr><th>Code</th><th>Name</th><th>Category</th><th>Price</th><th>Tax</th><th>Prep Time</th><th>Ingredients</th><th>Status</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {data.map(item => (
                                    <tr key={item.Menu_Item_ID}>
                                        <td><span className="chip">{item.Item_Code}</span></td>
                                        <td><strong>{item.Item_Name}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.Description?.slice(0, 50)}</div></td>
                                        <td><span className="badge badge-blue">{item.Category_Name}</span></td>
                                        <td><strong>₹{parseFloat(item.Price).toFixed(2)}</strong></td>
                                        <td style={{ color: 'var(--text-muted)' }}>{item.Tax_Rate}%</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{item.Prep_Time_Min} min</td>
                                        <td style={{ color: 'var(--text-muted)' }}>{item.ingredient_count} items</td>
                                        <td><AvailBadge status={item.Availability_Status} /></td>
                                        <td>
                                            <div style={{ display: 'flex', gap: 6 }}>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(item)}><Edit2 size={14} /></button>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(item.Menu_Item_ID)} style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {!data.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No menu items found</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Modal show={modal === 'form'} onClose={() => setModal(null)} title={selected ? 'Edit Menu Item' : 'Add Menu Item'}>
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Category</label>
                            <select className="form-control" value={form.Category_ID} onChange={e => set('Category_ID', e.target.value)}>
                                <option value="">Select…</option>
                                {cats.map(c => <option key={c.Category_ID} value={c.Category_ID}>{c.Category_Name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label required">Item Code</label>
                            <input className="form-control" value={form.Item_Code} onChange={e => set('Item_Code', e.target.value)} placeholder="SI001" />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Item Name</label>
                        <input className="form-control" value={form.Item_Name} onChange={e => set('Item_Name', e.target.value)} placeholder="Masala Dosa" />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows={2} value={form.Description} onChange={e => set('Description', e.target.value)} placeholder="Short description…" />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label required">Price (₹)</label>
                            <input className="form-control" type="number" min="0" step="0.50" value={form.Price} onChange={e => set('Price', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tax Rate (%)</label>
                            <input className="form-control" type="number" min="0" max="100" value={form.Tax_Rate} onChange={e => set('Tax_Rate', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Prep Time (min)</label>
                            <input className="form-control" type="number" min="1" value={form.Prep_Time_Min} onChange={e => set('Prep_Time_Min', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Availability</label>
                        <select className="form-control" value={form.Availability_Status} onChange={e => set('Availability_Status', e.target.value)}>
                            <option value="available">Available</option>
                            <option value="unavailable">Unavailable</option>
                            <option value="seasonal">Seasonal</option>
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button>
                </div>
            </Modal>
        </div>
    );
}
