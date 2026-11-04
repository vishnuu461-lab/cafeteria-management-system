import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, Trash2, Eye, X } from 'lucide-react';
import { getCustomers, createCustomer, updateCustomer, deleteCustomer } from '../services/api';
import toast from 'react-hot-toast';

const EMPTY = { Full_Name: '', Phone: '', Email: '', Customer_Type: 'student', Account_Status: 'active' };

function Badge({ status }) {
    const map = { active: 'badge-green', suspended: 'badge-red', inactive: 'badge-gray' };
    return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

function TypeBadge({ type }) {
    const map = { student: 'badge-blue', faculty: 'badge-purple', staff: 'badge-orange', visitor: 'badge-gray' };
    return <span className={`badge ${map[type] || 'badge-gray'}`}>{type}</span>;
}

function Modal({ show, title, onClose, children }) {
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

function CustomerForm({ initial, onSave, onClose, saving }) {
    const [form, setForm] = useState(initial || EMPTY);
    const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

    return (
        <>
            <div className="modal-body">
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label required">Full Name</label>
                        <input className="form-control" value={form.Full_Name} onChange={e => set('Full_Name', e.target.value)} placeholder="Arjun Sharma" />
                    </div>
                    <div className="form-group">
                        <label className="form-label required">Phone</label>
                        <input className="form-control" value={form.Phone} onChange={e => set('Phone', e.target.value)} placeholder="9876543210" />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={form.Email} onChange={e => set('Email', e.target.value)} placeholder="name@jklu.edu.in" />
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Customer Type</label>
                        <select className="form-control" value={form.Customer_Type} onChange={e => set('Customer_Type', e.target.value)}>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="staff">Staff</option>
                            <option value="visitor">Visitor</option>
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="form-label">Account Status</label>
                        <select className="form-control" value={form.Account_Status} onChange={e => set('Account_Status', e.target.value)}>
                            <option value="active">Active</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>
            <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving}>
                    {saving ? 'Saving…' : 'Save Customer'}
                </button>
            </div>
        </>
    );
}

export default function Customers() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [typeF, setTypeF] = useState('');
    const [statusF, setStatusF] = useState('');
    const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);
    const LIMIT = 15;

    const load = useCallback(() => {
        setLoading(true);
        getCustomers({ search, type: typeF, status: statusF, page, limit: LIMIT })
            .then(r => { setData(r.data); setTotal(r.total); })
            .catch(() => toast.error('Failed to load customers'))
            .finally(() => setLoading(false));
    }, [search, typeF, statusF, page]);

    useEffect(() => { load(); }, [load]);

    const openAdd = () => { setSelected(null); setModal('add'); };
    const openEdit = (row) => { setSelected(row); setModal('edit'); };
    const openView = (row) => { setSelected(row); setModal('view'); };

    async function handleSave(form) {
        if (!form.Full_Name || !form.Phone) return toast.error('Name and Phone are required');
        setSaving(true);
        try {
            if (modal === 'add') {
                await createCustomer(form);
                toast.success('Customer added!');
            } else {
                await updateCustomer(selected.Customer_ID, form);
                toast.success('Customer updated!');
            }
            setModal(null);
            load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete or deactivate this customer?')) return;
        try {
            const r = await deleteCustomer(id);
            toast.success(r.message);
            load();
        } catch (e) { toast.error(e.message); }
    }

    const pages = Math.ceil(total / LIMIT);

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Customer Management</div>
                    <div className="section-subtitle">MySQL Table: CUSTOMER · {total} records</div>
                </div>
                <button className="btn btn-primary" onClick={openAdd}><Plus size={16} /> Add Customer</button>
            </div>

            <div className="page-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input className="form-control" placeholder="Search name, phone, email…"
                        value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <select className="form-control" style={{ width: 140 }} value={typeF} onChange={e => { setTypeF(e.target.value); setPage(1); }}>
                    <option value="">All Types</option>
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="staff">Staff</option>
                    <option value="visitor">Visitor</option>
                </select>
                <select className="form-control" style={{ width: 140 }} value={statusF} onChange={e => { setStatusF(e.target.value); setPage(1); }}>
                    <option value="">All Status</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div className="loader"><div className="spinner" /></div>
                ) : (
                    <>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>ID</th><th>Name</th><th>Phone</th><th>Email</th>
                                        <th>Type</th><th>Status</th><th>Orders</th><th>Spent</th><th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.map(c => (
                                        <tr key={c.Customer_ID}>
                                            <td><strong>#{c.Customer_ID}</strong></td>
                                            <td><strong>{c.Full_Name}</strong></td>
                                            <td style={{ fontFamily: 'monospace' }}>{c.Phone}</td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.Email || '—'}</td>
                                            <td><TypeBadge type={c.Customer_Type} /></td>
                                            <td><Badge status={c.Account_Status} /></td>
                                            <td>{c.total_orders}</td>
                                            <td>₹{parseFloat(c.total_spent || 0).toFixed(0)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openView(c)} title="View"><Eye size={14} /></button>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => openEdit(c)} title="Edit"><Edit2 size={14} /></button>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => handleDelete(c.Customer_ID)} title="Delete"
                                                        style={{ color: 'var(--danger)' }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {!data.length && (
                                        <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No customers found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="pagination">
                            <div className="pagination-info">Showing {data.length} of {total} customers</div>
                            <div className="pagination-btns">
                                <button className="pagination-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                                {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
                                    <button key={p} className={`pagination-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                                ))}
                                <button className="pagination-btn" disabled={page === pages || !pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Add / Edit Modal */}
            <Modal show={modal === 'add' || modal === 'edit'} title={modal === 'add' ? 'Add New Customer' : 'Edit Customer'} onClose={() => setModal(null)}>
                <CustomerForm initial={modal === 'edit' ? selected : null} onSave={handleSave} onClose={() => setModal(null)} saving={saving} />
            </Modal>

            {/* View Modal */}
            <Modal show={modal === 'view'} title="Customer Details" onClose={() => setModal(null)}>
                {selected && (
                    <>
                        <div className="modal-body">
                            {[
                                ['Customer ID', '#' + selected.Customer_ID],
                                ['Full Name', selected.Full_Name],
                                ['Phone', selected.Phone],
                                ['Email', selected.Email || 'Not provided'],
                                ['Customer Type', selected.Customer_Type],
                                ['Account Status', selected.Account_Status],
                                ['Total Orders', selected.total_orders],
                                ['Total Spent', '₹' + parseFloat(selected.total_spent || 0).toFixed(2)],
                                ['Registered At', new Date(selected.Created_At).toLocaleString()],
                            ].map(([l, v]) => (
                                <div key={l} className="detail-row">
                                    <span className="detail-label">{l}</span>
                                    <span className="detail-value">{v}</span>
                                </div>
                            ))}
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setModal(null)}>Close</button>
                            <button className="btn btn-primary" onClick={() => setModal('edit')}>Edit</button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
}
