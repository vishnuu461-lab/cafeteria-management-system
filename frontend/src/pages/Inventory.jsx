import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, Edit2, AlertTriangle, X, Package } from 'lucide-react';
import { getInventory, createInventoryItem, updateInventoryItem, recordStockTxn, getSuppliers, createSupplier, getEmployees } from '../services/api';
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

const EITEM = { Supplier_ID: '', Item_Code: '', Item_Name: '', Unit: 'kg', Current_Stock: '0', Reorder_Level: '0', Unit_Cost: '' };
const ETXN = { Inventory_Item_ID: '', Employee_ID: '', Supplier_ID: '', Txn_Type: 'purchase', Quantity: '', Unit_Cost: '', Remarks: '' };

export default function Inventory() {
    const [data, setData] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [lowF, setLowF] = useState(false);
    const [suppliers, setSuppliers] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [iForm, setIForm] = useState(EITEM);
    const [tForm, setTForm] = useState(ETXN);
    const [saving, setSaving] = useState(false);
    const LIMIT = 20;

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            getInventory({ search, low_stock: lowF ? 'true' : '', page, limit: LIMIT }),
            getSuppliers(), getEmployees({ status: 'active' })
        ]).then(([inv, sup, emp]) => { setData(inv.data); setTotal(inv.total); setSuppliers(sup); setEmployees(emp); })
            .catch(() => toast.error('Failed to load inventory')).finally(() => setLoading(false));
    }, [search, lowF, page]);

    useEffect(() => { load(); }, [load]);

    const setI = (k, v) => setIForm(f => ({ ...f, [k]: v }));
    const setT = (k, v) => setTForm(f => ({ ...f, [k]: v }));

    async function handleSaveItem() {
        if (!iForm.Item_Code || !iForm.Item_Name || !iForm.Unit_Cost) return toast.error('Code, Name, Unit Cost required');
        setSaving(true);
        try {
            if (selected) { await updateInventoryItem(selected.Inventory_Item_ID, iForm); toast.success('Item updated!'); }
            else { await createInventoryItem(iForm); toast.success('Item added!'); }
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleTxn() {
        if (!tForm.Inventory_Item_ID || !tForm.Employee_ID || !tForm.Quantity) return toast.error('Item, Employee, Quantity required');
        setSaving(true);
        try {
            await recordStockTxn(tForm);
            toast.success('Stock transaction recorded! Trigger updated stock level.');
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    const pages = Math.ceil(total / LIMIT);
    const lowCount = data.filter(i => i.is_low_stock).length;

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Inventory Management</div>
                    <div className="section-subtitle">INVENTORY_ITEM LEFT JOIN SUPPLIER · {total} items {lowCount > 0 && `· ⚠️ ${lowCount} low stock`}</div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-secondary" onClick={() => { setTForm(ETXN); setModal('txn') }}><Package size={15} /> Stock Transaction</button>
                    <button className="btn btn-primary" onClick={() => { setIForm(EITEM); setSelected(null); setModal('item') }}><Plus size={16} /> Add Item</button>
                </div>
            </div>

            <div className="page-toolbar">
                <div className="search-box"><Search size={16} />
                    <input className="form-control" placeholder="Search item name or code…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={lowF} onChange={e => setLowF(e.target.checked)} />
                    Show Low Stock Only
                </label>
            </div>

            <div className="card" style={{ padding: 0 }}>
                {loading ? <div className="loader"><div className="spinner" /></div> : (
                    <>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead><tr><th>Code</th><th>Item Name</th><th>Unit</th><th>Current Stock</th><th>Reorder Level</th><th>Unit Cost</th><th>Supplier</th><th>Status</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {data.map(i => (
                                        <tr key={i.Inventory_Item_ID} style={i.is_low_stock ? { background: 'rgba(239,68,68,0.04)' } : {}}>
                                            <td><span className="chip">{i.Item_Code}</span></td>
                                            <td>
                                                <strong>{i.Item_Name}</strong>
                                                {i.is_low_stock && <span title="Low stock!" style={{ marginLeft: 6, color: 'var(--danger)' }}>⚠️</span>}
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{i.Unit}</td>
                                            <td>
                                                <strong style={{ color: i.is_low_stock ? 'var(--danger)' : 'var(--success)' }}>{parseFloat(i.Current_Stock).toFixed(3)}</strong>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)' }}>{parseFloat(i.Reorder_Level).toFixed(3)}</td>
                                            <td>₹{parseFloat(i.Unit_Cost).toFixed(2)}</td>
                                            <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{i.Supplier_Name || '—'}</td>
                                            <td><span className={`badge ${i.Inventory_Status === 'active' ? 'badge-green' : 'badge-gray'}`}>{i.Inventory_Status}</span></td>
                                            <td>
                                                <button className="btn btn-ghost btn-icon btn-sm" onClick={() => {
                                                    setIForm({ Supplier_ID: i.Supplier_ID || '', Item_Code: i.Item_Code, Item_Name: i.Item_Name, Unit: i.Unit, Reorder_Level: i.Reorder_Level, Unit_Cost: i.Unit_Cost, Inventory_Status: i.Inventory_Status || 'active' });
                                                    setSelected(i); setModal('item');
                                                }}><Edit2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {!data.length && <tr><td colSpan={9} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No inventory items found</td></tr>}
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

            {/* Add/Edit Item Modal */}
            <Modal show={modal === 'item'} onClose={() => setModal(null)} title={selected ? 'Edit Inventory Item' : 'Add Inventory Item'}>
                <div className="modal-body">
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Item Code</label>
                            <input className="form-control" value={iForm.Item_Code} onChange={e => setI('Item_Code', e.target.value)} placeholder="INV020" />
                        </div>
                        <div className="form-group"><label className="form-label required">Item Name</label>
                            <input className="form-control" value={iForm.Item_Name} onChange={e => setI('Item_Name', e.target.value)} placeholder="Ghee" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Unit</label>
                            <select className="form-control" value={iForm.Unit} onChange={e => setI('Unit', e.target.value)}>
                                {['kg', 'g', 'litre', 'ml', 'piece', 'pack', 'box', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label required">Unit Cost (₹)</label>
                            <input className="form-control" type="number" min="0" value={iForm.Unit_Cost} onChange={e => setI('Unit_Cost', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Current Stock</label>
                            <input className="form-control" type="number" min="0" step="0.001" value={iForm.Current_Stock || 0} onChange={e => setI('Current_Stock', e.target.value)} />
                        </div>
                        <div className="form-group"><label className="form-label">Reorder Level</label>
                            <input className="form-control" type="number" min="0" step="0.001" value={iForm.Reorder_Level || 0} onChange={e => setI('Reorder_Level', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group"><label className="form-label">Supplier (optional)</label>
                        <select className="form-control" value={iForm.Supplier_ID || ''} onChange={e => setI('Supplier_ID', e.target.value)}>
                            <option value="">None / Unknown</option>
                            {suppliers.map(s => <option key={s.Supplier_ID} value={s.Supplier_ID}>{s.Supplier_Name}</option>)}
                        </select>
                    </div>
                    {selected && <div className="form-group"><label className="form-label">Status</label>
                        <select className="form-control" value={iForm.Inventory_Status || 'active'} onChange={e => setI('Inventory_Status', e.target.value)}>
                            <option value="active">Active</option><option value="inactive">Inactive</option>
                        </select>
                    </div>}
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveItem} disabled={saving}>{saving ? 'Saving…' : 'Save Item'}</button>
                </div>
            </Modal>

            {/* Stock Transaction Modal */}
            <Modal show={modal === 'txn'} onClose={() => setModal(null)} title="Record Stock Transaction">
                <div className="modal-body">
                    <div style={{ background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.2)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--secondary)' }}>
                        ℹ️ After saving, the database trigger <strong>trg_after_stock_txn_insert</strong> will automatically update inventory stock levels.
                    </div>
                    <div className="form-group"><label className="form-label required">Inventory Item</label>
                        <select className="form-control" value={tForm.Inventory_Item_ID} onChange={e => setT('Inventory_Item_ID', e.target.value)}>
                            <option value="">Select item…</option>
                            {data.map(i => <option key={i.Inventory_Item_ID} value={i.Inventory_Item_ID}>{i.Item_Name} (Stock: {parseFloat(i.Current_Stock).toFixed(2)} {i.Unit})</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Transaction Type</label>
                            <select className="form-control" value={tForm.Txn_Type} onChange={e => setT('Txn_Type', e.target.value)}>
                                {['purchase', 'consumption', 'waste', 'return', 'adjustment'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label required">Quantity</label>
                            <input className="form-control" type="number" min="0.001" step="0.001" value={tForm.Quantity} onChange={e => setT('Quantity', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Employee</label>
                            <select className="form-control" value={tForm.Employee_ID} onChange={e => setT('Employee_ID', e.target.value)}>
                                <option value="">Select…</option>
                                {employees.map(e => <option key={e.Employee_ID} value={e.Employee_ID}>{e.Employee_Name} ({e.Role})</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Unit Cost (for purchases)</label>
                            <input className="form-control" type="number" min="0" step="0.01" value={tForm.Unit_Cost} onChange={e => setT('Unit_Cost', e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group"><label className="form-label">Remarks</label>
                        <textarea className="form-control" rows={2} value={tForm.Remarks} onChange={e => setT('Remarks', e.target.value)} placeholder="Optional notes…" />
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleTxn} disabled={saving}>{saving ? 'Recording…' : 'Record Transaction'}</button>
                </div>
            </Modal>
        </div>
    );
}
