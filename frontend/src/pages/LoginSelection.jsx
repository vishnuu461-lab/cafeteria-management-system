import React from 'react';
import '../student.css';

export default function LoginSelection({ onSelect }) {
    return (
        <div className="login-page">
            <div className="login-logo">☕</div>
            <h1 className="login-title">CaféMS</h1>
            <p className="login-subtitle">Welcome to JKLU University Cafeteria</p>

            <div className="login-card">
                <h2>Who are you?</h2>

                <button className="role-btn student" onClick={() => onSelect('student')}>
                    <div className="rb-icon">🎓</div>
                    <div className="rb-text">
                        <div className="rb-title">Student Login</div>
                        <div className="rb-desc">Browse menu &amp; place orders</div>
                    </div>
                    <span className="rb-arrow">›</span>
                </button>

                <button className="role-btn worker" onClick={() => onSelect('worker')}>
                    <div className="rb-icon">👷</div>
                    <div className="rb-text">
                        <div className="rb-title">Worker Login</div>
                        <div className="rb-desc">Counter &amp; inventory management</div>
                    </div>
                    <span className="rb-arrow">›</span>
                </button>

                <button className="role-btn admin" onClick={() => onSelect('admin')}>
                    <div className="rb-icon">🛡️</div>
                    <div className="rb-text">
                        <div className="rb-title">Admin Login</div>
                        <div className="rb-desc">Full dashboard &amp; analytics</div>
                    </div>
                    <span className="rb-arrow">›</span>
                </button>
            </div>
        </div>
    );
}
