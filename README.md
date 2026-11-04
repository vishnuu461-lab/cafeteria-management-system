# ☕ CaféMS – College Cafeteria Management System
### DBMS Academic Project | CS1133 | IET, JK Lakshmipat University, Jaipur

---

## 🗂️ Project Structure
```
cafeteria_management_system/
├── backend/                  ← Node.js + Express REST API
│   ├── config/db.js          ← MySQL connection pool (mysql2/promise)
│   ├── routes/
│   │   ├── dashboard.js      ← /api/dashboard/stats
│   │   ├── customers.js      ← /api/customers  (CRUD)
│   │   ├── menu.js           ← /api/menu        (CRUD)
│   │   ├── orders.js         ← /api/orders      (CRUD + Transaction)
│   │   ├── payments.js       ← /api/payments    (CRUD)
│   │   ├── inventory.js      ← /api/inventory   (CRUD + stock txn)
│   │   ├── reports.js        ← /api/reports     (Analytics)
│   │   ├── offers.js         ← /api/offers + feedback
│   │   └── management.js     ← /api/cafeterias, counters, employees
│   ├── server.js             ← Express main server
│   └── .env                  ← DB credentials (set your MySQL password here!)
│
├── frontend/                 ← React + Vite SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx    ← Stats + 4 real-time charts
│   │   │   ├── Orders.jsx       ← Full order management
│   │   │   ├── Payments.jsx     ← Payment records
│   │   │   ├── MenuPage.jsx     ← Menu CRUD
│   │   │   ├── Categories.jsx   ← Category cards
│   │   │   ├── Customers.jsx    ← Customer CRUD + pagination
│   │   │   ├── Management.jsx   ← Cafeterias, Counters, Employees
│   │   │   ├── Inventory.jsx    ← Stock + transactions (triggers)
│   │   │   ├── Offers.jsx       ← Discounts + Feedback
│   │   │   └── Reports.jsx      ← 5 analytics charts
│   │   ├── services/api.js      ← All 50+ API calls via axios
│   │   ├── App.jsx              ← Router + Sidebar + Layout
│   │   └── index.css            ← Full design system (dark theme)
│   └── public/favicon.svg
│
└── database/
    ├── schema.sql             ← All 16 tables, views, procedures, triggers
    ├── sample_data.sql        ← Sample data for all 16 tables
    └── queries/
        └── MYSQL_QUERIES.sql  ← 70 documented SQL queries for viva
```

---

## ⚡ Quick Start (Local Setup)

### Prerequisites
- **MySQL 8.0+** running locally
- **Node.js 18+** installed

### Step 1 – Set up the Database
```sql
-- Open MySQL Workbench or terminal:
mysql -u root -p

-- Run the schema:
SOURCE path/to/database/schema.sql;

-- Seed sample data:
SOURCE path/to/database/sample_data.sql;
```

### Step 2 – Configure Backend
```bash
cd backend
# Edit .env and set your MySQL password:
DB_PASSWORD=your_mysql_password_here
```

### Step 3 – Start Backend
```bash
cd backend
npm install   # if not done
npm start
# ✅ API running at http://localhost:5000
# ✅ Health: http://localhost:5000/health
```

### Step 4 – Start Frontend
```bash
cd frontend
npm install   # if not done
npm run dev
# ✅ App running at http://localhost:5173
```

---

## 🗄️ Database Architecture

### 16 Relational Tables
| # | Table | Type | Description |
|---|-------|------|-------------|
| 1 | CAFETERIA | Strong Entity | College cafeteria locations |
| 2 | COUNTER | Weak Entity (1:M CAFETERIA) | Food serving counters |
| 3 | CUSTOMER | Strong Entity | Students, faculty, visitors |
| 4 | EMPLOYEE | Weak Entity (1:M CAFETERIA) | Staff and cashiers |
| 5 | CATEGORY | Strong Entity | Menu categories |
| 6 | MENU_ITEM | Weak Entity (1:M CATEGORY) | Food and beverages |
| 7 | SUPPLIER | Strong Entity | Ingredient suppliers |
| 8 | INVENTORY_ITEM | Weak Entity (1:M SUPPLIER) | Stock ingredients |
| 9 | RECIPE_ITEM | Associative (M:N) | Menu ↔ Inventory link |
| 10 | ORDERS | Transaction Table | Customer food orders |
| 11 | ORDER_ITEM | Associative (M:N) | Order ↔ Menu link |
| 12 | PAYMENT | 1:1 with ORDERS | Payment records |
| 13 | STOCK_TRANSACTION | Audit Table | Stock movements |
| 14 | OFFER | Strong Entity | Discount offers |
| 15 | ORDER_OFFER | Associative (M:N) | Order ↔ Offer link |
| 16 | FEEDBACK | 1:0..1 with ORDERS | Customer reviews |

