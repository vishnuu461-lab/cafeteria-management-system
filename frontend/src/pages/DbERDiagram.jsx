import React, { useState, useEffect, useRef } from 'react';
import { getDbSchema } from '../services/api';
import { GitBranch, AlertCircle } from 'lucide-react';

// CafeMS ER → Relational Mapping table data
const ER_MAPPING = [
  { entity: 'cafeteria', construct: 'Strong entity', tables: 'cafeteria', how: 'Own table. PK = Cafeteria_ID (AUTO_INCREMENT). Attributes: Cafeteria_Name, Location, Operating_Hours, Status.' },
  { entity: 'counter', construct: 'Weak entity (owner: cafeteria)', tables: 'counter', how: 'PK = Counter_ID. Discriminator: Counter_Name. FK Cafeteria_ID → cafeteria; ON DELETE CASCADE.' },
  { entity: 'customer', construct: 'Strong entity', tables: 'customer', how: 'Own table. PK = Customer_ID. UNIQUE(Email). Attributes include Full_Name, Phone, DOB, Account_Status.' },
  { entity: 'employee', construct: 'Strong entity', tables: 'employee', how: 'Own table. PK = Employee_ID. FK Cafeteria_ID → cafeteria, FK Counter_ID → counter. Role discriminates counter vs inventory staff.' },
  { entity: 'category', construct: 'Strong entity', tables: 'category', how: 'Own table. PK = Category_ID. UNIQUE(Category_Name). Parent grouping for menu items.' },
  { entity: 'menu_item', construct: 'Strong entity', tables: 'menu_item', how: 'Own table. PK = Menu_Item_ID. FK Category_ID → category. Attributes: Item_Name, Price, Availability_Status, Image_URL.' },
  { entity: 'supplier', construct: 'Strong entity', tables: 'supplier', how: 'Own table. PK = Supplier_ID. UNIQUE(Email). Tracks supplier contact and status.' },
  { entity: 'inventory_item', construct: 'Strong entity', tables: 'inventory_item', how: 'Own table. PK = Inventory_Item_ID. FK Supplier_ID → supplier. Tracks Current_Stock, Reorder_Level, Unit.' },
  { entity: 'recipe_item', construct: 'Associative entity (menu_item ↔ inventory_item)', tables: 'recipe_item', how: 'PK = (Menu_Item_ID, Inventory_Item_ID) composite. FKs to both parent tables. Quantity_Required captures the M:N attribute.' },
  { entity: 'orders', construct: 'Transaction entity', tables: 'orders', how: 'Own table. PK = Order_ID. FKs: Customer_ID → customer, Cafeteria_ID → cafeteria, Counter_ID → counter. Attributes: Total_Amount, Order_Status, Payment_Status, Order_DateTime.' },
  { entity: 'order_item', construct: 'Weak associative entity (order ↔ menu_item)', tables: 'order_item', how: 'PK = Order_Item_ID. FKs: Order_ID → orders, Menu_Item_ID → menu_item. Captures Quantity and Unit_Price at time of order.' },
  { entity: 'payment', construct: 'Associative entity (1:1 with orders)', tables: 'payment', how: 'PK = Payment_ID. UNIQUE(Order_ID). FK Order_ID → orders. Captures Amount, Payment_Method, Payment_Status, Payment_DateTime.' },
  { entity: 'stock_transaction', construct: 'Audit/event entity', tables: 'stock_transaction', how: 'PK = Transaction_ID. FK Inventory_Item_ID → inventory_item. Records stock movements: Transaction_Type, Quantity_Changed, Transaction_Date.' },
  { entity: 'offer', construct: 'Strong entity', tables: 'offer', how: 'Own table. PK = Offer_ID. Attributes: Offer_Name, Discount_Type (percent/flat), Discount_Value, Valid_From, Valid_Until, Status.' },
  { entity: 'order_offer', construct: 'Associative entity (orders ↔ offer)', tables: 'order_offer', how: 'PK = (Order_ID, Offer_ID) composite. Maps which offers were applied to which orders. Discount_Applied captures the actual discount amount.' },
  { entity: 'feedback', construct: 'Associative entity (customer ↔ menu_item) with UNIQUE constraint', tables: 'feedback', how: 'PK = Feedback_ID. FKs: Customer_ID → customer, Menu_Item_ID → menu_item. UNIQUE(Customer_ID, Menu_Item_ID) enforces one-review-per-item rule. Attributes: Rating (1-5), Comment, Feedback_Date.' },
  { entity: 'audit_log', construct: 'Audit/system entity', tables: 'audit_log', how: 'PK = id. Tracks database management actions: action type, table_name, details, admin_user, created_at. Used by the Database Management Module.' },
];

