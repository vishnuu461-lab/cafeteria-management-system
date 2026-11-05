import React, { useState } from 'react';
import axios from 'axios';
import '../student.css';

export default function WorkerLogin({ onLogin, onBack }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPw, setShowPw] = useState(false);

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        if (!email || !password) { setError('Please enter email and password.'); return; }
        setLoading(true);
        try {
            const { data } = await axios.post('/api/auth/worker/login', { email, password });
            onLogin(data.worker);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed. Please try again.');
        } finally { setLoading(false); }
    }

    return (
        <div className="login-page">
            <div className="login-logo">👷</div>
            <h1 className="login-title">Worker Login</h1>
            <p className="login-subtitle">CaféMS · Staff Portal</p>

            <div className="login-card" style={{ maxWidth: 380 }}>
                <h2 style={{ marginBottom: 20 }}>Sign In</h2>

                {error && (
                    <div style={{
                        background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
                        padding: '10px 14px', color: '#dc2626', fontSize: 13, marginBottom: 16
                    }}>{error}</div>
                )}

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            Work Email
                        </label>
                        <input
                            type="email" value={email} onChange={e => setEmail(e.target.value)}
                            placeholder="Enter your email"
                            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPw ? 'text' : 'password'} value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: '100%', padding: '12px 40px 12px 14px', borderRadius: 10, border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                            />
                            <button type="button" onClick={() => setShowPw(p => !p)}
                                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                                {showPw ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    <button type="submit" disabled={loading}
                        style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit', marginTop: 4 }}>
                        {loading ? '⏳ Signing in…' : '🔐 Sign In'}
                    </button>
                </form>

                <button onClick={onBack}
                    style={{ marginTop: 20, background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'block', width: '100%', textAlign: 'center' }}>
                    ← Back to Login Selection
                </button>
            </div>
        </div>
    );
}
