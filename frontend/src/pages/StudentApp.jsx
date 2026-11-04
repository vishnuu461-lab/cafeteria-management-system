import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../student.css';

// ── Category emoji map ─────────────────────────────────────────
const CAT_EMOJI = {
    'South Indian': '🥞', 'North Indian': '🍛', 'Beverages': '☕',
    'Snacks & Fast Food': '🍿', 'Desserts': '🍮', 'Healthy Bowls': '🥗',
    'Combo Meals': '🍱', 'Chinese': '🍜', 'Pizza': '🍕',
    'default': '🍽️'
};

const BG_COLORS = [
    '#fff5ed', '#fef3c7', '#f0fdf4', '#eff6ff', '#fdf4ff', '#fff1f2', '#f0fdfa'
];

function catEmoji(name) { return CAT_EMOJI[name] || CAT_EMOJI.default; }
function catBg(id) { return BG_COLORS[(id - 1) % BG_COLORS.length]; }

// ── Status badge ───────────────────────────────────────────────
function StatusBadge({ status }) {
    return <span className={`s-status-badge ssb-${status}`}>{status}</span>;
}

// ── Order Confirmation Screen ──────────────────────────────────
function OrderConfirmation({ order, onDone }) {
    return (
        <div className="s-confirm">
            <div className="s-confirm-anim">🎉</div>
            <h2>Order Placed!</h2>
            <p>Your food is being prepared</p>

            <div className="s-confirm-id">#{order.Order_ID}</div>

            <div className="s-confirm-card">
                <div className="s-cc-row"><span>Order Type</span><strong>{order.Order_Type?.replace('_', ' ')}</strong></div>
                <div className="s-cc-row"><span>Payment</span>
                    <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {order.Payment_Method?.toUpperCase()}
                        <span className={`s-status-pill ${order.Payment_Status}`}>
                            {order.Payment_Status === 'paid' ? '✓ Paid' : 'Pay at Counter'}
                        </span>
                    </strong>
                </div>
                <div className="s-cc-row"><span>Status</span><StatusBadge status={order.Order_Status} /></div>
                <div className="s-cc-row big"><span>Total</span>₹{parseFloat(order.Total_Amount).toFixed(2)}</div>
            </div>

            <div className="s-confirm-card">
                <div style={{ fontSize: 13, fontWeight: 700, color: '#374151', marginBottom: 10 }}>Items Ordered</div>
                {order.items?.map((it, i) => (
                    <div key={i} className="s-cc-row">
                        <span>{it.Item_Name} × {it.Quantity}</span>
                        <strong>₹{parseFloat(it.Line_Total).toFixed(2)}</strong>
                    </div>
                ))}
                <div className="s-cc-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #f0ece4' }}>
                    <span>Tax</span><span>₹{parseFloat(order.Tax_Amount).toFixed(2)}</span>
                </div>
            </div>

            <div style={{ background: '#fff5ed', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#ea580c', marginBottom: 20 }}>
                📋 Show Order ID <strong>#{order.Order_ID}</strong> at the counter to collect your food!
            </div>

            <button className="s-place-btn" onClick={onDone}>🍽️ Order More Food</button>
        </div>
    );
}

// ── Orders History ─────────────────────────────────────────────
function OrdersHistory({ customer }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`/api/student/orders/${customer.Customer_ID}`)
            .then(r => setOrders(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [customer.Customer_ID]);

    if (loading) return <div className="s-loading"><div className="s-spinner" /><p style={{ color: '#9ca3af', fontSize: 13 }}>Loading orders…</p></div>;

    if (!orders.length) return (
        <div className="s-cart-empty">
            <div className="ce-icon">📋</div>
            <h3>No orders yet</h3>
            <p>Your order history will appear here</p>
        </div>
    );

    return (
        <div className="s-orders-list">
            {orders.map(o => (
                <div key={o.Order_ID} className="s-order-card">
                    <div className="s-order-head">
                        <div>
                            <div className="s-order-id">Order #{o.Order_ID}</div>
                            <div className="s-order-date">{new Date(o.Order_DateTime).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                        <StatusBadge status={o.Order_Status} />
                    </div>
                    <div className="s-order-items">
                        {o.items?.map((it, i) => `${it.Item_Name} ×${it.Quantity}`).join(' · ')}
                    </div>
                    <div className="s-order-foot">
                        <div className="s-order-total">₹{parseFloat(o.Total_Amount).toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{o.Order_Type?.replace('_', ' ')}</span>
                            <span className={`s-status-pill ${o.Payment_Status}`}>{o.Payment_Status}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Main Student App ───────────────────────────────────────────
export default function StudentApp({ customer, onLogout }) {
    const [tab, setTab] = useState('menu');   // menu | cart | orders
    const [menu, setMenu] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('All');
    const [cart, setCart] = useState([]);       // [{Menu_Item_ID, Item_Name, Price, quantity, ...}]
    const [orderType, setOrderType] = useState('dine_in');
    const [payMethod, setPayMethod] = useState('cash');
    const [placing, setPlacing] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.reduce((s, i) => s + i.Price * i.quantity, 0);
    const taxAmt = cart.reduce((s, i) => s + i.Price * i.quantity * (i.Tax_Rate / 100), 0);
    const total = subtotal + taxAmt;

    // Load menu
    useEffect(() => {
        axios.get('/api/student/menu')
            .then(r => { setMenu(r.data.items); setGrouped(r.data.grouped); })
            .catch(console.error)
            .finally(() => setLoadingMenu(false));
    }, []);

    // Cart helpers
    function addToCart(item) {
        setCart(c => {
            const ex = c.find(i => i.Menu_Item_ID === item.Menu_Item_ID);
            if (ex) return c.map(i => i.Menu_Item_ID === item.Menu_Item_ID ? { ...i, quantity: i.quantity + 1 } : i);
            return [...c, { ...item, quantity: 1 }];
        });
    }
    function removeFromCart(id) { setCart(c => c.filter(i => i.Menu_Item_ID !== id)); }
    function changeQty(id, delta) {
        setCart(c => c.map(i => i.Menu_Item_ID === id
            ? { ...i, quantity: Math.max(0, i.quantity + delta) }
            : i).filter(i => i.quantity > 0));
    }
    function getQty(id) { return cart.find(i => i.Menu_Item_ID === id)?.quantity || 0; }

    // Filter menu items
    const categories = ['All', ...Object.keys(grouped)];
    const filtered = activeCat === 'All'
        ? menu.filter(i => !search || i.Item_Name.toLowerCase().includes(search.toLowerCase()))
        : (grouped[activeCat]?.items || []).filter(i => !search || i.Item_Name.toLowerCase().includes(search.toLowerCase()));

    // Group filtered items by category for display
    const filteredGrouped = {};
    filtered.forEach(item => {
        if (!filteredGrouped[item.Category_Name]) filteredGrouped[item.Category_Name] = [];
        filteredGrouped[item.Category_Name].push(item);
    });

    // Place order
    async function placeOrder() {
        if (!cart.length) return;
        setPlacing(true);
        try {
            const { data } = await axios.post('/api/student/order', {
                Customer_ID: customer.Customer_ID,
                Order_Type: orderType,
                Payment_Method: payMethod,
                items: cart.map(i => ({ Menu_Item_ID: i.Menu_Item_ID, quantity: i.quantity, name: i.Item_Name }))
            });
            setCart([]);
            setConfirmation(data);
            setTab('menu');
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to place order. Please try again.');
        } finally { setPlacing(false); }
    }

    const PAYMENT_OPTIONS = [
        { method: 'upi', icon: '📱', label: 'UPI', desc: 'GPay, PhonePe, Paytm' },
        { method: 'card', icon: '💳', label: 'Card', desc: 'Debit / Credit card' },
        { method: 'cash', icon: '💵', label: 'Cash', desc: 'Pay at the counter' },
    ];

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <div className="s-app">
            {/* ── Confirmation overlay ── */}
            {confirmation && (
                <div style={{ position: 'fixed', inset: 0, background: '#f8f5f0', zIndex: 200, overflowY: 'auto', maxWidth: 480, margin: '0 auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 20px 0' }}>
                        <button onClick={() => { setConfirmation(null); setTab('orders'); }}
                            style={{ background: 'none', border: 'none', fontSize: 13, color: '#9ca3af', cursor: 'pointer', fontFamily: 'inherit' }}>
                            View Orders →
                        </button>
                    </div>
                    <OrderConfirmation order={confirmation} onDone={() => { setConfirmation(null); setTab('menu'); }} />
                </div>
            )}

            {/* ── Header ── */}
            <div className="s-header">
                <div className="s-header-left">
                    <span className="s-greeting">{greeting()},</span>
                    <span className="s-name">{customer.Full_Name.split(' ')[0]} 👋</span>
                </div>
                <div className="s-header-right">
                    <div className="s-avatar">{customer.Full_Name.charAt(0).toUpperCase()}</div>
                    <button className="s-logout-btn" onClick={onLogout}>Logout</button>
                </div>
            </div>

            {/* ── Content ── */}
            <div className="s-content">

                {/* ══ MENU TAB ══ */}
                {tab === 'menu' && (
                    <>
                        <div className="s-banner">
                            <h2>🍽️ Welcome to Our Cafeteria</h2>
                            <p>Fresh, delicious food — order in seconds!</p>
                        </div>

                        {/* Search */}
                        <div className="s-search-wrap">
                            <span className="s-search-icon">🔍</span>
                            <input className="s-search-input" placeholder="Search for food items…"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>

                        {/* Category Pills */}
                        <div className="s-cat-scroll">
                            {categories.map(cat => (
                                <button key={cat} className={`s-cat-pill${activeCat === cat ? ' active' : ''}`}
                                    onClick={() => { setActiveCat(cat); setSearch(''); }}>
                                    {cat !== 'All' ? catEmoji(cat) + ' ' : ''}{cat}
                                </button>
                            ))}
                        </div>

                        {/* Food Grid */}
                        {loadingMenu ? (
                            <div className="s-loading"><div className="s-spinner" /><p style={{ color: '#9ca3af', fontSize: 13 }}>Loading menu…</p></div>
                        ) : (
                            Object.entries(filteredGrouped).map(([catName, items]) => (
                                <div key={catName}>
                                    <div className="s-section-title">{catEmoji(catName)} {catName}</div>
                                    <div className="s-food-grid">
                                        {items.map(item => {
                                            const avail = item.Availability_Status === 'available';
                                            const qty = getQty(item.Menu_Item_ID);
                                            return (
                                                <div key={item.Menu_Item_ID} className={`s-food-card${!avail ? ' unavailable' : ''}`}>
                                                    {!avail && <div className="s-unavail-badge">Out of Stock</div>}
                                                    <div className="s-food-img" style={{ background: catBg(item.Category_ID) }}>
                                                        {catEmoji(item.Category_Name)}
                                                    </div>
                                                    <div className="s-food-info">
                                                        <div className="s-food-name">{item.Item_Name}</div>
                                                        <div className="s-food-prep">⏱ {item.Prep_Time_Min} min</div>
                                                        <div className="s-food-price">₹{parseFloat(item.Price).toFixed(2)}</div>
                                                        <div style={{ marginTop: 8 }}>
                                                            {!avail ? (
                                                                <button className="s-add-btn disabled" disabled>Unavailable</button>
                                                            ) : qty === 0 ? (
                                                                <button className="s-add-btn" onClick={() => addToCart(item)}>+ Add</button>
                                                            ) : (
                                                                <div className="s-qty-ctrl">
                                                                    <button className="s-qty-btn" onClick={() => changeQty(item.Menu_Item_ID, -1)}>−</button>
                                                                    <span className="s-qty-num">{qty}</span>
                                                                    <button className="s-qty-btn" onClick={() => changeQty(item.Menu_Item_ID, +1)}>+</button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))
                        )}
                        {!loadingMenu && Object.keys(filteredGrouped).length === 0 && (
                            <div className="s-cart-empty"><div className="ce-icon">🔍</div><h3>No items found</h3><p>Try a different search</p></div>
                        )}
                    </>
                )}

                {/* ══ CART TAB ══ */}
                {tab === 'cart' && (
                    <>
                        {cart.length === 0 ? (
                            <div className="s-cart-empty">
                                <div className="ce-icon">🛒</div>
                                <h3>Your cart is empty</h3>
                                <p>Browse the menu and add delicious items!</p>
                                <button className="s-place-btn" style={{ marginTop: 20, width: 'auto', padding: '12px 28px' }}
                                    onClick={() => setTab('menu')}>Browse Menu</button>
                            </div>
                        ) : (
                            <>
                                {/* Cart Items */}
                                <div style={{ padding: '16px 16px 8px', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>
                                    🛒 Your Cart ({cartCount} items)
                                </div>
                                <div className="s-cart-items">
                                    {cart.map(item => (
                                        <div key={item.Menu_Item_ID} className="s-cart-item">
                                            <div className="s-ci-emoji" style={{ background: catBg(item.Category_ID) }}>
                                                {catEmoji(item.Category_Name)}
                                            </div>
                                            <div className="s-ci-info">
                                                <div className="s-ci-name">{item.Item_Name}</div>
                                                <div className="s-ci-price">₹{parseFloat(item.Price).toFixed(2)} each</div>
                                            </div>
                                            <div className="s-ci-ctrl">
                                                <button className="s-ci-btn" onClick={() => changeQty(item.Menu_Item_ID, -1)}>−</button>
                                                <span className="s-ci-qty">{item.quantity}</span>
                                                <button className="s-ci-btn" onClick={() => changeQty(item.Menu_Item_ID, +1)}>+</button>
                                            </div>
                                            <div className="s-ci-total">₹{(item.Price * item.quantity).toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Order Type */}
                                <div className="s-section">
                                    <div className="s-section-label">🪑 Order Type</div>
                                    <div className="s-option-group">
                                        {[['dine_in', '🍽️ Dine In'], ['takeaway', '🥡 Takeaway']].map(([v, l]) => (
                                            <button key={v} className={`s-option-btn${orderType === v ? ' active' : ''}`}
                                                onClick={() => setOrderType(v)}>{l}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="s-section">
                                    <div className="s-section-label">💳 Payment Method</div>
                                    {PAYMENT_OPTIONS.map(opt => (
                                        <div key={opt.method} className={`s-pay-option${payMethod === opt.method ? ' active' : ''}`}
                                            onClick={() => setPayMethod(opt.method)}>
                                            <div className="s-pay-icon">{opt.icon}</div>
                                            <div>
                                                <div className="s-pay-name">{opt.label}</div>
                                                <div className="s-pay-desc">{opt.desc}</div>
                                            </div>
                                            <div className="s-pay-check">{payMethod === opt.method && '✓'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Bill Summary */}
                                <div className="s-bill-card">
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>🧾 Bill Summary</div>
                                    <div className="s-bill-row"><span>Subtotal ({cartCount} items)</span><span>₹{subtotal.toFixed(2)}</span></div>
                                    <div className="s-bill-row"><span>GST / Tax</span><span>₹{taxAmt.toFixed(2)}</span></div>
                                    <div className="s-bill-row total"><span>Total Amount</span><span>₹{total.toFixed(2)}</span></div>
                                </div>

                                {/* Place Order */}
                                <button className="s-place-btn" onClick={placeOrder} disabled={placing}>
                                    {placing ? '⏳ Placing Order…' : `✅ Place Order · ₹${total.toFixed(2)}`}
                                </button>
                            </>
                        )}
                    </>
                )}

                {/* ══ ORDERS TAB ══ */}
                {tab === 'orders' && (
                    <>
                        <div style={{ padding: '16px 16px 0', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>
                            📋 My Orders
                        </div>
                        <OrdersHistory customer={customer} />
                    </>
                )}
            </div>

            {/* ── Bottom Nav ── */}
            <div className="s-nav">
                {[
                    { key: 'menu', icon: '🍽️', label: 'Menu' },
                    { key: 'cart', icon: '🛒', label: 'Cart' },
                    { key: 'orders', icon: '📋', label: 'Orders' },
                ].map(n => (
                    <button key={n.key} className={`s-nav-btn${tab === n.key ? ' active' : ''}`} onClick={() => setTab(n.key)}>
                        <div className="s-nav-icon">
                            {n.icon}
                            {n.key === 'cart' && cartCount > 0 && (
                                <span className="s-cart-badge">{cartCount > 9 ? '9+' : cartCount}</span>
                            )}
                        </div>
                        <div className="s-nav-label">{n.label}</div>
                    </button>
                ))}
            </div>
        </div>
    );
}
