import React, { useEffect, useState } from 'react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
    Users, UtensilsCrossed, ShoppingCart, IndianRupee,
    AlertTriangle, Clock, TrendingUp, Star
} from 'lucide-react';
import { getDashboardStats } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#f97316', '#0ea5e9', '#22c55e', '#a855f7', '#f59e0b', '#ef4444'];

function StatCard({ icon: Icon, label, value, colorClass, prefix = '', cardClass = '' }) {
    return (
        <div className={`stat-card ${cardClass}`}>
            <div className={`stat-icon ${colorClass}`}><Icon size={20} /></div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</div>
        </div>
    );
}

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 4 }}>{label}</p>
            {payload.map((p, i) => (
                <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>
                    {p.name}: {p.name === 'revenue' || p.name === 'Revenue (₹)' ? '₹' : ''}{parseFloat(p.value).toLocaleString('en-IN')}
                </p>
            ))}
        </div>
    );
};

export default function Dashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDashboardStats()
            .then(setData)
            .catch(() => toast.error('Could not connect to the database. Is the backend running?'))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return (
        <div className="loader">
            <div className="spinner" />
            <span style={{ marginLeft: 16, color: 'var(--text-muted)' }}>Loading dashboard data…</span>
        </div>
    );

    const s = data?.stats || {};
    const daily = data?.dailySales || [];
    const topItems = data?.topItems || [];
    const orderSt = data?.orderStatus || [];
    const payMeth = data?.paymentMethods || [];
    const recent = data?.recentOrders || [];

    const fmtCurrency = v => `₹${parseFloat(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    function statusBadge(st) {
        const m = {
            pending: 'badge-yellow', confirmed: 'badge-blue', preparing: 'badge-purple',
            ready: 'badge-orange', delivered: 'badge-green', cancelled: 'badge-red'
        };
        return <span className={`badge ${m[st] || 'badge-gray'}`}>{st}</span>;
    }

    function payBadge(st) {
        return <span className={`badge ${st === 'paid' ? 'badge-green' : st === 'refunded' ? 'badge-blue' : 'badge-red'}`}>{st}</span>;
    }

    return (
        <div className="animate-fade">
            {/* Hello banner */}
            <div style={{
                background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(168,85,247,0.06))',
                border: '1px solid rgba(249,115,22,0.2)', borderRadius: 'var(--radius-lg)',
                padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16
            }}>
                <div style={{ fontSize: 32 }}>☕</div>
                <div>
                    <h2 style={{ fontSize: 20, fontWeight: 800 }}>Good morning, <span className="glow-text">Admin!</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                        All stats below are fetched live from your MySQL cafeteria_management database.
                    </p>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stat-grid" style={{ marginBottom: 24 }}>
                <StatCard icon={Users} label="Active Customers" value={s.active_customers || 0} colorClass="blue" cardClass="blue" />
                <StatCard icon={UtensilsCrossed} label="Available Menu Items" value={s.available_items || 0} colorClass="orange" />
                <StatCard icon={ShoppingCart} label="Today's Orders" value={s.today_orders || 0} colorClass="purple" cardClass="purple" />
                <StatCard icon={IndianRupee} label="Today's Revenue" value={fmtCurrency(s.today_revenue)} colorClass="green" cardClass="green" />
                <StatCard icon={Clock} label="Unpaid Orders" value={s.unpaid_orders || 0} colorClass="red" cardClass="red" />
                <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={s.low_stock_alerts || 0} colorClass="yellow" cardClass="yellow" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid-2" style={{ marginBottom: 24 }}>

                {/* Daily Revenue Chart */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Revenue — Last 7 Days</div>
                        </div>
                        <TrendingUp size={18} style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={daily}>
                                <defs>
                                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={d => d?.slice(5) || d} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Area type="monotone" dataKey="revenue" name="Revenue (₹)" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Order Status Distribution */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Order Status Distribution</div>
                            <div className="card-subtitle">All orders grouped by status</div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={orderSt} dataKey="count" nameKey="status" cx="50%" cy="50%"
                                    outerRadius={90} innerRadius={45} paddingAngle={3} label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}>
                                    {orderSt.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Charts Row 2 */}
            <div className="grid-2" style={{ marginBottom: 24 }}>

                {/* Top Menu Items */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Top 5 Menu Items</div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItems} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis type="category" dataKey="Item_Name" width={120} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="qty_sold" name="Qty Sold" fill="url(#barGrad)" radius={[0, 4, 4, 0]}>
                                    {topItems.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="card">
                    <div className="card-header">
                        <div>
                            <div className="card-title">Payment Methods</div>
                        </div>
                    </div>
                    <div className="chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={payMeth}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="method" tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `₹${v}`} />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="total" name="Total (₹)" radius={[4, 4, 0, 0]}>
                                    {payMeth.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Orders Table */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">Recent Orders</div>
                    </div>
                </div>
                <div className="table-wrapper" style={{ border: 'none' }}>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#ID</th>
                                <th>Customer</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Payment</th>
                                <th>Date & Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recent.map(o => (
                                <tr key={o.Order_ID}>
                                    <td><strong>#{o.Order_ID}</strong></td>
                                    <td>{o.customer}</td>
                                    <td><strong>{fmtCurrency(o.Total_Amount)}</strong></td>
                                    <td>{statusBadge(o.Order_Status)}</td>
                                    <td>{payBadge(o.Payment_Status)}</td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{new Date(o.Order_DateTime).toLocaleString()}</td>
                                </tr>
                            ))}
                            {!recent.length && (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No orders yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
