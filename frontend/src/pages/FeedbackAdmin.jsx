import React, { useEffect, useState } from 'react';
import { getFeedback } from '../services/api';

const STAR = (n, filled) => (
    <span style={{ color: filled ? '#f59e0b' : '#d1d5db', fontSize: 16 }}>★</span>
);

function StarDisplay({ rating }) {
    return (
        <span>
            {[1, 2, 3, 4, 5].map(n => <span key={n}>{STAR(n, n <= rating)}</span>)}
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>({rating}/5)</span>
        </span>
    );
}

const CAT_LABELS = {
    food_quality: '🍽️ Food Quality',
    service: '👨‍🍳 Service',
    cleanliness: '🧹 Cleanliness',
    value_for_money: '💰 Value for Money',
    overall: '⭐ Overall',
};

export default function FeedbackAdmin() {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [ratingF, setRatingF] = useState('');
    const [catF, setCatF] = useState('');

    useEffect(() => {
        getFeedback()
            .then(rows => setData(rows))
            .catch(() => {})
            .finally(() => setLoading(false));
    }, []);

    const filtered = data.filter(f => {
        const matchSearch = !search ||
            f.Customer_Name?.toLowerCase().includes(search.toLowerCase()) ||
            String(f.Order_ID).includes(search) ||
            f.Comments?.toLowerCase().includes(search.toLowerCase());
        const matchRating = !ratingF || String(f.Rating) === ratingF;
        const matchCat = !catF || f.Feedback_Category === catF;
        return matchSearch && matchRating && matchCat;
    });

    const avgRating = data.length
        ? (data.reduce((s, f) => s + Number(f.Rating), 0) / data.length).toFixed(1)
        : '—';

    const dist = [5, 4, 3, 2, 1].map(r => ({
        rating: r,
        count: data.filter(f => Number(f.Rating) === r).length,
    }));

    return (
        <div className="animate-fade">
            <div className="section-header">
                <div>
                    <div className="section-title">Student Feedback</div>
                    <div className="section-subtitle">{data.length} total reviews · Avg {avgRating} ⭐</div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="stat-grid" style={{ marginBottom: 20 }}>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>⭐</div>
                    <div className="stat-label">Avg Rating</div>
                    <div className="stat-value">{avgRating} / 5</div>
                </div>
                <div className="stat-card blue">
                    <div className="stat-icon" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}>📝</div>
                    <div className="stat-label">Total Reviews</div>
                    <div className="stat-value">{data.length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}>😊</div>
                    <div className="stat-label">5-Star Reviews</div>
                    <div className="stat-value">{data.filter(f => Number(f.Rating) === 5).length}</div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon" style={{ background: 'rgba(249,115,22,0.15)', color: '#f97316' }}>📊</div>
                    <div className="stat-label">Rating Breakdown</div>
                    <div style={{ marginTop: 6 }}>
                        {dist.map(d => (
                            <div key={d.rating} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 14 }}>{d.rating}★</span>
                                <div style={{ flex: 1, background: 'var(--bg-overlay)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                                    <div style={{ width: data.length ? `${(d.count / data.length) * 100}%` : '0%', height: '100%', background: '#f59e0b', borderRadius: 4, transition: 'width 0.5s' }} />
                                </div>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 20 }}>{d.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="page-toolbar" style={{ marginBottom: 16 }}>
                <div className="search-box">
                    <span style={{ fontSize: 14 }}>🔍</span>
                    <input className="form-control" placeholder="Search by student name, order ID, comment…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="form-control" style={{ width: 130 }} value={ratingF} onChange={e => setRatingF(e.target.value)}>
                    <option value="">All Ratings</option>
                    {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} Star{r !== 1 ? 's' : ''}</option>)}
                </select>
                <select className="form-control" style={{ width: 160 }} value={catF} onChange={e => setCatF(e.target.value)}>
                    <option value="">All Categories</option>
                    {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                {loading ? (
                    <div className="loader"><div className="spinner" /></div>
                ) : (
                    <div className="table-wrapper" style={{ border: 'none' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Student</th>
                                    <th>Order ID</th>
                                    <th>Rating</th>
                                    <th>Category</th>
                                    <th>Comments</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(f => (
                                    <tr key={f.Feedback_ID}>
                                        <td><strong>#{f.Feedback_ID}</strong></td>
                                        <td>
                                            <strong>{f.Customer_Name}</strong>
                                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                                {f.Cafeteria_Name || 'Main Cafeteria'}
                                            </div>
                                        </td>
                                        <td><span className="badge badge-blue">#{f.Order_ID}</span></td>
                                        <td><StarDisplay rating={Number(f.Rating)} /></td>
                                        <td>
                                            <span className="badge badge-purple">
                                                {CAT_LABELS[f.Feedback_Category] || f.Feedback_Category}
                                            </span>
                                        </td>
                                        <td style={{ maxWidth: 220, fontSize: 13, color: 'var(--text-secondary)' }}>
                                            {f.Comments || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No comments</span>}
                                        </td>
                                        <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                            {f.Feedback_Date ? new Date(f.Feedback_Date).toLocaleString('en-IN', {
                                                day: 'numeric', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            }) : '—'}
                                        </td>
                                    </tr>
                                ))}
                                {!filtered.length && (
                                    <tr>
                                        <td colSpan={7} style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
                                            No feedback found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
