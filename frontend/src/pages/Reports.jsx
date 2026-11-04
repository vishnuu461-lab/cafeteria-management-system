import React, { useEffect, useState, useCallback } from 'react';
import {
    BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { getDailySales, getTopItems, getCategorySales, getCustomerAnalysis, getFeedbackAnalysis, getPaymentAnalysis } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444', '#06b6d4'];

const Tip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.name}: {p.value?.toLocaleString?.()}</p>)}
        </div>
    );
};

function ChartCard({ title, subtitle, children }) {
    return (
        <div className="card">
            <div className="card-header"><div><div className="card-title">{title}</div><div className="card-subtitle">{subtitle}</div></div></div>
            <div style={{ height: 250 }}>{children}</div>
        </div>
    );
}

export default function Reports() {
    const [daily, setDaily] = useState([]);
    const [topItems, setTopItems] = useState([]);
    const [catSales, setCatSales] = useState([]);
    const [custAnal, setCustAnal] = useState([]);
    const [fb, setFb] = useState(null);
    const [pay, setPay] = useState(null);
    const [loading, setLoading] = useState(true);
    const [from, setFrom] = useState(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
    const [to, setTo] = useState(new Date().toISOString().slice(0, 10));

    const load = useCallback(() => {
        setLoading(true);
        Promise.all([
            getDailySales({ from, to }), getTopItems({ limit: 8 }), getCategorySales(),
            getCustomerAnalysis(), getFeedbackAnalysis(), getPaymentAnalysis()
        ]).then(([d, ti, cs, ca, fba, pa]) => {
            setDaily(d); setTopItems(ti); setCatSales(cs); setCustAnal(ca); setFb(fba); setPay(pa);
        }).catch(() => toast.error('Failed to load reports')).finally(() => setLoading(false));
    }, [from, to]);

    useEffect(() => { load(); }, [load]);

    const fmtRs = v => '₹' + parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Reports & Analytics</div>
                    <div className="section-subtitle">All data pulled live from MySQL using GROUP BY, JOIN, and Aggregate Functions</div>
                </div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <input type="date" className="form-control" value={from} onChange={e => setFrom(e.target.value)} style={{ width: 150 }} />
                    <span style={{ color: 'var(--text-muted)' }}>to</span>
                    <input type="date" className="form-control" value={to} onChange={e => setTo(e.target.value)} style={{ width: 150 }} />
                    <button className="btn btn-primary" onClick={load}>Refresh</button>
                </div>
            </div>

            {loading ? <div className="loader"><div className="spinner" /><span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>Running SQL queries on MySQL…</span></div> : (
                <>
                    {/* Row 1 */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                        <ChartCard title="Daily Revenue" subtitle={`${from} to ${to} · SELECT DATE, SUM(Total_Amount) GROUP BY DATE`}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={daily}>
                                    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} /><stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient></defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={d => d?.slice(5)} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => `₹${v}`} />
                                    <Tooltip content={<Tip />} />
                                    <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#f97316" strokeWidth={2} fill="url(#g1)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Top Menu Items" subtitle="SUM(Quantity) GROUP BY Menu_Item via ORDER_ITEM JOIN MENU_ITEM">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={topItems} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                    <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} />
                                    <YAxis type="category" dataKey="Item_Name" width={110} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                    <Tooltip content={<Tip />} />
                                    <Bar dataKey="qty_sold" name="Qty Sold" radius={[0, 4, 4, 0]}>
                                        {topItems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Row 2 */}
                    <div className="grid-2" style={{ marginBottom: 20 }}>
                        <ChartCard title="Category Revenue" subtitle="JOIN MENU_ITEM → CATEGORY, GROUP BY Category_Name">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={catSales} dataKey="revenue" nameKey="Category_Name" cx="50%" cy="50%"
                                        outerRadius={90} innerRadius={40} paddingAngle={3}
                                        label={({ Category_Name, percent }) => `${Category_Name} ${(percent * 100).toFixed(0)}%`}>
                                        {catSales.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => fmtRs(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        <ChartCard title="Payment Methods" subtitle="COUNT(*), SUM(Amount) GROUP BY Payment_Method FROM PAYMENT">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={pay?.byMethod || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="Payment_Method" tick={{ fill: '#64748b', fontSize: 11 }} />
                                    <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                                    <Tooltip content={<Tip />} />
                                    <Bar dataKey="total" name="Total (₹)" radius={[4, 4, 0, 0]}>
                                        {(pay?.byMethod || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>
                    </div>

                    {/* Row 3: Feedback */}
                    {fb && (
                        <div className="grid-2" style={{ marginBottom: 20 }}>
                            <div className="card">
                                <div className="card-header"><div className="card-title">Feedback Rating Distribution</div></div>
                                <div style={{ height: 220 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={fb.distribution}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="Rating" tickFormatter={v => '★'.repeat(v)} tick={{ fill: '#f59e0b', fontSize: 12 }} />
                                            <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                                            <Tooltip />
                                            <Bar dataKey="count" name="Reviews" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ marginTop: 12, textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
                                    Average Rating: <strong style={{ color: '#f59e0b', fontSize: 18 }}>{'★'.repeat(Math.round(fb.avgRating?.[0]?.avg || 0))} {parseFloat(fb.avgRating?.[0]?.avg || 0).toFixed(1)}</strong> / 5
                                </div>
                            </div>

                            <div className="card">
                                <div className="card-header"><div className="card-title">Feedback by Category</div></div>
                                <table className="table" style={{ fontSize: 13 }}>
                                    <thead><tr><th>Category</th><th>Count</th><th>Avg Rating</th></tr></thead>
                                    <tbody>
                                        {fb.byCategory?.map(f => (
                                            <tr key={f.Feedback_Category}>
                                                <td>{f.Feedback_Category?.replace(/_/g, ' ')}</td>
                                                <td>{f.count}</td>
                                                <td>{'★'.repeat(Math.round(f.avg_rating))} {parseFloat(f.avg_rating).toFixed(1)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Customer Table */}
                    <div className="card">
                        <div className="card-header">
                            <div><div className="card-title">Customer Analysis</div>
                                <div className="card-subtitle">CASE WHEN with COUNT and SUM — classifies customers into Regular/Occasional/New</div>
                            </div>
                        </div>
                        <div className="table-wrapper" style={{ border: 'none' }}>
                            <table className="table">
                                <thead><tr><th>Customer</th><th>Type</th><th>Orders</th><th>Total Spent</th><th>Avg Order</th><th>Category</th></tr></thead>
                                <tbody>
                                    {custAnal.map((c, i) => (
                                        <tr key={i}>
                                            <td><strong>{c.Full_Name}</strong></td>
                                            <td><span className="badge badge-blue">{c.Customer_Type}</span></td>
                                            <td>{c.total_orders}</td>
                                            <td><strong>{fmtRs(c.total_spent)}</strong></td>
                                            <td style={{ color: 'var(--text-muted)' }}>{fmtRs(c.avg_order)}</td>
                                            <td>
                                                <span className={`badge ${c.category === 'Regular' ? 'badge-orange' : c.category === 'Occasional' ? 'badge-blue' : 'badge-gray'}`}>
                                                    {c.category}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