// Hardcoded visual ER layout (positions + relationships)
const TABLES_LAYOUT = [
  // Group 1: Core cafeteria
  { name: 'cafeteria', x: 60, y: 60, color: '#f97316', group: 'Cafeteria' },
  { name: 'counter', x: 60, y: 240, color: '#f97316', group: 'Cafeteria' },
  { name: 'employee', x: 60, y: 420, color: '#f97316', group: 'Cafeteria' },
  // Group 2: Menu
  { name: 'category', x: 320, y: 60, color: '#22c55e', group: 'Menu' },
  { name: 'menu_item', x: 320, y: 240, color: '#22c55e', group: 'Menu' },
  { name: 'recipe_item', x: 320, y: 420, color: '#22c55e', group: 'Menu' },
  // Group 3: Orders
  { name: 'orders', x: 580, y: 60, color: '#3b82f6', group: 'Orders' },
  { name: 'order_item', x: 580, y: 240, color: '#3b82f6', group: 'Orders' },
  { name: 'payment', x: 580, y: 420, color: '#3b82f6', group: 'Orders' },
  { name: 'order_offer', x: 580, y: 600, color: '#3b82f6', group: 'Orders' },
  // Group 4: Inventory
  { name: 'inventory_item', x: 840, y: 60, color: '#a855f7', group: 'Inventory' },
  { name: 'supplier', x: 840, y: 240, color: '#a855f7', group: 'Inventory' },
  { name: 'stock_transaction', x: 840, y: 420, color: '#a855f7', group: 'Inventory' },
  // Group 5: Customer & Feedback
  { name: 'customer', x: 320, y: 600, color: '#ec4899', group: 'Customer' },
  { name: 'feedback', x: 580, y: 780, color: '#ec4899', group: 'Customer' },
  // Group 6: Offers
  { name: 'offer', x: 840, y: 600, color: '#f59e0b', group: 'Offers' },
  // Group 7: Audit
  { name: 'audit_log', x: 840, y: 780, color: '#6b7280', group: 'System' },
];

const RELATIONSHIPS = [
  { from: 'cafeteria', to: 'counter', label: '1:N' },
  { from: 'cafeteria', to: 'employee', label: '1:N' },
  { from: 'counter', to: 'employee', label: '1:N' },
  { from: 'cafeteria', to: 'orders', label: '1:N' },
  { from: 'counter', to: 'orders', label: '1:N' },
  { from: 'customer', to: 'orders', label: '1:N' },
  { from: 'orders', to: 'order_item', label: '1:N' },
  { from: 'menu_item', to: 'order_item', label: '1:N' },
  { from: 'orders', to: 'payment', label: '1:1' },
  { from: 'orders', to: 'order_offer', label: '1:N' },
  { from: 'offer', to: 'order_offer', label: '1:N' },
  { from: 'category', to: 'menu_item', label: '1:N' },
  { from: 'menu_item', to: 'recipe_item', label: '1:N' },
  { from: 'inventory_item', to: 'recipe_item', label: '1:N' },
  { from: 'supplier', to: 'inventory_item', label: '1:N' },
  { from: 'inventory_item', to: 'stock_transaction', label: '1:N' },
  { from: 'customer', to: 'feedback', label: '1:N' },
  { from: 'menu_item', to: 'feedback', label: '1:N' },
];

const BOX_W = 130;
const BOX_H = 36;

function getCenter(name) {
  const t = TABLES_LAYOUT.find(t => t.name === name);
  if (!t) return { x: 0, y: 0 };
  return { x: t.x + BOX_W / 2, y: t.y + BOX_H / 2 };
}

