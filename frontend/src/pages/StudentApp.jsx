import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../student.css';

const CAT_EMOJI = {
    'South Indian': '🥞', 'North Indian': '🍛', 'Beverages': '☕',
    'Snacks & Fast Food': '🍿', 'Desserts': '🍮', 'Healthy Bowls': '🥗',
    'Combo Meals': '🍱', 'Chinese': '🍜', 'Pizza': '🍕', 'default': '🍽️'
};
const BG_COLORS = ['#fff5ed', '#fef3c7', '#f0fdf4', '#eff6ff', '#fdf4ff', '#fff1f2', '#f0fdfa'];
function catEmoji(name) { return CAT_EMOJI[name] || CAT_EMOJI.default; }
function catBg(id) { return BG_COLORS[(id - 1) % BG_COLORS.length]; }

function StatusBadge({ status }) {
    return <span className={`s-status-badge ssb-${status}`}>{status}</span>;
}

// ── PDF Receipt Generator ─────────────────────────────────────
async function downloadReceipt(order) {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF({ format: 'a5', unit: 'mm' });
    const W = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(249, 115, 22);
    doc.rect(0, 0, W, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18); doc.setFont('helvetica', 'bold');
    doc.text('☕ CaféMS', W / 2, 12, { align: 'center' });
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text('IET · JK Lakshmipat University · Jaipur', W / 2, 19, { align: 'center' });
    doc.text('FOOD ORDER RECEIPT', W / 2, 26, { align: 'center' });

    // Order ID box
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.Order_ID}`, 10, 40);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Date: ${new Date(order.Order_DateTime || Date.now()).toLocaleString('en-IN')}`, 10, 46);
    doc.text(`Customer: ${order.Customer_Name || '—'}`, 10, 51);
    doc.text(`Phone: ${order.Phone || '—'}`, 10, 56);
    doc.text(`Type: ${(order.Order_Type || 'dine_in').replace('_', ' ').toUpperCase()}`, 10, 61);

    // Items table
    autoTable(doc, {
        startY: 66,
        head: [['Item', 'Qty', 'Rate', 'Total']],
        body: (order.items || []).map(i => [
            i.Item_Name, i.Quantity,
            `₹${parseFloat(i.Unit_Price || 0).toFixed(2)}`,
            `₹${parseFloat(i.Line_Total).toFixed(2)}`
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [255, 247, 237] },
        margin: { left: 10, right: 10 },
    });

    const finalY = doc.lastAutoTable.finalY + 5;

    // Bill Summary
    const rows = [
        ['Subtotal:', `₹${parseFloat(order.Subtotal || 0).toFixed(2)}`],
        ['Tax:', `₹${parseFloat(order.Tax_Amount || 0).toFixed(2)}`],
    ];
    if (parseFloat(order.Discount_Amount) > 0) {
        rows.push([`Discount (${order.applied_coupon || order.Coupon_Code || 'COUPON'}):`, `−₹${parseFloat(order.Discount_Amount).toFixed(2)}`]);
    }
    rows.push(['TOTAL:', `₹${parseFloat(order.Total_Amount).toFixed(2)}`]);

    let yy = finalY;
    rows.forEach(([k, v], i) => {
        const isBold = i === rows.length - 1;
        doc.setFontSize(isBold ? 10 : 8);
        doc.setFont('helvetica', isBold ? 'bold' : 'normal');
        doc.setTextColor(isBold ? 0 : 80, isBold ? 0 : 80, isBold ? 0 : 80);
        doc.text(k, W - 60, yy);
        doc.text(v, W - 10, yy, { align: 'right' });
        yy += isBold ? 7 : 5;
    });

    // Payment footer
    yy += 5;
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Payment: ${(order.Payment_Method || 'cash').toUpperCase()}`, 10, yy);
    const paidColor = order.Payment_Status === 'paid' ? [22, 163, 74] : [194, 65, 12];
    doc.setTextColor(...paidColor);
    doc.text(order.Payment_Status === 'paid' ? '✓ PAID' : '⏳ PENDING – Pay at Counter', W - 10, yy, { align: 'right' });

    if (order.Payment_Status !== 'paid') {
        yy += 8;
        doc.setFillColor(255, 247, 237);
        doc.roundedRect(10, yy - 4, W - 20, 10, 2, 2, 'F');
        doc.setTextColor(194, 65, 12); doc.setFontSize(8);
        doc.text(`Show Order ID #${order.Order_ID} at the counter to collect your food.`, W / 2, yy + 2, { align: 'center' });
    }

    doc.save(`CafeMS_Order_${order.Order_ID}.pdf`);
}

