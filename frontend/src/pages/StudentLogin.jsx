import React, { useState, useRef } from 'react';
import axios from 'axios';
import '../student.css';

export default function StudentLogin({ onBack, onSuccess }) {
    const [step, setStep] = useState('phone'); // phone | otp | name
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [name, setName] = useState('');
    const [demoOtp, setDemoOtp] = useState('');
    const [isNew, setIsNew] = useState(false);
    const [existingName, setExistingName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const otpRefs = useRef([]);

    async function requestOtp() {
        if (phone.length < 10) return setError('Enter a valid 10-digit mobile number');
        setError(''); setLoading(true);
        try {
            const { data } = await axios.post('/api/student/otp/request', { phone });
            setDemoOtp(data.demo_otp);
            setIsNew(data.is_new_user);
            setExistingName(data.existing_name || '');
            setStep('otp');
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to send OTP');
        } finally { setLoading(false); }
    }

    function handleOtpChange(i, val) {
        const clean = val.replace(/\D/g, '').slice(0, 1);
        const next = [...otp]; next[i] = clean; setOtp(next);
        if (clean && i < 5) otpRefs.current[i + 1]?.focus();
    }
    function handleOtpKey(i, e) {
        if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
    }

    async function verifyOtp() {
        const code = otp.join('');
        if (code.length < 6) return setError('Enter the 6-digit OTP');
        if (isNew && !existingName && !name) { setStep('name'); return; }
        setError(''); setLoading(true);
        try {
            const { data } = await axios.post('/api/student/otp/verify', {
                phone, otp: code, name: existingName || name || undefined
            });
            localStorage.setItem('student', JSON.stringify(data.customer));
            onSuccess(data.customer);
        } catch (e) {
            const err = e.response?.data;
            if (err?.needs_name) { setStep('name'); }
            else setError(err?.error || 'Invalid OTP');
        } finally { setLoading(false); }
    }

    async function submitName() {
        if (!name.trim()) return setError('Please enter your name');
        setError(''); setLoading(true);
        try {
            const code = otp.join('');
            const { data } = await axios.post('/api/student/otp/verify', { phone, otp: code, name });
            localStorage.setItem('student', JSON.stringify(data.customer));
            onSuccess(data.customer);
        } catch (e) {
            setError(e.response?.data?.error || 'Registration failed');
        } finally { setLoading(false); }
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="auth-header">
                    <button className="auth-back" onClick={step === 'phone' ? onBack : () => setStep('phone')}>←</button>
                    <div>
                        <div style={{ fontWeight: 800, color: '#fff' }}>
                            {step === 'phone' ? 'Student Login' : step === 'otp' ? 'Enter OTP' : 'Your Name'}
                        </div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                            {step === 'phone' ? 'Enter your mobile number' : step === 'otp' ? `Sent to +91 ${phone}` : 'Complete your profile'}
                        </div>
                    </div>
                </div>

                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#fca5a5', marginBottom: 16 }}>
                        ⚠️ {error}
                    </div>
                )}

                {/* ── STEP 1: Phone ── */}
                {step === 'phone' && (
                    <>
                        <div className="s-input-wrap">
                            <label className="s-label">Mobile Number</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <div style={{ background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: '0 14px', display: 'flex', alignItems: 'center', color: 'rgba(255,255,255,0.6)', fontSize: 14, whiteSpace: 'nowrap' }}>+91</div>
                                <input className="s-input" type="tel" maxLength={10} placeholder="9876543210"
                                    value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                    onKeyDown={e => e.key === 'Enter' && requestOtp()}
                                    style={{ flex: 1 }}
                                />
                            </div>
                        </div>
                        <button className="s-btn s-btn-primary" onClick={requestOtp} disabled={loading}>
                            {loading ? 'Sending OTP…' : 'Send OTP →'}
                        </button>
                    </>
                )}

                {/* ── STEP 2: OTP ── */}
                {step === 'otp' && (
                    <>
                        {demoOtp && (
                            <div className="demo-otp-badge">
                                🔔 Demo OTP (shown for college project)
                                <strong>{demoOtp}</strong>
                            </div>
                        )}
                        <div className="s-input-wrap">
                            <label className="s-label">6-Digit OTP</label>
                            <div className="otp-boxes">
                                {otp.map((d, i) => (
                                    <input key={i} className="otp-box" type="tel" maxLength={1} value={d}
                                        ref={el => otpRefs.current[i] = el}
                                        onChange={e => handleOtpChange(i, e.target.value)}
                                        onKeyDown={e => handleOtpKey(i, e)}
                                    />
                                ))}
                            </div>
                        </div>
                        {isNew && (
                            <div className="s-input-wrap">
                                <label className="s-label">Your Name (new user)</label>
                                <input className="s-input" placeholder="e.g. Arjun Sharma" value={name} onChange={e => setName(e.target.value)} />
                            </div>
                        )}
                        <button className="s-btn s-btn-primary" onClick={verifyOtp} disabled={loading || otp.join('').length < 6}>
                            {loading ? 'Verifying…' : 'Verify & Login →'}
                        </button>
                        <button className="s-btn s-btn-ghost" onClick={() => { setOtp(['', '', '', '', '', '']); requestOtp(); }}>
                            Resend OTP
                        </button>
                    </>
                )}

                {/* ── STEP 3: Name ── */}
                {step === 'name' && (
                    <>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 20 }}>
                            Welcome! You're registering as a new student.
                        </div>
                        <div className="s-input-wrap">
                            <label className="s-label">Full Name</label>
                            <input className="s-input" placeholder="e.g. Arjun Sharma" value={name} onChange={e => setName(e.target.value)} autoFocus />
                        </div>
                        <button className="s-btn s-btn-primary" onClick={submitName} disabled={loading || !name.trim()}>
                            {loading ? 'Registering…' : 'Register & Login →'}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}
