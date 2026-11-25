import React, { useState } from 'react';
import { runDbQuery } from '../services/api';
import { FlaskConical, Play, Code, ChevronDown, ChevronUp, Search } from 'lucide-react';

const QUERIES = [
  // Basic
  {
    id: 'Q1', category: 'Basic', title: 'All Active Menu Items',
    description: 'SELECT filters rows; lists all currently available menu items with their price and category.',
    tags: ['SELECT', 'WHERE', 'JOIN'],
    sql: `SELECT mi.Menu_Item_ID, mi.Item_Name, mi.Price, mi.Availability_Status, c.Category_Name
FROM menu_item mi
JOIN category c ON mi.Category_ID = c.Category_ID
WHERE mi.Availability_Status = 'available'
ORDER BY c.Category_Name, mi.Item_Name`
  },
  {
    id: 'Q2', category: 'Basic', title: 'All Registered Students',
    description: 'Lists all registered customers sorted by registration date.',
    tags: ['SELECT', 'ORDER BY'],
    sql: `SELECT Customer_ID, Full_Name, Email, Phone, Account_Status, Created_At
FROM customer
ORDER BY Created_At DESC`
  },
  {
    id: 'Q3', category: 'Basic', title: 'All Cafeterias and Their Counters',
    description: 'Shows each cafeteria with its operating hours and number of counters.',
    tags: ['SELECT', 'WHERE'],
    sql: `SELECT c.Cafeteria_ID, c.Cafeteria_Name, c.Location, c.Operating_Hours, c.Status,
       COUNT(co.Counter_ID) AS counter_count
FROM cafeteria c
LEFT JOIN counter co ON co.Cafeteria_ID = c.Cafeteria_ID
GROUP BY c.Cafeteria_ID, c.Cafeteria_Name, c.Location, c.Operating_Hours, c.Status`
  },
  {
    id: 'Q4', category: 'Basic', title: 'Pending Orders Today',
    description: 'All orders placed today that are still pending.',
    tags: ['SELECT', 'WHERE', 'DATE'],
    sql: `SELECT o.Order_ID, c.Full_Name AS Customer, o.Total_Amount, o.Order_Status, o.Order_DateTime
FROM orders o
JOIN customer c ON o.Customer_ID = c.Customer_ID
WHERE DATE(o.Order_DateTime) = CURDATE() AND o.Order_Status = 'pending'
ORDER BY o.Order_DateTime DESC`
  },
  {
    id: 'Q5', category: 'Basic', title: 'Inventory Items with Low Stock',
    description: 'Lists inventory items whose current stock is at or below the reorder level.',
    tags: ['SELECT', 'WHERE', 'COMPARISON'],
    sql: `SELECT Item_Name, Current_Stock, Reorder_Level, Unit, Inventory_Status
FROM inventory_item
WHERE Current_Stock <= Reorder_Level AND Inventory_Status = 'active'
ORDER BY (Current_Stock / Reorder_Level) ASC`
  },
  // JOINs
  {
    id: 'Q6', category: 'JOINs', title: 'Orders with Customer and Counter Details',
    description: 'Multi-table JOIN linking orders to customers, cafeterias, and counters.',
    tags: ['JOIN', 'MULTI-TABLE'],
    sql: `SELECT o.Order_ID, c.Full_Name AS Customer, ca.Cafeteria_Name, co.Counter_Name,
       o.Total_Amount, o.Order_Status, o.Payment_Status, o.Order_DateTime
FROM orders o
JOIN customer c ON o.Customer_ID = c.Customer_ID
JOIN cafeteria ca ON o.Cafeteria_ID = ca.Cafeteria_ID
JOIN counter co ON o.Counter_ID = co.Counter_ID
ORDER BY o.Order_DateTime DESC
LIMIT 50`
  },
  {
    id: 'Q7', category: 'JOINs', title: 'Order Items with Menu Details',
    description: 'Shows each order line item with the item name, quantity and unit price.',
    tags: ['JOIN', 'ORDER DETAILS'],
    sql: `SELECT oi.Order_ID, o.Order_DateTime, mi.Item_Name, oi.Quantity, oi.Unit_Price,
       (oi.Quantity * oi.Unit_Price) AS Line_Total, c.Full_Name AS Customer
FROM order_item oi
JOIN orders o ON oi.Order_ID = o.Order_ID
JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
JOIN customer c ON o.Customer_ID = c.Customer_ID
ORDER BY o.Order_DateTime DESC
LIMIT 50`
  },
  {
    id: 'Q8', category: 'JOINs', title: 'Feedback with Customer and Item Info',
    description: 'All feedback entries joined with the customer and the menu item rated.',
    tags: ['JOIN', 'FEEDBACK'],
    sql: `SELECT f.Feedback_ID, c.Full_Name AS Student, mi.Item_Name, f.Rating,
       f.Comment, f.Feedback_Date
FROM feedback f
JOIN customer c ON f.Customer_ID = c.Customer_ID
JOIN menu_item mi ON f.Menu_Item_ID = mi.Menu_Item_ID
ORDER BY f.Feedback_Date DESC`
  },
  {
    id: 'Q9', category: 'JOINs', title: 'Employees with Cafeteria Assignment',
    description: 'Lists employees along with the cafeteria and counter they are assigned to.',
    tags: ['JOIN', 'EMPLOYEE'],
    sql: `SELECT e.Employee_ID, e.Name, e.Role, e.Email, ca.Cafeteria_Name, co.Counter_Name,
       e.Employee_Status
FROM employee e
LEFT JOIN cafeteria ca ON e.Cafeteria_ID = ca.Cafeteria_ID
LEFT JOIN counter co ON e.Counter_ID = co.Counter_ID
ORDER BY ca.Cafeteria_Name, e.Role`
  },
  {
    id: 'Q10', category: 'JOINs', title: 'Payments Linked to Orders',
    description: 'Shows payment details alongside the order and customer for each transaction.',
    tags: ['JOIN', 'PAYMENT'],
    sql: `SELECT p.Payment_ID, c.Full_Name AS Customer, o.Order_ID, p.Amount,
       p.Payment_Method, p.Payment_Status, p.Payment_DateTime
FROM payment p
JOIN orders o ON p.Order_ID = o.Order_ID
JOIN customer c ON o.Customer_ID = c.Customer_ID
ORDER BY p.Payment_DateTime DESC
LIMIT 50`
  },
  // Aggregation
  {
    id: 'Q11', category: 'Aggregation', title: 'Daily Revenue for Last 30 Days',
    description: 'SUM aggregates total revenue; GROUP BY groups by date to give daily revenue trend.',
    tags: ['GROUP BY', 'SUM', 'DATE'],
    sql: `SELECT DATE(Order_DateTime) AS Order_Date,
       COUNT(Order_ID) AS Total_Orders,
       SUM(Total_Amount) AS Total_Revenue,
       AVG(Total_Amount) AS Avg_Order_Value
FROM orders
WHERE Order_Status != 'cancelled'
  AND Order_DateTime >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
GROUP BY DATE(Order_DateTime)
ORDER BY Order_Date DESC`
  },
  {
    id: 'Q12', category: 'Aggregation', title: 'Top 10 Best-Selling Menu Items',
    description: 'Ranks items by total quantity sold across all non-cancelled orders.',
    tags: ['GROUP BY', 'SUM', 'ORDER BY', 'LIMIT'],
    sql: `SELECT mi.Item_Name, c.Category_Name,
       SUM(oi.Quantity) AS Total_Sold,
       SUM(oi.Quantity * oi.Unit_Price) AS Total_Revenue,
       AVG(f.Rating) AS Avg_Rating
FROM order_item oi
JOIN orders o ON oi.Order_ID = o.Order_ID
JOIN menu_item mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
JOIN category c ON mi.Category_ID = c.Category_ID
LEFT JOIN feedback f ON f.Menu_Item_ID = mi.Menu_Item_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY mi.Menu_Item_ID, mi.Item_Name, c.Category_Name
ORDER BY Total_Sold DESC
LIMIT 10`
  },
  {
    id: 'Q13', category: 'Aggregation', title: 'Revenue by Cafeteria',
    description: 'Compares total revenue across all cafeterias.',
    tags: ['GROUP BY', 'SUM', 'JOIN'],
    sql: `SELECT ca.Cafeteria_Name, ca.Location,
       COUNT(o.Order_ID) AS Total_Orders,
       SUM(o.Total_Amount) AS Total_Revenue,
       AVG(o.Total_Amount) AS Avg_Order_Value
FROM orders o
JOIN cafeteria ca ON o.Cafeteria_ID = ca.Cafeteria_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY ca.Cafeteria_ID, ca.Cafeteria_Name, ca.Location
ORDER BY Total_Revenue DESC`
  },
  {
    id: 'Q14', category: 'Aggregation', title: 'Average Rating Per Menu Item',
    description: 'Shows average feedback rating and total feedback count per menu item.',
    tags: ['AVG', 'COUNT', 'GROUP BY'],
    sql: `SELECT mi.Item_Name, c.Category_Name,
       COUNT(f.Feedback_ID) AS Feedback_Count,
       ROUND(AVG(f.Rating), 2) AS Avg_Rating,
       MIN(f.Rating) AS Min_Rating,
       MAX(f.Rating) AS Max_Rating
FROM menu_item mi
JOIN category c ON mi.Category_ID = c.Category_ID
LEFT JOIN feedback f ON f.Menu_Item_ID = mi.Menu_Item_ID
GROUP BY mi.Menu_Item_ID, mi.Item_Name, c.Category_Name
HAVING Feedback_Count > 0
ORDER BY Avg_Rating DESC`
  },
  {
    id: 'Q15', category: 'Aggregation', title: 'Payment Method Distribution',
    description: 'Counts and totals payments grouped by payment method.',
    tags: ['COUNT', 'SUM', 'GROUP BY'],
    sql: `SELECT Payment_Method,
       COUNT(*) AS Transaction_Count,
       SUM(Amount) AS Total_Amount,
       ROUND(AVG(Amount), 2) AS Avg_Amount
FROM payment
WHERE Payment_Status = 'completed'
GROUP BY Payment_Method
ORDER BY Total_Amount DESC`
  },
  {
    id: 'Q16', category: 'Aggregation', title: 'Order Count by Status',
    description: 'Groups all orders by status to show the pipeline breakdown.',
    tags: ['COUNT', 'GROUP BY'],
    sql: `SELECT Order_Status,
       COUNT(*) AS Count,
       SUM(Total_Amount) AS Total_Amount
FROM orders
GROUP BY Order_Status
ORDER BY Count DESC`
  },
  // Subqueries
  {
    id: 'Q17', category: 'Subqueries', title: 'Customers Who Spent Above Average',
    description: 'Subquery computes the average order value; outer query finds customers exceeding it.',
    tags: ['SUBQUERY', 'AVG', 'HAVING'],
    sql: `SELECT c.Full_Name, c.Email,
       COUNT(o.Order_ID) AS Order_Count,
       SUM(o.Total_Amount) AS Total_Spent
FROM customer c
JOIN orders o ON o.Customer_ID = c.Customer_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY c.Customer_ID, c.Full_Name, c.Email
HAVING Total_Spent > (
    SELECT AVG(Total_Amount) FROM orders WHERE Order_Status != 'cancelled'
)
ORDER BY Total_Spent DESC`
  },
  {
    id: 'Q18', category: 'Subqueries', title: 'Menu Items Never Ordered',
    description: 'Finds menu items that do not appear in any order_item record using NOT IN.',
    tags: ['SUBQUERY', 'NOT IN'],
    sql: `SELECT mi.Item_Name, c.Category_Name, mi.Price, mi.Availability_Status
FROM menu_item mi
JOIN category c ON mi.Category_ID = c.Category_ID
WHERE mi.Menu_Item_ID NOT IN (
    SELECT DISTINCT Menu_Item_ID FROM order_item
)
ORDER BY c.Category_Name, mi.Item_Name`
  },
  {
    id: 'Q19', category: 'Subqueries', title: 'Top Customer Per Cafeteria',
    description: 'For each cafeteria, finds the customer who spent the most using a correlated subquery approach.',
    tags: ['SUBQUERY', 'GROUP BY', 'MAX'],
    sql: `SELECT ca.Cafeteria_Name, c.Full_Name AS Top_Customer,
       SUM(o.Total_Amount) AS Total_Spent
FROM orders o
JOIN customer c ON o.Customer_ID = c.Customer_ID
JOIN cafeteria ca ON o.Cafeteria_ID = ca.Cafeteria_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY ca.Cafeteria_ID, ca.Cafeteria_Name, o.Customer_ID, c.Full_Name
HAVING Total_Spent = (
    SELECT MAX(sub.cs)
    FROM (
        SELECT SUM(o2.Total_Amount) AS cs
        FROM orders o2
        WHERE o2.Cafeteria_ID = ca.Cafeteria_ID AND o2.Order_Status != 'cancelled'
        GROUP BY o2.Customer_ID
    ) sub
)
ORDER BY ca.Cafeteria_Name`
  },
  {
    id: 'Q20', category: 'Subqueries', title: 'Items With Above-Average Price in Their Category',
    description: 'Finds menu items priced above the average for their own category using a correlated subquery.',
    tags: ['SUBQUERY', 'CORRELATED', 'AVG'],
    sql: `SELECT mi.Item_Name, c.Category_Name, mi.Price,
       (SELECT ROUND(AVG(m2.Price),2) FROM menu_item m2 WHERE m2.Category_ID = mi.Category_ID) AS Category_Avg
FROM menu_item mi
JOIN category c ON mi.Category_ID = c.Category_ID
WHERE mi.Price > (
    SELECT AVG(m2.Price) FROM menu_item m2 WHERE m2.Category_ID = mi.Category_ID
)
ORDER BY c.Category_Name, mi.Price DESC`
  },
  // Reports
  {
    id: 'Q21', category: 'Reports', title: 'Monthly Revenue Summary',
    description: 'Groups completed orders by month to show month-over-month revenue trends.',
    tags: ['DATE_FORMAT', 'SUM', 'GROUP BY'],
    sql: `SELECT DATE_FORMAT(Order_DateTime, '%Y-%m') AS Month,
       COUNT(*) AS Orders,
       SUM(Total_Amount) AS Revenue,
       ROUND(AVG(Total_Amount), 2) AS Avg_Order
FROM orders
WHERE Order_Status != 'cancelled'
GROUP BY DATE_FORMAT(Order_DateTime, '%Y-%m')
ORDER BY Month DESC
LIMIT 12`
  },
  {
    id: 'Q22', category: 'Reports', title: 'Full Feedback Report',
    description: 'Detailed feedback report with student name, item, rating, comment and date.',
    tags: ['JOIN', 'FEEDBACK', 'REPORT'],
    sql: `SELECT f.Feedback_ID, c.Full_Name AS Student, c.Email,
       mi.Item_Name, cat.Category_Name, f.Rating, f.Comment, f.Feedback_Date,
       CASE
           WHEN f.Rating >= 4 THEN 'Positive'
           WHEN f.Rating = 3 THEN 'Neutral'
           ELSE 'Negative'
       END AS Sentiment
FROM feedback f
JOIN customer c ON f.Customer_ID = c.Customer_ID
JOIN menu_item mi ON f.Menu_Item_ID = mi.Menu_Item_ID
JOIN category cat ON mi.Category_ID = cat.Category_ID
ORDER BY f.Feedback_Date DESC`
  },
  {
    id: 'Q23', category: 'Reports', title: 'Inventory Stock Status Report',
    description: 'Full inventory report with stock levels, reorder status and supplier info.',
    tags: ['JOIN', 'CASE', 'INVENTORY'],
    sql: `SELECT ii.Item_Name, ii.Unit, ii.Current_Stock, ii.Reorder_Level,
       s.Supplier_Name, s.Contact_Phone,
       CASE
           WHEN ii.Current_Stock = 0 THEN 'OUT OF STOCK'
           WHEN ii.Current_Stock <= ii.Reorder_Level THEN 'LOW STOCK'
           WHEN ii.Current_Stock <= ii.Reorder_Level * 1.5 THEN 'MODERATE'
           ELSE 'SUFFICIENT'
       END AS Stock_Status,
       ii.Inventory_Status
FROM inventory_item ii
LEFT JOIN supplier s ON ii.Supplier_ID = s.Supplier_ID
ORDER BY Stock_Status, ii.Item_Name`
  },
  {
    id: 'Q24', category: 'Reports', title: 'Active Offers and Discount Impact',
    description: 'Shows active offers along with how many orders used them and total discount given.',
    tags: ['JOIN', 'SUM', 'OFFER'],
    sql: `SELECT o.Offer_Name, o.Discount_Type, o.Discount_Value,
       o.Valid_From, o.Valid_Until, o.Status,
       COUNT(oo.Order_ID) AS Times_Used,
       COALESCE(SUM(oo.Discount_Applied), 0) AS Total_Discount
FROM offer o
LEFT JOIN order_offer oo ON oo.Offer_ID = o.Offer_ID
GROUP BY o.Offer_ID, o.Offer_Name, o.Discount_Type, o.Discount_Value, o.Valid_From, o.Valid_Until, o.Status
ORDER BY o.Status DESC, Times_Used DESC`
  },
  {
    id: 'Q25', category: 'Reports', title: 'Customer Ordering Frequency',
    description: 'Ranks customers by number of orders, total spend and last order date.',
    tags: ['COUNT', 'SUM', 'MAX', 'GROUP BY'],
    sql: `SELECT c.Full_Name, c.Email, c.Phone,
       COUNT(o.Order_ID) AS Total_Orders,
       SUM(o.Total_Amount) AS Total_Spent,
       MAX(o.Order_DateTime) AS Last_Order,
       ROUND(AVG(o.Total_Amount), 2) AS Avg_Order_Value
FROM customer c
LEFT JOIN orders o ON o.Customer_ID = c.Customer_ID AND o.Order_Status != 'cancelled'
GROUP BY c.Customer_ID, c.Full_Name, c.Email, c.Phone
ORDER BY Total_Spent DESC`
  },
];