export default function DbERDiagram() {
  const [tab, setTab] = useState('er');
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [schemaError, setSchemaError] = useState('');
  const [highlight, setHighlight] = useState(null);
  const svgRef = useRef();
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.75);
  const dragging = useRef(false);
  const lastMouse = useRef(null);

  function onWheel(e) {
    e.preventDefault();
    setScale(s => Math.min(2, Math.max(0.3, s - e.deltaY * 0.001)));
  }

  function onMouseDown(e) {
    if (e.target === svgRef.current || e.target.tagName === 'svg') {
      dragging.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }
  function onMouseMove(e) {
    if (!dragging.current || !lastMouse.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }
  function onMouseUp() { dragging.current = false; lastMouse.current = null; }

  const relatedTables = highlight
    ? new Set(RELATIONSHIPS.filter(r => r.from === highlight || r.to === highlight).flatMap(r => [r.from, r.to]))
    : null;

  const groupColors = { Cafeteria: '#f97316', Menu: '#22c55e', Orders: '#3b82f6', Inventory: '#a855f7', Customer: '#ec4899', Offers: '#f59e0b', System: '#6b7280' };
  const groups = [...new Set(TABLES_LAYOUT.map(t => t.group))];

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ id: 'er', label: 'ER Diagram' }, { id: 'mapping', label: 'ER → Relational Mapping' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '8px 20px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t.id ? 'var(--primary)' : 'transparent', color: tab === t.id ? '#fff' : 'var(--text-muted)', transition: 'all 0.15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'er' && (
        <div>
          {/* Legend */}
          <div className="card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>Table Groups:</span>
            {groups.map(g => (
              <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: groupColors[g] }} />
                <span style={{ color: 'var(--text-muted)' }}>{g}</span>
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Scroll to zoom · Drag to pan · Click table to highlight</span>
          </div>

          {/* SVG Canvas */}
          <div className="card" style={{ padding: 0, overflow: 'hidden', height: 600, position: 'relative', cursor: 'grab' }}>
            <svg
              ref={svgRef}
              width="100%" height="100%"
              onWheel={onWheel}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              style={{ display: 'block' }}
            >
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                  <path d="M0,0 L0,6 L8,3 z" fill="rgba(100,116,139,0.6)" />
                </marker>
              </defs>
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
                {/* Relationships */}
                {RELATIONSHIPS.map((rel, i) => {
                  const f = getCenter(rel.from);
                  const t = getCenter(rel.to);
                  const isHighlighted = !highlight || (relatedTables?.has(rel.from) && relatedTables?.has(rel.to));
                  const mx = (f.x + t.x) / 2;
                  const my = (f.y + t.y) / 2;
                  return (
                    <g key={i} opacity={isHighlighted ? 1 : 0.15}>
                      <line x1={f.x} y1={f.y} x2={t.x} y2={t.y}
                        stroke="rgba(100,116,139,0.5)" strokeWidth={1.5} markerEnd="url(#arrow)" />
                      <rect x={mx - 14} y={my - 9} width={28} height={16} rx={4} fill="#1e1e2e" stroke="rgba(100,116,139,0.4)" strokeWidth={0.8} />
                      <text x={mx} y={my + 4} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight={600}>{rel.label}</text>
                    </g>
                  );
                })}

                {/* Table boxes */}
                {TABLES_LAYOUT.map(t => {
                  const isSelected = highlight === t.name;
                  const isDimmed = highlight && !relatedTables?.has(t.name);
                  return (
                    <g key={t.name} onClick={() => setHighlight(h => h === t.name ? null : t.name)}
                      style={{ cursor: 'pointer' }} opacity={isDimmed ? 0.3 : 1}>
                      <rect x={t.x} y={t.y} width={BOX_W} height={BOX_H} rx={6}
                        fill={isSelected ? t.color : '#1e1e2e'}
                        stroke={isSelected ? t.color : t.color + '80'}
                        strokeWidth={isSelected ? 2 : 1.5} />
                      <text x={t.x + BOX_W / 2} y={t.y + BOX_H / 2 + 5} textAnchor="middle"
                        fill={isSelected ? '#fff' : '#e2e8f0'} fontSize={11} fontWeight={600} fontFamily="monospace">
                        {t.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* Zoom controls */}
            <div style={{ position: 'absolute', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[{ label: '+', delta: 0.1 }, { label: '−', delta: -0.1 }].map(btn => (
                <button key={btn.label} onClick={() => setScale(s => Math.min(2, Math.max(0.3, s + btn.delta)))}
                  style={{ width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {btn.label}
                </button>
              ))}
              <button onClick={() => { setScale(0.75); setPan({ x: 0, y: 0 }); setHighlight(null); }}
                style={{ width: 32, height: 32, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer' }}>
                ⟳
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'mapping' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-overlay)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <GitBranch size={18} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>ER → Relational Mapping</h2>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
              How each ER construct in the Cafeteria Management System is mapped to relational tables.
            </p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-overlay)' }}>
                  {['ER Entity / Construct', 'Construct Type', 'Table(s)', 'How It Is Mapped'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ER_MAPPING.map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-overlay)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{row.entity}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontSize: 12 }}>{row.construct}</td>
                    <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                      {row.tables.split(',').map(t => t.trim()).map(t => (
                        <span key={t} style={{ display: 'inline-block', background: 'rgba(249,115,22,0.12)', color: 'var(--primary)', borderRadius: 5, padding: '1px 8px', marginRight: 4, fontFamily: 'monospace', fontSize: 12 }}>{t}</span>
                      ))}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 400 }}>{row.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
