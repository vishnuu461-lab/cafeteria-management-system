import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, CreditCard, UtensilsCrossed,
  Tag, Users, Building2, Package, BarChart3, Ticket, Menu, X, Bell, LogOut
} from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';

import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Payments from './pages/Payments';
import MenuPage from './pages/MenuPage';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Management from './pages/Management';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Offers from './pages/Offers';

import LoginSelection from './pages/LoginSelection';
import AdminLogin from './pages/AdminLogin';
import StudentLogin from './pages/StudentLogin';
import StudentApp from './pages/StudentApp';
import WorkerLogin from './pages/WorkerLogin';
import CounterDashboard from './pages/CounterDashboard';
import InventoryDashboard from './pages/InventoryDashboard';

// ── Sidebar nav items ───────────────────────────────────────────
const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/payments', icon: CreditCard, label: 'Payments' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu Items' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/customers', icon: Users, label: 'Customers' },
  { to: '/management', icon: Building2, label: 'Cafeteria & Staff' },
  { to: '/inventory', icon: Package, label: 'Inventory' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/offers', icon: Ticket, label: 'Offers' },
];

// ── Admin Panel layout ──────────────────────────────────────────
function AdminPanel({ admin, onLogout }) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const current = NAV.find(n => location.pathname.startsWith(n.to))?.label || 'Dashboard';
  const sidebarWidth = collapsed ? '64px' : '260px';

  return (
    <div className="app-layout">
      <aside className="sidebar" style={{ width: sidebarWidth, minWidth: sidebarWidth }}>
        <div className="sidebar-brand">
          <div className="brand-logo">
            <div className="brand-icon">☕</div>
            {!collapsed && (
              <div className="brand-text">
                <h2>CaféMS</h2>
                <span>IET JKLU · CS1133</span>
              </div>
            )}
          </div>
        </div>

        <button onClick={() => setCollapsed(c => !c)}
          style={{ margin: '8px 12px', width: collapsed ? 40 : 'calc(100% - 24px)', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', cursor: 'pointer' }}>
          {collapsed ? <Menu size={16} /> : <><X size={16} /><span style={{ fontSize: 12, fontWeight: 600 }}>Collapse</span></>}
        </button>

        {!collapsed && <div className="nav-section-label" style={{ paddingLeft: 20 }}>NAVIGATION</div>}
        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} title={collapsed ? label : ''}>
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {!collapsed && (
          <div className="sidebar-footer">
            <div className="sidebar-footer-info">
              <div style={{ fontWeight: 600 }}>{admin?.Name || 'Admin'}</div>
              <div style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>CS1133 · DBMS · 2026</div>
            </div>
          </div>
        )}
      </aside>

      <div className="main-content" style={{ marginLeft: sidebarWidth }}>
        <div className="topbar">
          <div className="topbar-left">
            <div>
              <div className="page-title">{current}</div>
              <div className="page-subtitle">Cafeteria Management System</div>
            </div>
          </div>
          <div className="topbar-right">
            <button className="topbar-btn"><Bell size={18} /></button>
            <button className="topbar-btn" onClick={onLogout} title="Logout" style={{ color: 'var(--danger)' }}>
              <LogOut size={18} />
            </button>
            <div className="user-avatar">{(admin?.Name || 'A').charAt(0).toUpperCase()}</div>
          </div>
        </div>

        <div className="page-wrapper">
          <Routes>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/management" element={<Management />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/offers" element={<Offers />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(null);
  const [screen, setScreen] = useState('select');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const admin = localStorage.getItem('cafems_admin');
      const student = localStorage.getItem('cafems_student');
      const worker = localStorage.getItem('cafems_worker');
      if (admin) setAuth({ role: 'admin', admin: JSON.parse(admin) });
      if (student) setAuth({ role: 'student', customer: JSON.parse(student) });
      if (worker) setAuth({ role: 'worker', worker: JSON.parse(worker) });
    } catch { /* clear corrupt storage */ }
    setLoading(false);
  }, []);

  function handleAdminLogin(admin) {
    localStorage.setItem('cafems_admin', JSON.stringify(admin));
    // clear old keys
    localStorage.removeItem('admin');
    setAuth({ role: 'admin', admin });
    toast.success(`Welcome, ${admin.Name}! 👋`);
  }

  function handleStudentSuccess(customer) {
    localStorage.setItem('cafems_student', JSON.stringify(customer));
    localStorage.removeItem('student');
    setAuth({ role: 'student', customer });
    toast.success(`Welcome, ${customer.Full_Name.split(' ')[0]}! 🎉`);
  }

  function handleWorkerLogin(worker) {
    localStorage.setItem('cafems_worker', JSON.stringify(worker));
    setAuth({ role: 'worker', worker });
    toast.success(`Welcome, ${worker.Name}!`);
  }

  function handleLogout() {
    localStorage.removeItem('cafems_admin');
    localStorage.removeItem('cafems_student');
    localStorage.removeItem('cafems_worker');
    localStorage.removeItem('admin');
    localStorage.removeItem('student');
    setAuth(null);
    setScreen('select');
    toast('Logged out successfully');
  }

  // Loading splash
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f13', gap: 12 }}>
      <div style={{ fontSize: 48 }}>☕</div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontFamily: 'Plus Jakarta Sans,sans-serif' }}>Loading CaféMS…</div>
    </div>
  );

  // ── Student portal
  if (auth?.role === 'student') return (
    <>
      <Toaster position="top-center" toastOptions={{ style: { fontSize: 13 } }} />
      <StudentApp customer={auth.customer} onLogout={handleLogout} />
    </>
  );

  // ── Worker portal — role-based routing
  if (auth?.role === 'worker') {
    const isCounter = auth.worker?.Role === 'counter';
    const isInventory = auth.worker?.Role === 'inventory';
    return (
      <>
        <Toaster position="top-center" />
        {isCounter && <CounterDashboard worker={auth.worker} onLogout={handleLogout} />}
        {isInventory && <InventoryDashboard worker={auth.worker} onLogout={handleLogout} />}
      </>
    );
  }

  // ── Admin portal
  if (auth?.role === 'admin') return (
    <>
      <Toaster position="top-right" />
      <BrowserRouter>
        <AdminPanel admin={auth.admin} onLogout={handleLogout} />
      </BrowserRouter>
    </>
  );

  // ── Login screens
  return (
    <>
      <Toaster position="top-center" />
      {screen === 'select' && <LoginSelection onSelect={setScreen} />}
      {screen === 'admin' && <AdminLogin onLogin={handleAdminLogin} onBack={() => setScreen('select')} />}
      {screen === 'student' && <StudentLogin onSuccess={handleStudentSuccess} onBack={() => setScreen('select')} />}
      {screen === 'worker' && <WorkerLogin onLogin={handleWorkerLogin} onBack={() => setScreen('select')} />}
    </>
  );
}
