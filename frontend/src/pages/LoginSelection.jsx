import React from 'react';
import '../student.css';

export default function LoginSelection({ onSelect }) {
    return (
        <div className="login-page">
            <div className="login-logo">☕</div>
            <h1 className="login-title">CaféMS</h1>
            <p className="login-subtitle">IET · JK Lakshmipat University · Jaipur</p>

            <div className="login-card">
                <h2>Who are you?</h2>

                <button className="role-btn admin" onClick={() => onSelect('admin')}>
                    <div className="rb-icon">🛡️</div>
                    <div className="rb-text">
                        <div className="rb-title">Admin Login</div>
                        <div className="rb-desc">Manage menu, orders & cafeteria</div>
                    </div>
                    <span className="rb-arrow">›</span>
                </button>

                <button className="role-btn student" onClick={() => onSelect('student')}>
                    <div className="rb-icon">🎓</div>
                    <div className="rb-text">
                        <div className="rb-title">Student Login</div>
                        <div className="rb-desc">Browse menu & place orders</div>
                    </div>
                    <span className="rb-arrow">›</span>
                </button>
            </div>

            <p style={{ marginTop: 32, fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                CS1133 · DBMS Academic Project · 2026
            </p>
        </div>
    );
}