const CATEGORIES = ['All', 'Basic', 'JOINs', 'Aggregation', 'Subqueries', 'Reports'];

export default function DbQueryLab() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [errorMap, setErrorMap] = useState({});
  const [showSQL, setShowSQL] = useState({});

  const filtered = QUERIES.filter(q => {
    if (activeCategory !== 'All' && q.category !== activeCategory) return false;
    if (searchText && !q.title.toLowerCase().includes(searchText.toLowerCase()) &&
      !q.description.toLowerCase().includes(searchText.toLowerCase()) &&
      !q.tags.some(t => t.toLowerCase().includes(searchText.toLowerCase()))) return false;
    return true;
  });

  async function runQuery(q) {
    setLoadingMap(m => ({ ...m, [q.id]: true }));
    setErrorMap(m => ({ ...m, [q.id]: null }));
    try {
      const data = await runDbQuery(q.sql);
      setResults(r => ({ ...r, [q.id]: data }));
    } catch (e) {
      setErrorMap(m => ({ ...m, [q.id]: e.message }));
    } finally {
      setLoadingMap(m => ({ ...m, [q.id]: false }));
    }
  }

  function toggleSQL(id) {
    setShowSQL(s => ({ ...s, [id]: !s[id] }));
  }

  const categoryColors = {
    Basic: '#22c55e',
    JOINs: '#3b82f6',
    Aggregation: '#f59e0b',
    Subqueries: '#8b5cf6',
    Reports: '#f97316',
  };

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <FlaskConical size={22} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Query Lab</h2>
        </div>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>
          {QUERIES.length} ready-made queries about the Cafeteria, grouped by SQL concept. Press <strong>Run</strong> to see the answer, then <strong>Show SQL</strong> to see how the database computed it.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setActiveCategory(cat)}
              style={{
                padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                background: activeCategory === cat ? 'var(--primary)' : 'var(--bg-overlay)',
                color: activeCategory === cat ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${activeCategory === cat ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'all 0.15s',
              }}>
              {cat === 'All' ? `All ${QUERIES.length}` : `${cat} ${QUERIES.filter(q => q.category === cat).length}`}
            </button>
          ))}
          <div style={{ marginLeft: 'auto', position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Search questions, concepts…"
              style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, width: 220 }}
            />
          </div>
        </div>
      </div>

      {/* Query cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {filtered.map((q, idx) => (
          <div key={q.id} className="card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ background: categoryColors[q.category] + '25', color: categoryColors[q.category], borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                    {q.category}
                  </span>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>{q.title}</h3>
                </div>
                <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5 }}>{q.description}</p>
                <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                  {q.tags.map(t => (
                    <span key={t} style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 7px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t}</span>
                  ))}
                </div>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace', marginLeft: 16, flexShrink: 0 }}>{q.id}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => runQuery(q)} disabled={loadingMap[q.id]}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, cursor: loadingMap[q.id] ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: loadingMap[q.id] ? 0.7 : 1 }}>
                <Play size={14} fill="currentColor" /> {loadingMap[q.id] ? 'Running…' : 'Run'}
              </button>
              <button onClick={() => toggleSQL(q.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'var(--bg-overlay)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 13 }}>
                <Code size={14} /> Show SQL {showSQL[q.id] ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {showSQL[q.id] && (
              <pre style={{ marginTop: 14, background: '#0f0f13', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 16px', fontSize: 12, lineHeight: 1.7, overflowX: 'auto', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                {q.sql}
              </pre>
            )}

            {errorMap[q.id] && (
              <div style={{ marginTop: 12, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>
                ⚠ {errorMap[q.id]}
              </div>
            )}

            {results[q.id] && !errorMap[q.id] && (
              <div style={{ marginTop: 14 }}>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
                  {results[q.id].row_count} rows returned in {results[q.id].execution_ms}ms
                </div>
                <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-overlay)' }}>
                        {results[q.id].columns.map(col => (
                          <th key={col} style={{ padding: '8px 14px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {results[q.id].rows.slice(0, 20).map((row, ri) => (
                        <tr key={ri} style={{ borderBottom: '1px solid var(--border)' }}>
                          {results[q.id].columns.map(col => (
                            <td key={col} style={{ padding: '8px 14px', color: 'var(--text-primary)', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {row[col] === null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>NULL</span> : String(row[col])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {results[q.id].rows.length > 20 && (
                    <div style={{ padding: '8px 14px', color: 'var(--text-muted)', fontSize: 12, borderTop: '1px solid var(--border)' }}>
                      Showing 20 of {results[q.id].rows.length} rows
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            No queries found for "{searchText}"
          </div>
        )}
      </div>
    </div>
  );
}
