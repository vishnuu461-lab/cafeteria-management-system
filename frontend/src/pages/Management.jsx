import React, { useEffect, useState } from 'react';
import { Plus, Edit2, X } from 'lucide-react';
import { getCafeterias, createCafeteria, updateCafeteria, getCounters, createCounter, getEmployees, createEmployee, updateEmployee } from '../services/api';
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

export default function Management() {
    const [cafes, setCafes] = useState([]);
    const [counters, setCounters] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('cafeteria');
    const [modal, setModal] = useState(null);
    const [selected, setSelected] = useState(null);
    const [saving, setSaving] = useState(false);

    const cafeE = { Cafeteria_Name: '', Building_Name: '', Opening_Time: '07:30', Closing_Time: '21:00', Cafeteria_Status: 'open' };
    const counterE = { Cafeteria_ID: '', Counter_Name: '', Counter_Type: 'general', Counter_Status: 'open' };
    const empE = { Cafeteria_ID: '', Employee_Name: '', Role: 'cashier', Phone: '', Employee_Status: 'active' };
    const [cafeForm, setCafeForm] = useState(cafeE);
    const [ctrForm, setCtrForm] = useState(counterE);
    const [empForm, setEmpForm] = useState(empE);

    const load = () => {
        setLoading(true);
        Promise.all([getCafeterias(), getCounters(), getEmployees()])
            .then(([ca, co, em]) => { setCafes(ca); setCounters(co); setEmployees(em); })
            .catch(() => toast.error('Failed to load')).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    async function handleSaveCafe() {
        setSaving(true);
        try {
            if (selected) { await updateCafeteria(selected.Cafeteria_ID, cafeForm); toast.success('Updated!'); }
            else { await createCafeteria(cafeForm); toast.success('Cafeteria added!'); }
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleSaveCtr() {
        setSaving(true);
        try { await createCounter(ctrForm); toast.success('Counter added!'); setModal(null); load(); }
        catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    async function handleSaveEmp() {
        setSaving(true);
        try {
            if (selected) { await updateEmployee(selected.Employee_ID, empForm); toast.success('Employee updated!'); }
            else { await createEmployee(empForm); toast.success('Employee added!'); }
            setModal(null); load();
        } catch (e) { toast.error(e.message); }
        finally { setSaving(false); }
    }

    const TABS = [['cafeteria', '🏪 Cafeterias'], ['counters', '🔢 Counters'], ['employees', '👥 Employees']];

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Cafeteria & Staff Management</div>
                    <div className="section-subtitle">Tables: CAFETERIA, COUNTER, EMPLOYEE · {cafes.length} cafeterias · {employees.length} staff</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {tab === 'cafeteria' && <button className="btn btn-primary" onClick={() => { setCafeForm(cafeE); setSelected(null); setModal('cafe'); }}><Plus size={16} /> Add Cafeteria</button>}
                    {tab === 'counters' && <button className="btn btn-primary" onClick={() => { setCtrForm(counterE); setModal('counter'); }}><Plus size={16} /> Add Counter</button>}
                    {tab === 'employees' && <button className="btn btn-primary" onClick={() => { setEmpForm(empE); setSelected(null); setModal('emp'); }}><Plus size={16} /> Add Employee</button>}
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                {TABS.map(([key, label]) => (
                    <button key={key} className={`btn ${tab === key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setTab(key)}>{label}</button>
                ))}
            </div>

            {loading ? <div className="loader"><div className="spinner" /></div> : (
                <>
                    {tab === 'cafeteria' && (
                        <div className="grid-2">
                            {cafes.map(c => (
                                <div key={c.Cafeteria_ID} className="card">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                        <div>
                                            <div style={{ fontSize: 17, fontWeight: 700 }}>{c.Cafeteria_Name}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>🏢 {c.Building_Name}</div>
                                        </div>
                                        <span className={`badge ${c.Cafeteria_Status === 'open' ? 'badge-green' : 'badge-red'}`}>{c.Cafeteria_Status}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, marginBottom: 12 }}>
                                        <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hours</div><div style={{ fontSize: 13, fontWeight: 600 }}>{c.Opening_Time} – {c.Closing_Time}</div></div>
                                        <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Counters</div><div style={{ fontSize: 13, fontWeight: 600 }}>{c.counter_count}</div></div>
                                        <div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Employees</div><div style={{ fontSize: 13, fontWeight: 600 }}>{c.employee_count}</div></div>
                                    </div>
                                    <button className="btn btn-secondary btn-sm" onClick={() => { setCafeForm({ Cafeteria_Name: c.Cafeteria_Name, Building_Name: c.Building_Name, Opening_Time: c.Opening_Time?.slice(0, 5), Closing_Time: c.Closing_Time?.slice(0, 5), Cafeteria_Status: c.Cafeteria_Status }); setSelected(c); setModal('cafe'); }}>
                                        <Edit2 size={13} /> Edit
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {tab === 'counters' && (
                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-wrapper" style={{ border: 'none' }}>
                                <table className="table">
                                    <thead><tr><th>ID</th><th>Counter Name</th><th>Cafeteria</th><th>Type</th><th>Status</th></tr></thead>
                                    <tbody>
                                        {counters.map(c => (
                                            <tr key={c.Counter_ID}>
                                                <td><strong>#{c.Counter_ID}</strong></td>
                                                <td><strong>{c.Counter_Name}</strong></td>
                                                <td style={{ color: 'var(--text-muted)' }}>{c.Cafeteria_Name}</td>
                                                <td><span className="badge badge-blue">{c.Counter_Type}</span></td>
                                                <td><span className={`badge ${c.Counter_Status === 'open' ? 'badge-green' : 'badge-red'}`}>{c.Counter_Status}</span></td>
                                            </tr>
                                        ))}
                                        {!counters.length && <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No counters found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tab === 'employees' && (
                        <div className="card" style={{ padding: 0 }}>
                            <div className="table-wrapper" style={{ border: 'none' }}>
                                <table className="table">
                                    <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Phone</th><th>Cafeteria</th><th>Orders Handled</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {employees.map(e => (
                                            <tr key={e.Employee_ID}>
                                                <td><strong>#{e.Employee_ID}</strong></td>
                                                <td><strong>{e.Employee_Name}</strong></td>
                                                <td><span className="badge badge-purple">{e.Role}</span></td>
                                                <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{e.Phone}</td>
                                                <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{e.Cafeteria_Name}</td>
                                                <td>{e.orders_handled || 0}</td>
                                                <td><span className={`badge ${e.Employee_Status === 'active' ? 'badge-green' : e.Employee_Status === 'on_leave' ? 'badge-yellow' : 'badge-gray'}`}>{e.Employee_Status}</span></td>
                                                <td>
                                                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEmpForm({ Cafeteria_ID: e.Cafeteria_ID, Employee_Name: e.Employee_Name, Role: e.Role, Phone: e.Phone, Employee_Status: e.Employee_Status }); setSelected(e); setModal('emp'); }}>
                                                        <Edit2 size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {!employees.length && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No employees found</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            <Modal show={modal === 'cafe'} onClose={() => setModal(null)} title={selected ? 'Edit Cafeteria' : 'Add Cafeteria'}>
                <div className="modal-body">
                    <div className="form-group"><label className="form-label required">Cafeteria Name</label>
                        <input className="form-control" value={cafeForm.Cafeteria_Name} onChange={e => setCafeForm(f => ({ ...f, Cafeteria_Name: e.target.value }))} placeholder="Library Café" />
                    </div>
                    <div className="form-group"><label className="form-label required">Building Name</label>
                        <input className="form-control" value={cafeForm.Building_Name} onChange={e => setCafeForm(f => ({ ...f, Building_Name: e.target.value }))} placeholder="Library Block" />
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Opens</label>
                            <input className="form-control" type="time" value={cafeForm.Opening_Time} onChange={e => setCafeForm(f => ({ ...f, Opening_Time: e.target.value }))} /></div>
                        <div className="form-group"><label className="form-label">Closes</label>
                            <input className="form-control" type="time" value={cafeForm.Closing_Time} onChange={e => setCafeForm(f => ({ ...f, Closing_Time: e.target.value }))} /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Status</label>
                        <select className="form-control" value={cafeForm.Cafeteria_Status} onChange={e => setCafeForm(f => ({ ...f, Cafeteria_Status: e.target.value }))}>
                            <option value="open">Open</option><option value="closed">Closed</option><option value="under_maintenance">Under Maintenance</option>
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveCafe} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
                </div>
            </Modal>

            <Modal show={modal === 'counter'} onClose={() => setModal(null)} title="Add Counter">
                <div className="modal-body">
                    <div className="form-group"><label className="form-label required">Cafeteria</label>
                        <select className="form-control" value={ctrForm.Cafeteria_ID} onChange={e => setCtrForm(f => ({ ...f, Cafeteria_ID: e.target.value }))}>
                            <option value="">Select…</option>
                            {cafes.map(c => <option key={c.Cafeteria_ID} value={c.Cafeteria_ID}>{c.Cafeteria_Name}</option>)}
                        </select>
                    </div>
                    <div className="form-group"><label className="form-label required">Counter Name</label>
                        <input className="form-control" value={ctrForm.Counter_Name} onChange={e => setCtrForm(f => ({ ...f, Counter_Name: e.target.value }))} placeholder="Snacks Counter" />
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Type</label>
                            <select className="form-control" value={ctrForm.Counter_Type} onChange={e => setCtrForm(f => ({ ...f, Counter_Type: e.target.value }))}>
                                {['food', 'beverage', 'dessert', 'combo', 'general'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Status</label>
                            <select className="form-control" value={ctrForm.Counter_Status} onChange={e => setCtrForm(f => ({ ...f, Counter_Status: e.target.value }))}>
                                <option value="open">Open</option><option value="closed">Closed</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveCtr} disabled={saving}>{saving ? 'Saving…' : 'Add Counter'}</button>
                </div>
            </Modal>

            <Modal show={modal === 'emp'} onClose={() => setModal(null)} title={selected ? 'Edit Employee' : 'Add Employee'}>
                <div className="modal-body">
                    <div className="form-group"><label className="form-label required">Cafeteria</label>
                        <select className="form-control" value={empForm.Cafeteria_ID} onChange={e => setEmpForm(f => ({ ...f, Cafeteria_ID: e.target.value }))}>
                            <option value="">Select…</option>
                            {cafes.map(c => <option key={c.Cafeteria_ID} value={c.Cafeteria_ID}>{c.Cafeteria_Name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label required">Employee Name</label>
                            <input className="form-control" value={empForm.Employee_Name} onChange={e => setEmpForm(f => ({ ...f, Employee_Name: e.target.value }))} placeholder="Suresh Kumar" />
                        </div>
                        <div className="form-group"><label className="form-label required">Phone</label>
                            <input className="form-control" value={empForm.Phone} onChange={e => setEmpForm(f => ({ ...f, Phone: e.target.value }))} placeholder="9600099999" />
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group"><label className="form-label">Role</label>
                            <select className="form-control" value={empForm.Role} onChange={e => setEmpForm(f => ({ ...f, Role: e.target.value }))}>
                                {['manager', 'cashier', 'cook', 'inventory_staff', 'server'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Status</label>
                            <select className="form-control" value={empForm.Employee_Status} onChange={e => setEmpForm(f => ({ ...f, Employee_Status: e.target.value }))}>
                                <option value="active">Active</option><option value="on_leave">On Leave</option><option value="resigned">Resigned</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSaveEmp} disabled={saving}>{saving ? 'Saving…' : 'Save Employee'}</button>
                </div>
            </Modal>
        </div>
    );
}