// ── Order Confirmation ────────────────────────────────────────
function OrderConfirmation({ order, onDone }) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        setDownloading(true);
        try { await downloadReceipt(order); } catch (e) { console.error(e); }
        finally { setDownloading(false); }
    }

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
                {parseFloat(order.Discount_Amount) > 0 && (
                    <div className="s-cc-row"><span>💰 Discount {order.Coupon_Code ? `(${order.Coupon_Code})` : ''}</span>
                        <strong style={{ color: '#16a34a' }}>−₹{parseFloat(order.Discount_Amount).toFixed(2)}</strong>
                    </div>
                )}
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

            <div style={{ background: '#fff5ed', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#ea580c', marginBottom: 16 }}>
                📋 Show Order ID <strong>#{order.Order_ID}</strong> at the counter!
            </div>

            <button onClick={handleDownload} disabled={downloading}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 14, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}>
                {downloading ? '⏳ Generating PDF…' : '📄 Download Receipt'}
            </button>

            <button className="s-place-btn" onClick={onDone}>🍽️ Order More Food</button>
        </div>
    );
}

// ── Orders History ────────────────────────────────────────────
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
        <div className="s-cart-empty"><div className="ce-icon">📋</div><h3>No orders yet</h3><p>Your order history will appear here</p></div>
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
                        {o.items?.map(it => `${it.Item_Name} ×${it.Quantity}`).join(' · ')}
                    </div>
                    <div className="s-order-foot">
                        <div className="s-order-total">₹{parseFloat(o.Total_Amount).toFixed(2)}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {parseFloat(o.Discount_Amount) > 0 && <span style={{ fontSize: 11, color: '#16a34a' }}>💰 Saved ₹{parseFloat(o.Discount_Amount).toFixed(2)}</span>}
                            <span style={{ fontSize: 11, color: '#9ca3af' }}>{o.Order_Type?.replace('_', ' ')}</span>
                            <span className={`s-status-pill ${o.Payment_Status}`}>{o.Payment_Status}</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ── Offers Tab ────────────────────────────────────────────────
