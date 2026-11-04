import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../services/api';
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

export default function Categories() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [form, setForm] = useState({ Category_Name: '', Category_Status: 'active' });
    const [saving, setSaving] = useState(false);

    const load = () => {
        setLoading(true);
        getCategories().then(setData).catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    async function handleSave() {
        if (!form.Category_Name) return toast.error('Category name required');
        setSaving(true);
        try {
            if (selected) { await updateCategory(selected.Category_ID, form); toast.success('Updated!'); }
            else { await createCategory(form); toast.success('Category added!'); }
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this category?')) return;
        try { await deleteCategory(id); toast.success('Deleted!'); load(); }
        catch (e) { toast.error(e.message); }
    }

    const totalItems = data.reduce((s, c) => s + (c.item_count || 0), 0);

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div><div className="section-title">Category Management</div>
                    <div className="section-subtitle">CATEGORY table · {data.length} categories · {totalItems} menu items total</div></div>
                <button className="btn btn-primary" onClick={() => { setForm({ Category_Name: '', Category_Status: 'active' }); setSelected(null); setModal('form'); }}>
                    <Plus size={16} /> Add Category
                </button>
            </div>

            {loading ? <div className="loader"><div className="spinner" /></div> : (
                <div className="grid-3">
                    {data.map(cat => (
                        <div key={cat.Category_ID} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'var(--grad-primary)' }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{cat.Category_Name}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>ID: {cat.Category_ID}</div>
                                </div>
                                <span className={`badge ${cat.Category_Status === 'active' ? 'badge-green' : 'badge-gray'}`}>{cat.Category_Status}</span>
                            </div>
                            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', marginBottom: 4 }}>{cat.item_count || 0}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>menu items linked via FK</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ Category_Name: cat.Category_Name, Category_Status: cat.Category_Status }); setSelected(cat); setModal('form'); }}>
                                    <Edit2 size={13} /> Edit
                                </button>
                                {cat.item_count === 0 && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(cat.Category_ID)} style={{ color: 'var(--danger)' }}>
                                        <Trash2 size={13} /> Delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal show={modal === 'form'} onClose={() => setModal(null)} title={selected ? 'Edit Category' : 'Add Category'}>
                <div className="modal-body">
                    <div className="form-group"><label className="form-label required">Category Name</label>
                        <input className="form-control" value={form.Category_Name} onChange={e => setForm(f => ({ ...f, Category_Name: e.target.value }))} placeholder="e.g. Chinese" />
                    </div>
                    <div className="form-group"><label className="form-label">Status</label>
                        <select className="form-control" value={form.Category_Status} onChange={e => setForm(f => ({ ...f, Category_Status: e.target.value }))}>
                            <option value="active">Active</option><option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
            </Modal>
        </div>
    );
}
