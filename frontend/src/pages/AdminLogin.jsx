import React, { useState } from 'react';
import '../student.css';

const ADMIN_PASSWORD = 'admin@jklu';

export default function AdminLogin({ onBack, onSuccess }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleLogin() {
        if (!password) return setError('Enter password');
        setLoading(true);
        setTimeout(() => {
            if (password === ADMIN_PASSWORD) {
                localStorage.setItem('admin', '1');
                onSuccess();
            } else {
                setError('Incorrect password');
            }
            setLoading(false);
        }, 600);
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="auth-header">
                    <button className="auth-back" onClick={onBack}>←</button>
                    <div>
                        <div style={{ fontWeight: 800, color: '#fff' }}>Admin Login</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                            Cafeteria counter staff
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
                        ⚠️ {error}
                    </div>
                )}

                <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
                    🔒 Demo password: <strong style={{ color: '#f97316', letterSpacing: 1 }}>admin@jklu</strong>
                </div>

                <div className="s-input-wrap">
                    <label className="s-label">Admin Password</label>
                    <input className="s-input" type="password" placeholder="Enter admin password"
                        value={password} onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleLogin()}
                    />
                </div>

                <button className="s-btn s-btn-primary" onClick={handleLogin} disabled={loading || !password}
                    style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                    {loading ? 'Logging in…' : 'Login as Admin →'}
                </button>
            </div>
        </div>
    );
}