### Database Objects
- **6 Views** – vw_daily_sales, vw_low_stock_items, vw_order_summary, etc.
- **4 Stored Procedures** – sp_create_order, sp_process_payment, sp_daily_sales_report, etc.
- **4 Triggers** – Auto order total, payment status update, stock deduction, availability check
- **Custom Indexes** – Optimized for date filters, foreign keys, status checks

---

## 🔌 REST API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |
| GET | `/api/dashboard/stats` | All dashboard metrics |
| GET/POST | `/api/customers` | List + create customers |
| GET/PUT/DELETE | `/api/customers/:id` | Customer CRUD |
| GET/POST | `/api/menu` | Menu items list + create |
| GET/PUT/DELETE | `/api/menu/:id` | Menu item CRUD |
| GET/POST | `/api/orders` | Orders list + create |
| PATCH | `/api/orders/:id/status` | Update order status |
| GET/POST | `/api/payments` | Payments + record |
| GET | `/api/payments/summary` | Payment analytics |
| GET/POST | `/api/inventory` | Inventory list + create |
| POST | `/api/inventory/stock-transaction` | Record stock movement |
| GET | `/api/inventory/suppliers/all` | All suppliers |
| GET | `/api/reports/daily-sales` | Revenue by day |
| GET | `/api/reports/top-items` | Best-selling items |
| GET | `/api/reports/category-sales` | Revenue by category |
| GET | `/api/reports/customer-analysis` | Customer segmentation |
| GET | `/api/reports/feedback-analysis` | Rating analytics |
| GET/POST | `/api/offers` | Offers management |
| GET | `/api/offers/active` | Currently valid offers |
| GET/POST | `/api/offers/feedback/all` | Feedback records |
| GET/POST | `/api/categories` | Category CRUD |
| GET/POST | `/api/cafeterias` | Cafeteria management |
| GET/POST | `/api/counters` | Counter management |
| GET/POST | `/api/employees` | Employee management |

---

## 📊 SQL Queries (Viva Reference)
The file `database/queries/MYSQL_QUERIES.sql` contains **70 documented queries** covering:
- SELECT with JOINs (INNER, LEFT, RIGHT)
- GROUP BY + HAVING + Aggregate Functions
- Subqueries and Nested Queries
- Window Functions (RANK, ROW_NUMBER)
- CASE WHEN conditional logic
- Stored Procedures and Triggers explanation
- View creation and usage
- Index optimisation examples

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|-----------|
| Database | MySQL 8.0 |
| Backend | Node.js 18, Express 4 |
| DB Driver | mysql2/promise (connection pool) |
| Frontend | React 18, Vite 6 |
| Charts | Recharts |
| Icons | Lucide React |
| HTTP Client | Axios |
| Notifications | React Hot Toast |
| Routing | React Router DOM v6 |
| Fonts | Plus Jakarta Sans (Google Fonts) |

---

## 🎓 Viva Preparation Tips
1. **ER Diagram** – Know all 16 entities, their attributes, and cardinalities (1:1, 1:M, M:N)
2. **Normalization** – All tables are in 3NF; explain why RECIPE_ITEM, ORDER_ITEM, ORDER_OFFER are associative tables
3. **Triggers** – Explain all 4 triggers: what fires them, and what they do automatically
4. **Views** – Know all 6 views and the JOIN logic behind each
5. **Stored Procedures** – Walk through `sp_create_order` step by step
6. **SQL Queries** – Refer to MYSQL_QUERIES.sql and be ready to explain any of the 70 queries

---

*CS1133 – Database Management Systems | IET JKLU | 2026*