function OffersTab() {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState('');

    useEffect(() => {
        axios.get('/api/student/offers')
            .then(r => setOffers(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    function copyCode(code) {
        navigator.clipboard.writeText(code).catch(() => { });
        setCopied(code);
        setTimeout(() => setCopied(''), 2000);
    }

    if (loading) return <div className="s-loading"><div className="s-spinner" /><p style={{ color: '#9ca3af' }}>Loading offers…</p></div>;
    if (!offers.length) return (
        <div className="s-cart-empty"><div className="ce-icon">🎁</div><h3>No active offers</h3><p>Check back later for deals!</p></div>
    );

    return (
        <div style={{ padding: '8px 0' }}>
            <div style={{ padding: '12px 16px 0', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>🎁 Active Offers</div>
            <div style={{ padding: '8px 0' }}>
                {offers.map(o => (
                    <div key={o.Offer_ID} style={{ margin: '8px 16px', background: 'linear-gradient(135deg,#fff7ed,#fef3c7)', borderRadius: 16, padding: 16, border: '1.5px solid #fed7aa', boxShadow: '0 2px 8px rgba(249,115,22,0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: '#1a1a2e' }}>{o.Offer_Name}</div>
                            <span style={{ background: '#f97316', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 800 }}>
                                {o.Discount_Type === 'percentage' ? `${o.Discount_Value}% OFF` : `₹${o.Discount_Value} OFF`}
                            </span>
                        </div>
                        {o.Min_Order_Value > 0 && (
                            <div style={{ fontSize: 12, color: '#92400e', marginBottom: 8 }}>Min. order ₹{o.Min_Order_Value}</div>
                        )}
                        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 12 }}>
                            Valid till {new Date(o.Valid_To).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ flex: 1, background: '#fff', borderRadius: 8, padding: '8px 12px', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#f97316', border: '2px dashed #fed7aa', letterSpacing: 1 }}>
                                {o.Offer_Code}
                            </div>
                            <button onClick={() => copyCode(o.Offer_Code)}
                                style={{ background: copied === o.Offer_Code ? '#16a34a' : '#f97316', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.3s', whiteSpace: 'nowrap' }}>
                                {copied === o.Offer_Code ? '✅ Copied!' : '📋 Copy Code'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Main Student App ──────────────────────────────────────────
export default function StudentApp({ customer, onLogout }) {
    const [tab, setTab] = useState('menu');
    const [menu, setMenu] = useState([]);
    const [grouped, setGrouped] = useState({});
    const [loadingMenu, setLoadingMenu] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('All');
    const [cart, setCart] = useState([]);
    const [orderType, setOrderType] = useState('dine_in');
    const [payMethod, setPayMethod] = useState('cash');
    const [couponCode, setCouponCode] = useState('');
    const [couponResult, setCouponResult] = useState(null);
    const [couponErr, setCouponErr] = useState('');
    const [validating, setValidating] = useState(false);
    const [placing, setPlacing] = useState(false);
    const [confirmation, setConfirmation] = useState(null);

    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
    const subtotal = cart.reduce((s, i) => s + i.Price * i.quantity, 0);
    const taxAmt = cart.reduce((s, i) => s + i.Price * i.quantity * (i.Tax_Rate / 100), 0);
    const discount = couponResult?.discount_amount || 0;
    const total = Math.max(0, subtotal + taxAmt - discount);

    useEffect(() => {
        axios.get('/api/student/menu')
            .then(r => { setMenu(r.data.items); setGrouped(r.data.grouped); })
            .catch(console.error)
            .finally(() => setLoadingMenu(false));
    }, []);

    function addToCart(item) {
        setCart(c => {
            const ex = c.find(i => i.Menu_Item_ID === item.Menu_Item_ID);
            if (ex) return c.map(i => i.Menu_Item_ID === item.Menu_Item_ID ? { ...i, quantity: i.quantity + 1 } : i);
            return [...c, { ...item, quantity: 1 }];
        });
    }
    function removeFromCart(id) { setCart(c => c.filter(i => i.Menu_Item_ID !== id)); }
    function changeQty(id, delta) {
        setCart(c => c.map(i => i.Menu_Item_ID === id ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter(i => i.quantity > 0));
    }
    function getQty(id) { return cart.find(i => i.Menu_Item_ID === id)?.quantity || 0; }

    const categories = ['All', ...Object.keys(grouped)];
    const filtered = activeCat === 'All'
        ? menu.filter(i => !search || i.Item_Name.toLowerCase().includes(search.toLowerCase()))
        : (grouped[activeCat]?.items || []).filter(i => !search || i.Item_Name.toLowerCase().includes(search.toLowerCase()));
    const filteredGrouped = {};
    filtered.forEach(item => {
        if (!filteredGrouped[item.Category_Name]) filteredGrouped[item.Category_Name] = [];
        filteredGrouped[item.Category_Name].push(item);
    });

    async function validateCoupon() {
        setCouponErr(''); setCouponResult(null);
        if (!couponCode.trim()) { setCouponErr('Enter a coupon code'); return; }
        setValidating(true);
        try {
            const { data } = await axios.post('/api/student/coupon/validate', { code: couponCode.trim(), subtotal });
            setCouponResult(data);
        } catch (e) { setCouponErr(e.response?.data?.error || 'Invalid coupon'); }
        finally { setValidating(false); }
    }

    function removeCoupon() { setCouponCode(''); setCouponResult(null); setCouponErr(''); }

    async function placeOrder() {
        if (!cart.length) return;
        setPlacing(true);
        try {
            const { data } = await axios.post('/api/student/order', {
                Customer_ID: customer.Customer_ID,
                Order_Type: orderType,
                Payment_Method: payMethod,
                coupon_code: couponResult ? couponCode.trim() : null,
                items: cart.map(i => ({ Menu_Item_ID: i.Menu_Item_ID, quantity: i.quantity }))
            });
            setCart([]); setCouponCode(''); setCouponResult(null); setCouponErr('');
            // Attach customer info for receipt
            data.Customer_Name = customer.Full_Name;
            data.Phone = customer.Phone;
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
        if (h < 12) return 'Good morning'; if (h < 17) return 'Good afternoon'; return 'Good evening';
    };

    return (
        <div className="s-app">
            {/* Confirmation overlay */}
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

            {/* Header */}
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

            {/* Content */}
            <div className="s-content">

                {/* ══ MENU TAB ══ */}
                {tab === 'menu' && (
                    <>
                        <div className="s-banner">
                            <h2>🍽️ Welcome to Our Cafeteria</h2>
                            <p>Fresh, delicious food — order in seconds!</p>
                        </div>
                        <div className="s-search-wrap">
                            <span className="s-search-icon">🔍</span>
                            <input className="s-search-input" placeholder="Search for food items…" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="s-cat-scroll">
                            {categories.map(cat => (
                                <button key={cat} className={`s-cat-pill${activeCat === cat ? ' active' : ''}`}
                                    onClick={() => { setActiveCat(cat); setSearch(''); }}>
                                    {cat !== 'All' ? catEmoji(cat) + ' ' : ''}{cat}
                                </button>
                            ))}
                        </div>
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
                                <button className="s-place-btn" style={{ marginTop: 20, width: 'auto', padding: '12px 28px' }} onClick={() => setTab('menu')}>Browse Menu</button>
                            </div>
                        ) : (
                            <>
                                <div style={{ padding: '16px 16px 8px', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>🛒 Your Cart ({cartCount} items)</div>
                                <div className="s-cart-items">
                                    {cart.map(item => (
                                        <div key={item.Menu_Item_ID} className="s-cart-item">
                                            <div className="s-ci-emoji" style={{ background: catBg(item.Category_ID) }}>{catEmoji(item.Category_Name)}</div>
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
                                            <button key={v} className={`s-option-btn${orderType === v ? ' active' : ''}`} onClick={() => setOrderType(v)}>{l}</button>
                                        ))}
                                    </div>
                                </div>

                                {/* Payment */}
                                <div className="s-section">
                                    <div className="s-section-label">💳 Payment Method</div>
                                    {PAYMENT_OPTIONS.map(opt => (
                                        <div key={opt.method} className={`s-pay-option${payMethod === opt.method ? ' active' : ''}`} onClick={() => setPayMethod(opt.method)}>
                                            <div className="s-pay-icon">{opt.icon}</div>
                                            <div><div className="s-pay-name">{opt.label}</div><div className="s-pay-desc">{opt.desc}</div></div>
                                            <div className="s-pay-check">{payMethod === opt.method && '✓'}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Coupon */}
                                <div className="s-section">
                                    <div className="s-section-label">🎟️ Promo Code</div>
                                    {couponResult ? (
                                        <div style={{ background: '#f0fdf4', borderRadius: 12, padding: '12px 14px', border: '1.5px solid #bbf7d0' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 13, color: '#166534' }}>✅ {couponResult.message}</div>
                                                    <div style={{ fontSize: 11, color: '#16a34a', marginTop: 2 }}>{couponCode.toUpperCase()} applied</div>
                                                </div>
                                                <button onClick={removeCoupon} style={{ background: '#fee2e2', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, color: '#dc2626', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Remove</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponErr(''); }}
                                                placeholder="Enter promo code"
                                                style={{ flex: 1, padding: '12px 14px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 14, outline: 'none', fontFamily: 'inherit', letterSpacing: 1 }} />
                                            <button onClick={validateCoupon} disabled={validating}
                                                style={{ background: '#f97316', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: validating ? 0.7 : 1 }}>
                                                {validating ? '⏳' : 'Apply'}
                                            </button>
                                        </div>
                                    )}
                                    {couponErr && <div style={{ fontSize: 12, color: '#dc2626', marginTop: 6 }}>❌ {couponErr}</div>}
                                </div>

                                {/* Bill Summary */}
                                <div className="s-bill-card">
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#374151', marginBottom: 12 }}>🧾 Bill Summary</div>
                                    <div className="s-bill-row"><span>Subtotal ({cartCount} items)</span><span>₹{subtotal.toFixed(2)}</span></div>
                                    <div className="s-bill-row"><span>GST / Tax</span><span>₹{taxAmt.toFixed(2)}</span></div>
                                    {discount > 0 && (
                                        <div className="s-bill-row" style={{ color: '#16a34a' }}>
                                            <span>💰 Discount ({couponCode})</span><span>−₹{discount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="s-bill-row total"><span>Total Amount</span><span>₹{total.toFixed(2)}</span></div>
                                </div>

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
                        <div style={{ padding: '16px 16px 0', fontWeight: 800, fontSize: 16, color: '#1a1a2e' }}>📋 My Orders</div>
                        <OrdersHistory customer={customer} />
                    </>
                )}

                {/* ══ OFFERS TAB ══ */}
                {tab === 'offers' && <OffersTab />}
            </div>

            {/* Bottom Nav */}
            <div className="s-nav">
                {[
                    { key: 'menu', icon: '🍽️', label: 'Menu' },
                    { key: 'cart', icon: '🛒', label: 'Cart' },
                    { key: 'orders', icon: '📋', label: 'Orders' },
                    { key: 'offers', icon: '🎁', label: 'Offers' },
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
