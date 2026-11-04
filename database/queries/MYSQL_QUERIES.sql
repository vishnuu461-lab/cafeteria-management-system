-- ============================================================
--  MYSQL QUERIES DOCUMENTATION
--  Cafeteria Management System
--  CS1133 – Database Management Systems
--  Institute of Engineering and Technology (IET), JKLU, Jaipur
-- ============================================================
--  HOW TO USE THIS FILE
--  Open this file in MySQL Workbench.
--  Run each section one at a time.
--  Read the comments before each query to understand what it does.
-- ============================================================

-- ==========================================
-- SECTION 1: DATABASE CREATION
-- ==========================================

-- ==========================================
-- QUERY 1: CREATE DATABASE
-- ==========================================
-- Purpose:
--   Creates a brand-new database called cafeteria_management.
--
-- What it does:
--   Tells MySQL to set aside a new storage container for our project.
--   All our tables will be stored inside this database.
--   IF NOT EXISTS prevents an error if the database already exists.
--   CHARACTER SET utf8mb4 allows Hindi characters and emojis.
--
-- Why we use it:
--   Before creating tables, we must have a database to hold them.
--
-- Expected output:
--   "Query OK, 1 row affected"
--
-- Used in: database/schema.sql (first line of setup)

CREATE DATABASE IF NOT EXISTS cafeteria_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- ==========================================
-- QUERY 2: USE DATABASE
-- ==========================================
-- Purpose:
--   Selects cafeteria_management as the active database.
--
-- What it does:
--   All subsequent queries will run inside this database.
--   Without this, MySQL does not know which database to use.
--
-- Expected output:
--   "Database changed"

USE cafeteria_management;


-- ==========================================
-- SECTION 2: TABLE CREATION
-- ==========================================

-- ==========================================
-- QUERY 3: CREATE TABLE CAFETERIA
-- ==========================================
-- Purpose:
--   Stores information about each cafeteria location on campus.
--
-- What it does:
--   Creates the CAFETERIA table with 6 columns.
--   AUTO_INCREMENT: MySQL automatically assigns the next number as the ID.
--   NOT NULL: these columns cannot be left empty.
--   DEFAULT: if no value is given, MySQL uses this default value.
--   ENUM: restricts the column to specific allowed values only.
--   CHECK: ensures Closing_Time is always after Opening_Time.
--
-- Why we use it:
--   We need a place to store cafeteria name, location and operating hours.
--
-- Example output after inserting data:
--   +-------------+------------------------+------------------+--------------+--------------+------------------+
--   | Cafeteria_ID| Cafeteria_Name         | Building_Name    | Opening_Time | Closing_Time | Cafeteria_Status |
--   +-------------+------------------------+------------------+--------------+--------------+------------------+
--   | 1           | Main Campus Cafeteria  | Academic Block A | 07:30:00     | 21:00:00     | open             |
--   +-------------+------------------------+------------------+--------------+--------------+------------------+
--
-- Used in: database/schema.sql

CREATE TABLE CAFETERIA (
    Cafeteria_ID     INT           NOT NULL AUTO_INCREMENT,
    Cafeteria_Name   VARCHAR(100)  NOT NULL,
    Building_Name    VARCHAR(100)  NOT NULL,
    Opening_Time     TIME          NOT NULL,
    Closing_Time     TIME          NOT NULL,
    Cafeteria_Status ENUM('open','closed','under_maintenance') NOT NULL DEFAULT 'open',
    CONSTRAINT pk_cafeteria PRIMARY KEY (Cafeteria_ID),
    CONSTRAINT chk_cafe_times CHECK (Closing_Time > Opening_Time)
);

-- ==========================================
-- QUERY 4: CREATE TABLE ORDERS (Transaction Table)
-- ==========================================
-- Purpose:
--   Stores each customer order, linking customer, cafeteria, counter, and employee.
--
-- What it does:
--   Creates the ORDERS table with foreign keys to 4 other tables.
--   DECIMAL(12,2): stores money values with 2 decimal places.
--   TINYINT(1): used as a boolean (0 = No, 1 = Yes) for Inventory_Deducted.
--   DEFAULT CURRENT_TIMESTAMP: automatically records the exact date and time.
--   Multiple CONSTRAINT lines define named foreign key constraints.
--
-- Why we use it:
--   Every order must be connected to a customer, cafeteria, counter and an employee.
--   Foreign keys enforce this connection so no orphan records exist.
--
-- Relationship: CUSTOMER (1) -> ORDERS (M)
--               CAFETERIA (1) -> ORDERS (M)
--               COUNTER   (1) -> ORDERS (M)
--               EMPLOYEE  (1) -> ORDERS (M)

CREATE TABLE ORDERS (
    Order_ID           INT            NOT NULL AUTO_INCREMENT,
    Customer_ID        INT            NOT NULL,
    Cafeteria_ID       INT            NOT NULL,
    Counter_ID         INT            NOT NULL,
    Employee_ID        INT            NOT NULL,
    Order_DateTime     DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Order_Type         ENUM('dine_in','takeaway','online') NOT NULL DEFAULT 'dine_in',
    Order_Status       ENUM('pending','confirmed','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'pending',
    Subtotal           DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    Tax_Amount         DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    Discount_Amount    DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    Total_Amount       DECIMAL(12,2)  NOT NULL DEFAULT 0.00,
    Payment_Status     ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    Inventory_Deducted TINYINT(1)     NOT NULL DEFAULT 0,
    CONSTRAINT pk_orders       PRIMARY KEY (Order_ID),
    CONSTRAINT fk_order_cust   FOREIGN KEY (Customer_ID)  REFERENCES CUSTOMER(Customer_ID),
    CONSTRAINT fk_order_cafe   FOREIGN KEY (Cafeteria_ID) REFERENCES CAFETERIA(Cafeteria_ID),
    CONSTRAINT fk_order_counter FOREIGN KEY (Counter_ID)  REFERENCES COUNTER(Counter_ID),
    CONSTRAINT fk_order_emp    FOREIGN KEY (Employee_ID)  REFERENCES EMPLOYEE(Employee_ID)
);


-- ==========================================
-- SECTION 3: PRIMARY KEYS AND FOREIGN KEYS
-- ==========================================

-- ==========================================
-- QUERY 5: VIEW ALL PRIMARY KEYS IN THE DATABASE
-- ==========================================
-- Purpose:
--   Lists all primary key constraints defined across all our tables.
--
-- What it does:
--   Queries the INFORMATION_SCHEMA (MySQL's built-in system database).
--   Filters by CONSTRAINT_TYPE = 'PRIMARY KEY'.
--   Shows which column is the primary key for each table.
--
-- Why we use it:
--   Useful for verifying that every table has a primary key defined.
--
-- Expected output (sample):
--   TABLE_NAME  | COLUMN_NAME      | CONSTRAINT_NAME
--   CAFETERIA   | Cafeteria_ID     | pk_cafeteria
--   CUSTOMER    | Customer_ID      | pk_customer

SELECT
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE CONSTRAINT_SCHEMA = 'cafeteria_management'
  AND CONSTRAINT_NAME LIKE 'pk_%'
ORDER BY TABLE_NAME;

-- ==========================================
-- QUERY 6: VIEW ALL FOREIGN KEYS IN THE DATABASE
-- ==========================================
-- Purpose:
--   Lists all foreign key constraints to see how tables are connected.
--
-- Why we use it:
--   Helps explain the relational model to a professor.
--   Shows that data integrity is enforced at the database level.
--
-- Expected output (sample):
--   TABLE_NAME   | COLUMN_NAME    | REFERENCED_TABLE | REFERENCED_COLUMN
--   COUNTER      | Cafeteria_ID   | CAFETERIA        | Cafeteria_ID
--   ORDERS       | Customer_ID    | CUSTOMER         | Customer_ID

SELECT
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.REFERENCED_TABLE_NAME  AS REFERENCED_TABLE,
    kcu.REFERENCED_COLUMN_NAME AS REFERENCED_COLUMN,
    kcu.CONSTRAINT_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
JOIN INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
  ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
 AND kcu.TABLE_SCHEMA    = tc.TABLE_SCHEMA
WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
  AND kcu.TABLE_SCHEMA   = 'cafeteria_management'
ORDER BY kcu.TABLE_NAME;


-- ==========================================
-- SECTION 4: INSERTING RECORDS
-- ==========================================

-- ==========================================
-- QUERY 7: INSERT A NEW CUSTOMER
-- ==========================================
-- Purpose:
--   Adds a new student customer to the CUSTOMER table.
--
-- What it does:
--   INSERT INTO specifies the table and columns to fill.
--   VALUES provides the actual data to insert.
--   Created_At will automatically be set to the current timestamp (DEFAULT).
--
-- Why we use it:
--   When a new student registers in the cafeteria system.
--
-- Expected output:
--   "Query OK, 1 row affected"
--   New Customer_ID will be auto-generated.

INSERT INTO CUSTOMER (Full_Name, Phone, Email, Customer_Type, Account_Status)
VALUES ('Aarav Joshi', '9898765432', 'aarav.joshi@jklu.edu.in', 'student', 'active');

-- ==========================================
-- QUERY 8: INSERT A NEW MENU ITEM
-- ==========================================
-- Purpose:
--   Adds a new food item to the menu under a specific category.
--
-- What it does:
--   Category_ID = 1 means it belongs to the 'South Indian' category.
--   Price and Tax_Rate are stored as DECIMAL.
--
-- Why we use it:
--   When the cafeteria introduces a new dish on the menu.

INSERT INTO MENU_ITEM (Category_ID, Item_Code, Item_Name, Description, Price, Prep_Time_Min, Availability_Status, Tax_Rate)
VALUES (1, 'SI005', 'Rava Dosa', 'Crispy semolina crepe with chutneys', 55.00, 8, 'available', 5.00);

-- ==========================================
-- QUERY 9: INSERT A NEW ORDER
-- ==========================================
-- Purpose:
--   Creates a new order record for a customer.
--
-- What it does:
--   Inserts a new row into ORDERS with the customer, cafeteria, counter and employee IDs.
--   Order starts with 'pending' status and 'unpaid' payment status.
--
-- Why we use it:
--   Every time a customer places an order at a counter.

INSERT INTO ORDERS (Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_Type)
VALUES (1, 1, 1, 2, 'dine_in');

-- ==========================================
-- QUERY 10: INSERT AN ORDER ITEM
-- ==========================================
-- Purpose:
--   Adds a food item to an existing order.
--
-- What it does:
--   Records which menu item (Masala Dosa, price ₹45) was added to Order #16.
--   Line_Total = Quantity × Unit_Price × (1 + Tax_Rate/100) = 1 × 45 × 1.05 = ₹47.25

INSERT INTO ORDER_ITEM (Order_ID, Menu_Item_ID, Quantity, Unit_Price, Tax_Rate, Line_Total)
VALUES (16, 1, 1, 45.00, 5.00, 47.25);


-- ==========================================
-- SECTION 5: RETRIEVING RECORDS (SELECT)
-- ==========================================

-- ==========================================
-- QUERY 11: SELECT ALL CUSTOMERS
-- ==========================================
-- Purpose:
--   Retrieves all customer records from the CUSTOMER table.
--
-- What it does:
--   SELECT *: the asterisk (*) means select ALL columns.
--   FROM CUSTOMER: specifies the table to read from.
--
-- Why we use it:
--   Used in the Student/Customer Management page to display all customers.
--
-- Expected output:
--   All rows from CUSTOMER table with all columns.

SELECT * FROM CUSTOMER;

-- ==========================================
-- QUERY 12: SELECT SPECIFIC COLUMNS
-- ==========================================
-- Purpose:
--   Retrieves only the needed columns to avoid fetching unnecessary data.
--
-- What it does:
--   Instead of *, we name only the columns we need.
--   ORDER BY Full_Name sorts results alphabetically.
--
-- Why we use it:
--   Better performance – fetching only necessary data.

SELECT Customer_ID, Full_Name, Phone, Customer_Type, Account_Status
FROM CUSTOMER
ORDER BY Full_Name ASC;

-- ==========================================
-- QUERY 13: SELECT ALL AVAILABLE MENU ITEMS
-- ==========================================
-- Purpose:
--   Shows which menu items are currently available for ordering.
--
-- What it does:
--   WHERE filters rows based on a condition.
--   Only rows where Availability_Status = 'available' are returned.

SELECT Menu_Item_ID, Item_Code, Item_Name, Price, Tax_Rate
FROM MENU_ITEM
WHERE Availability_Status = 'available'
ORDER BY Item_Name ASC;

-- ==========================================
-- QUERY 14: SELECT ALL ORDERS FOR TODAY
-- ==========================================
-- Purpose:
--   Retrieves only the orders placed today.
--
-- What it does:
--   DATE(Order_DateTime): extracts only the date part from the datetime.
--   CURDATE(): returns today's date.
--   Comparing them gives us only today's orders.

SELECT Order_ID, Customer_ID, Total_Amount, Order_Status, Payment_Status, Order_DateTime
FROM ORDERS
WHERE DATE(Order_DateTime) = CURDATE()
ORDER BY Order_DateTime DESC;


-- ==========================================
-- SECTION 6: UPDATING RECORDS
-- ==========================================

-- ==========================================
-- QUERY 15: UPDATE ORDER STATUS
-- ==========================================
-- Purpose:
--   Changes an order's status from 'preparing' to 'ready'.
--
-- What it does:
--   UPDATE: tells MySQL which table to modify.
--   SET: specifies the column and new value.
--   WHERE: limits the update to only the specified Order_ID.
--
-- Why we use it:
--   When a cook finishes preparing an order, staff update its status.
--   Without WHERE, ALL orders would be updated – dangerous!
--
-- Expected output:
--   "Query OK, 1 row affected, 1 row changed"

UPDATE ORDERS
SET Order_Status = 'ready'
WHERE Order_ID = 9;

-- ==========================================
-- QUERY 16: UPDATE INVENTORY STOCK
-- ==========================================
-- Purpose:
--   Adds newly purchased stock to an inventory item.
--
-- What it does:
--   Current_Stock = Current_Stock + 25.0 increases stock by 25 kg.
--   Only updates the specific InventoryItem where Item_Code = 'INV001'.

UPDATE INVENTORY_ITEM
SET Current_Stock = Current_Stock + 25.000
WHERE Item_Code = 'INV001';

-- ==========================================
-- QUERY 17: MARK CUSTOMER ACCOUNT AS SUSPENDED
-- ==========================================
-- Purpose:
--   Suspends a customer account.
--
-- Why we use it:
--   If a customer misuses the cafeteria system.

UPDATE CUSTOMER
SET Account_Status = 'suspended'
WHERE Customer_ID = 10;

-- Reset the suspension for our demo
UPDATE CUSTOMER SET Account_Status = 'active' WHERE Customer_ID = 10;


-- ==========================================
-- SECTION 7: DELETING RECORDS
-- ==========================================

-- ==========================================
-- QUERY 18: DELETE A MENU ITEM (Safe — checking for dependencies first)
-- ==========================================
-- Purpose:
--   Demonstrates how to safely delete a menu item.
--
-- What it does:
--   First we check if the item is used in any ORDER_ITEM or RECIPE_ITEM.
--   If it is, we set it as 'unavailable' instead of deleting (safer for a live system).
--
-- Why we use it:
--   You cannot delete a menu item if it is referenced in past orders.
--   ON DELETE RESTRICT in the schema prevents accidental deletion.

-- Safe approach: mark as unavailable
UPDATE MENU_ITEM
SET Availability_Status = 'unavailable'
WHERE Item_Code = 'SI005';

-- Hard delete only if no references exist (for items with no order history)
-- DO NOT run this on items that have been ordered!
-- DELETE FROM MENU_ITEM WHERE Item_Code = 'SI005' AND Menu_Item_ID NOT IN (SELECT DISTINCT Menu_Item_ID FROM ORDER_ITEM);

-- ==========================================
-- QUERY 19: DELETE AN OLD PENDING ORDER
-- ==========================================
-- Purpose:
--   Removes old 'cancelled' orders that are no longer needed.
--
-- What it does:
--   Deletes orders that were cancelled more than 30 days ago.
--   Cascade delete: ORDER_ITEM records for this order are also deleted automatically.
--
-- Why we use it:
--   Database cleanup to free space and maintain performance.

DELETE FROM ORDERS
WHERE Order_Status = 'cancelled'
  AND Order_DateTime < DATE_SUB(NOW(), INTERVAL 30 DAY);


-- ==========================================
-- SECTION 8: WHERE AND LIKE
-- ==========================================

-- ==========================================
-- QUERY 20: SEARCH CUSTOMER BY NAME (LIKE)
-- ==========================================
-- Purpose:
--   Searches for customers whose name contains a specific keyword.
--
-- What it does:
--   LIKE is used for pattern matching in text fields.
--   % is a wildcard that means "any characters before or after".
--   '%Arjun%' matches names containing 'Arjun' anywhere.
--
-- Why we use it:
--   Powers the search bar in the Customer Management page.
--
-- Expected output:
--   Customer_ID=1, Full_Name='Arjun Sharma', ...

SELECT Customer_ID, Full_Name, Phone, Email, Customer_Type
FROM CUSTOMER
WHERE Full_Name LIKE '%Arjun%';

-- ==========================================
-- QUERY 21: SEARCH MENU ITEM BY NAME OR CODE
-- ==========================================
-- Purpose:
--   Searches for menu items using partial name or item code.
--
-- What it does:
--   OR lets us match either the name or the code condition.

SELECT Menu_Item_ID, Item_Code, Item_Name, Price
FROM MENU_ITEM
WHERE Item_Name LIKE '%Dosa%'
   OR Item_Code LIKE '%SI%'
ORDER BY Item_Name;

-- ==========================================
-- QUERY 22: FILTER ORDERS BY STATUS AND DATE RANGE
-- ==========================================
-- Purpose:
--   Finds all delivered orders within a specific date range.
--
-- What it does:
--   BETWEEN ... AND ... selects rows where the value is in that range.
--   Combined with Order_Status = 'delivered' using AND.

SELECT Order_ID, Customer_ID, Total_Amount, Order_DateTime
FROM ORDERS
WHERE Order_Status = 'delivered'
  AND Order_DateTime BETWEEN '2026-11-01 00:00:00' AND '2026-11-03 23:59:59'
ORDER BY Order_DateTime DESC;


-- ==========================================
-- SECTION 9: ORDER BY
-- ==========================================

-- ==========================================
-- QUERY 23: TOP 5 MOST EXPENSIVE MENU ITEMS
-- ==========================================
-- Purpose:
--   Lists the 5 most expensive items on the menu.
--
-- What it does:
--   ORDER BY Price DESC: sorts from highest to lowest price.
--   LIMIT 5: shows only the first 5 results.
--
-- Why we use it:
--   Useful for analytics – which are the premium items?

SELECT Item_Name, Price, Tax_Rate
FROM MENU_ITEM
ORDER BY Price DESC
LIMIT 5;

-- ==========================================
-- QUERY 24: LATEST ORDERS FIRST
-- ==========================================
-- Purpose:
--   Shows newest orders at the top of the list.
--
-- What it does:
--   ORDER BY Order_DateTime DESC: newest orders appear first.
--   LIMIT 10: only shows the 10 most recent orders.

SELECT Order_ID, Customer_ID, Total_Amount, Order_Status, Order_DateTime
FROM ORDERS
ORDER BY Order_DateTime DESC
LIMIT 10;


-- ==========================================
-- SECTION 10: GROUP BY AND HAVING
-- ==========================================

-- ==========================================
-- QUERY 25: COUNT ORDERS BY STATUS
-- ==========================================
-- Purpose:
--   Counts how many orders are in each status.
--
-- What it does:
--   GROUP BY groups all rows that have the same Order_Status together.
--   COUNT(*): counts the number of rows in each group.
--   ORDER BY Order_Count DESC: status with most orders appears first.
--
-- Expected output:
--   Order_Status | Order_Count
--   delivered    | 10
--   pending      | 3
--   preparing    | 1

SELECT Order_Status, COUNT(*) AS Order_Count
FROM ORDERS
GROUP BY Order_Status
ORDER BY Order_Count DESC;

-- ==========================================
-- QUERY 26: TOTAL REVENUE PER CAFETERIA
-- ==========================================
-- Purpose:
--   Shows which cafeteria earns the most revenue.
--
-- What it does:
--   JOIN connects ORDERS with CAFETERIA to get the cafeteria name.
--   GROUP BY Cafeteria_Name groups all orders by cafeteria.
--   SUM(Total_Amount) adds up all order amounts in each group.

SELECT
    cf.Cafeteria_Name,
    COUNT(o.Order_ID)    AS Total_Orders,
    SUM(o.Total_Amount)  AS Total_Revenue,
    AVG(o.Total_Amount)  AS Avg_Order_Value
FROM ORDERS o
JOIN CAFETERIA cf ON o.Cafeteria_ID = cf.Cafeteria_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY cf.Cafeteria_Name
ORDER BY Total_Revenue DESC;

-- ==========================================
-- QUERY 27: CAFETERIAS WITH MORE THAN 5 ORDERS (HAVING)
-- ==========================================
-- Purpose:
--   Shows cafeterias that have processed at least 5 orders.
--
-- What it does:
--   HAVING is like WHERE but works AFTER GROUP BY.
--   WHERE filters rows BEFORE grouping. HAVING filters AFTER grouping.
--   WHERE cannot use aggregate functions like COUNT, SUM – HAVING can.
--
-- Example:
--   WHERE Total_Orders > 5   -- WRONG (cannot use alias in WHERE)
--   HAVING Total_Orders > 5  -- CORRECT (works after GROUP BY)

SELECT
    cf.Cafeteria_Name,
    COUNT(o.Order_ID) AS Total_Orders
FROM ORDERS o
JOIN CAFETERIA cf ON o.Cafeteria_ID = cf.Cafeteria_ID
GROUP BY cf.Cafeteria_Name
HAVING Total_Orders > 5
ORDER BY Total_Orders DESC;


-- ==========================================
-- SECTION 11: AGGREGATE FUNCTIONS
-- ==========================================

-- ==========================================
-- QUERY 28: DASHBOARD STATISTICS
-- ==========================================
-- Purpose:
--   Retrieves key statistics for the admin dashboard.
--
-- What it does:
--   COUNT(*): total number of rows in the table.
--   SUM(): sum of a numeric column.
--   AVG(): average value.
--   MAX() / MIN(): highest and lowest values.
--
-- These values power the dashboard cards (non-hardcoded, real data).

SELECT
    (SELECT COUNT(*) FROM CUSTOMER WHERE Account_Status = 'active')      AS Active_Customers,
    (SELECT COUNT(*) FROM MENU_ITEM WHERE Availability_Status = 'available') AS Available_Menu_Items,
    (SELECT COUNT(*) FROM ORDERS WHERE DATE(Order_DateTime) = CURDATE()) AS Today_Orders,
    (SELECT COALESCE(SUM(Total_Amount), 0) FROM ORDERS
     WHERE DATE(Order_DateTime) = CURDATE()
       AND Order_Status != 'cancelled')                                  AS Today_Revenue,
    (SELECT COUNT(*) FROM ORDERS WHERE Payment_Status = 'unpaid'
       AND Order_Status NOT IN ('cancelled'))                             AS Unpaid_Orders,
    (SELECT COUNT(*) FROM INVENTORY_ITEM
     WHERE Current_Stock <= Reorder_Level AND Inventory_Status = 'active') AS Low_Stock_Alerts;

-- ==========================================
-- QUERY 29: REVENUE STATISTICS
-- ==========================================
-- Purpose:
--   Computes revenue statistics across all completed orders.

SELECT
    COUNT(Order_ID)        AS Total_Orders,
    SUM(Total_Amount)      AS Total_Revenue,
    AVG(Total_Amount)      AS Avg_Order_Value,
    MAX(Total_Amount)      AS Highest_Order,
    MIN(Total_Amount)      AS Lowest_Order,
    SUM(Tax_Amount)        AS Total_Tax_Collected,
    SUM(Discount_Amount)   AS Total_Discounts_Given
FROM ORDERS
WHERE Order_Status != 'cancelled';


-- ==========================================
-- SECTION 12: INNER JOIN
-- ==========================================

-- ==========================================
-- QUERY 30: GET ORDERS WITH CUSTOMER NAMES
-- ==========================================
-- Purpose:
--   Shows order details along with the customer name.
--
-- What it does:
--   INNER JOIN: combines rows from ORDERS and CUSTOMER where Customer_ID matches.
--   Only rows that exist in BOTH tables are returned.
--   If a customer is deleted, their orders would NOT appear (referential integrity).
--
-- Why we use it:
--   The Order Management page needs to display customer names, not just IDs.

SELECT
    o.Order_ID,
    c.Full_Name      AS Customer_Name,
    c.Phone,
    o.Order_DateTime,
    o.Order_Type,
    o.Order_Status,
    o.Total_Amount,
    o.Payment_Status
FROM ORDERS o
INNER JOIN CUSTOMER c ON o.Customer_ID = c.Customer_ID
ORDER BY o.Order_DateTime DESC;

-- ==========================================
-- QUERY 31: FULL ORDER DETAILS WITH ALL JOINS
-- ==========================================
-- Purpose:
--   Shows complete order information including customer, cafeteria, counter, employee.
--
-- What it does:
--   Multiple INNER JOINs chain together to combine data from 5 tables.
--   Each JOIN links tables using their foreign key / primary key pairs.

SELECT
    o.Order_ID,
    c.Full_Name      AS Customer_Name,
    cf.Cafeteria_Name,
    ct.Counter_Name,
    e.Employee_Name  AS Served_By,
    o.Order_DateTime,
    o.Order_Type,
    o.Order_Status,
    o.Subtotal,
    o.Tax_Amount,
    o.Discount_Amount,
    o.Total_Amount,
    o.Payment_Status
FROM ORDERS o
INNER JOIN CUSTOMER  c   ON o.Customer_ID  = c.Customer_ID
INNER JOIN CAFETERIA cf  ON o.Cafeteria_ID = cf.Cafeteria_ID
INNER JOIN COUNTER   ct  ON o.Counter_ID   = ct.Counter_ID
INNER JOIN EMPLOYEE  e   ON o.Employee_ID  = e.Employee_ID
ORDER BY o.Order_DateTime DESC;

-- ==========================================
-- QUERY 32: ORDER ITEMS WITH MENU DETAILS
-- ==========================================
-- Purpose:
--   Lists all items in each order with the food item name and price.
--
-- Why we use it:
--   Used in the Order Details page to show what food items are in an order.

SELECT
    oi.Order_ID,
    mi.Item_Name,
    mi.Item_Code,
    cat.Category_Name,
    oi.Quantity,
    oi.Unit_Price,
    oi.Tax_Rate,
    oi.Line_Total
FROM ORDER_ITEM oi
INNER JOIN MENU_ITEM mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
INNER JOIN CATEGORY cat ON mi.Category_ID  = cat.Category_ID
WHERE oi.Order_ID = 6;


-- ==========================================
-- SECTION 13: LEFT JOIN AND RIGHT JOIN
-- ==========================================

-- ==========================================
-- QUERY 33: ALL MENU ITEMS WITH OR WITHOUT RECIPE
-- ==========================================
-- Purpose:
--   Shows all menu items, and for each, shows recipe details if available.
--   Items without any recipe will also appear (with NULL in recipe columns).
--
-- What it does:
--   LEFT JOIN: returns ALL rows from the LEFT table (MENU_ITEM).
--   Rows from the RIGHT table (RECIPE_ITEM) are shown if they match.
--   If no match, NULL is placed in the recipe columns.
--
-- Why we use it:
--   To check which menu items do not yet have any recipe defined.

SELECT
    mi.Item_Code,
    mi.Item_Name,
    mi.Price,
    inv.Item_Name AS Ingredient_Name,
    ri.Quantity_Required,
    inv.Unit
FROM MENU_ITEM mi
LEFT JOIN RECIPE_ITEM ri     ON mi.Menu_Item_ID     = ri.Menu_Item_ID
LEFT JOIN INVENTORY_ITEM inv ON ri.Inventory_Item_ID = inv.Inventory_Item_ID
ORDER BY mi.Item_Name, inv.Item_Name;

-- ==========================================
-- QUERY 34: ALL CUSTOMERS WITH OR WITHOUT ORDERS
-- ==========================================
-- Purpose:
--   Shows every customer, and if they have placed orders, shows order count.
--   Customers with no orders still appear (with 0).
--
-- Why we use it:
--   To identify customers who have never placed an order.

SELECT
    c.Customer_ID,
    c.Full_Name,
    c.Customer_Type,
    COUNT(o.Order_ID)   AS Total_Orders,
    COALESCE(SUM(o.Total_Amount), 0) AS Total_Spent
FROM CUSTOMER c
LEFT JOIN ORDERS o ON c.Customer_ID = o.Customer_ID AND o.Order_Status != 'cancelled'
GROUP BY c.Customer_ID, c.Full_Name, c.Customer_Type
ORDER BY Total_Orders DESC;

-- ==========================================
-- QUERY 35: ALL ORDERS WITH PAYMENT INFO (RIGHT JOIN)
-- ==========================================
-- Purpose:
--   Shows all payments, including their order details.
--   RIGHT JOIN: returns ALL rows from the RIGHT table (PAYMENT).
--
-- Note: In practice, LEFT JOIN is more commonly used. RIGHT JOIN is shown for completeness.

SELECT
    p.Payment_ID,
    p.Amount,
    p.Payment_Method,
    p.Payment_Status,
    p.Payment_DateTime,
    o.Order_ID,
    o.Order_Status
FROM ORDERS o
RIGHT JOIN PAYMENT p ON o.Order_ID = p.Order_ID
ORDER BY p.Payment_DateTime DESC;


-- ==========================================
-- SECTION 14: MULTIPLE TABLE JOINS
-- ==========================================

-- ==========================================
-- QUERY 36: PAYMENT REPORT WITH FULL ORDER DETAILS
-- ==========================================
-- Purpose:
--   Shows payment records with full order, customer, and cafeteria details.
--   This is used for the Payment Management page.

SELECT
    p.Payment_ID,
    o.Order_ID,
    c.Full_Name        AS Customer_Name,
    cf.Cafeteria_Name,
    o.Total_Amount     AS Order_Total,
    p.Amount           AS Amount_Paid,
    p.Payment_Method,
    p.Payment_Status,
    p.Transaction_Ref,
    p.Payment_DateTime
FROM PAYMENT p
JOIN ORDERS    o   ON p.Order_ID    = o.Order_ID
JOIN CUSTOMER  c   ON o.Customer_ID = c.Customer_ID
JOIN CAFETERIA cf  ON o.Cafeteria_ID = cf.Cafeteria_ID
ORDER BY p.Payment_DateTime DESC;

-- ==========================================
-- QUERY 37: FEEDBACK REPORT WITH ORDER AND CUSTOMER
-- ==========================================
-- Purpose:
--   Shows all feedback with the customer name and order information.

SELECT
    f.Feedback_ID,
    c.Full_Name        AS Customer_Name,
    o.Order_ID,
    cf.Cafeteria_Name,
    f.Rating,
    f.Feedback_Category,
    f.Comments,
    f.Feedback_Date
FROM FEEDBACK f
JOIN CUSTOMER  c  ON f.Customer_ID  = c.Customer_ID
JOIN ORDERS    o  ON f.Order_ID     = o.Order_ID
JOIN CAFETERIA cf ON o.Cafeteria_ID = cf.Cafeteria_ID
ORDER BY f.Feedback_Date DESC;


-- ==========================================
-- SECTION 15: SUBQUERIES
-- ==========================================

-- ==========================================
-- QUERY 38: CUSTOMERS WHO SPENT MORE THAN AVERAGE
-- ==========================================
-- Purpose:
--   Finds high-spending customers (above average).
--
-- What it does:
--   The inner query (subquery) calculates the average order amount.
--   The outer query compares each customer's total spending with the average.
--   A subquery is a query inside another query, enclosed in parentheses.
--
-- Why we use it:
--   Identifies VIP customers who may deserve loyalty benefits.

SELECT
    c.Full_Name,
    c.Customer_Type,
    SUM(o.Total_Amount)  AS Total_Spent
FROM CUSTOMER c
JOIN ORDERS o ON c.Customer_ID = o.Customer_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY c.Customer_ID, c.Full_Name, c.Customer_Type
HAVING Total_Spent > (
    SELECT AVG(Total_Amount)
    FROM ORDERS
    WHERE Order_Status != 'cancelled'
)
ORDER BY Total_Spent DESC;

-- ==========================================
-- QUERY 39: MENU ITEMS NEVER ORDERED
-- ==========================================
-- Purpose:
--   Finds menu items that have never appeared in any order.
--
-- What it does:
--   NOT IN subquery: the outer query returns menu items whose ID
--   does NOT appear in the ORDER_ITEM table.
--
-- Why we use it:
--   Helps identify slow-moving items that might be removed from the menu.

SELECT Item_Code, Item_Name, Price, Availability_Status
FROM MENU_ITEM
WHERE Menu_Item_ID NOT IN (
    SELECT DISTINCT Menu_Item_ID FROM ORDER_ITEM
)
ORDER BY Item_Name;

-- ==========================================
-- QUERY 40: MOST RECENTLY ORDERED MENU ITEM
-- ==========================================
-- Purpose:
--   Finds the menu item that was included in the most recent order.

SELECT mi.Item_Name, mi.Price, o.Order_DateTime
FROM MENU_ITEM mi
JOIN ORDER_ITEM oi ON mi.Menu_Item_ID = oi.Menu_Item_ID
JOIN ORDERS o ON oi.Order_ID = o.Order_ID
WHERE o.Order_DateTime = (
    SELECT MAX(Order_DateTime) FROM ORDERS WHERE Order_Status != 'cancelled'
);


-- ==========================================
-- SECTION 16: VIEWS
-- ==========================================

-- ==========================================
-- QUERY 41: USE THE vw_daily_sales VIEW
-- ==========================================
-- Purpose:
--   Retrieves daily sales from the pre-defined view.
--
-- What it does:
--   A VIEW is a virtual table based on a stored SELECT query.
--   Querying a view is like querying a regular table.
--   The complex GROUP BY logic is hidden inside the view definition.
--
-- Why we use it:
--   Simplifies repeated complex queries. Improves code readability.
--   Used in the Reports & Analytics page for the daily sales chart.

SELECT * FROM vw_daily_sales LIMIT 30;

-- ==========================================
-- QUERY 42: USE THE vw_low_stock_items VIEW
-- ==========================================
-- Purpose:
--   Lists all inventory items that need to be restocked.
--
-- Why we use it:
--   The dashboard shows a "Low Stock Alert" count using this view.

SELECT * FROM vw_low_stock_items;

-- ==========================================
-- QUERY 43: USE THE vw_menu_popularity VIEW
-- ==========================================
-- Purpose:
--   Shows which menu items are ordered most often.
--
-- Why we use it:
--   Powers the "Most Popular Items" chart in the analytics section.

SELECT * FROM vw_menu_popularity ORDER BY Times_Ordered DESC LIMIT 10;

-- ==========================================
-- QUERY 44: CREATE A CUSTOM VIEW (PAYMENT SUMMARY)
-- ==========================================
-- Purpose:
--   Creates a reusable view for payment method analysis.
--
-- What it does:
--   CREATE OR REPLACE VIEW: creates a new view or replaces an existing one.
--   Every time you SELECT from this view, the latest data is shown.

CREATE OR REPLACE VIEW vw_payment_summary AS
SELECT
    Payment_Method,
    COUNT(Payment_ID)   AS Total_Transactions,
    SUM(Amount)         AS Total_Amount,
    AVG(Amount)         AS Avg_Transaction
FROM PAYMENT
WHERE Payment_Status = 'completed'
GROUP BY Payment_Method
ORDER BY Total_Amount DESC;

-- Use the new view
SELECT * FROM vw_payment_summary;


-- ==========================================
-- SECTION 17: INDEXES
-- ==========================================

-- ==========================================
-- QUERY 45: CREATE AN INDEX ON ORDER DATE
-- ==========================================
-- Purpose:
--   Speeds up queries that filter or sort orders by date.
--
-- What it does:
--   An INDEX is like a book's index – it helps MySQL find data faster.
--   Without an index, MySQL reads EVERY row (full table scan).
--   With an index, MySQL jumps directly to relevant rows.
--
-- Why we use it:
--   The dashboard, reports, and order list all filter by date frequently.
--
-- Trade-off:
--   Indexes speed up SELECT but slightly slow down INSERT/UPDATE/DELETE.

CREATE INDEX idx_orders_datetime ON ORDERS(Order_DateTime);

-- ==========================================
-- QUERY 46: VIEW EXISTING INDEXES ON ORDERS TABLE
-- ==========================================
-- Purpose:
--   Shows all indexes defined on the ORDERS table.

SHOW INDEX FROM ORDERS;

-- ==========================================
-- QUERY 47: DROP AN INDEX (if not needed)
-- ==========================================
-- Purpose:
--   Demonstrates how to remove an index.
--
-- Note:
--   We usually don't drop indexes unless they hurt performance.

-- DROP INDEX idx_orders_datetime ON ORDERS;  -- commented out – do not run


-- ==========================================
-- SECTION 18: TRANSACTIONS
-- ==========================================

-- ==========================================
-- QUERY 48: TRANSACTION – PLACE AN ORDER ATOMICALLY
-- ==========================================
-- Purpose:
--   Places an order and records the payment in a single atomic transaction.
--
-- What it does:
--   START TRANSACTION: begins a transaction block.
--   All queries inside run together. Either ALL succeed or ALL are undone.
--   COMMIT: saves all changes permanently.
--   ROLLBACK: undoes all changes if something went wrong.
--   SAVEPOINT: a point within the transaction we can roll back to.
--
-- Why we use it:
--   If payment recording fails after order creation, we don't want a
--   ghost order in the system. The transaction ensures data consistency.
--
-- ACID Properties demonstrated:
--   Atomicity – all or nothing
--   Consistency – database stays valid
--   Isolation – other users don't see partial results
--   Durability – committed data is saved permanently

START TRANSACTION;

SAVEPOINT before_order;

-- Step 1: Create the order
INSERT INTO ORDERS (Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_Type)
VALUES (1, 1, 1, 2, 'dine_in');

SET @new_order_id = LAST_INSERT_ID();

-- Step 2: Add an order item
INSERT INTO ORDER_ITEM (Order_ID, Menu_Item_ID, Quantity, Unit_Price, Tax_Rate, Line_Total)
VALUES (@new_order_id, 1, 2, 45.00, 5.00, 94.50);

-- Step 3: Record the payment
INSERT INTO PAYMENT (Order_ID, Payment_Method, Amount, Payment_Status, Transaction_Ref)
VALUES (@new_order_id, 'upi', 94.50, 'completed', 'TXN2026110312345');

-- Step 4: Update order payment status
UPDATE ORDERS SET Payment_Status = 'paid', Order_Status = 'confirmed'
WHERE Order_ID = @new_order_id;

COMMIT;
-- If any step had an error, we would run: ROLLBACK TO SAVEPOINT before_order;


-- ==========================================
-- SECTION 19: STORED PROCEDURES
-- ==========================================

-- ==========================================
-- QUERY 49: CALL STORED PROCEDURE – CREATE ORDER
-- ==========================================
-- Purpose:
--   Calls the pre-defined stored procedure to create a new order.
--
-- What it does:
--   CALL: executes an existing stored procedure.
--   @order_id is an OUT parameter – MySQL puts the new Order_ID into it.
--   We can then use @order_id in the next statement.
--
-- Why we use it:
--   Stored procedures encapsulate business logic in the database.
--   The backend calls this instead of writing raw INSERT every time.

CALL sp_create_order(1, 1, 1, 2, 'dine_in', @order_id);
SELECT @order_id AS New_Order_ID;

-- ==========================================
-- QUERY 50: CALL STORED PROCEDURE – ADD ORDER ITEM
-- ==========================================
-- Purpose:
--   Adds an item to the newly created order.

CALL sp_add_order_item(@order_id, 8, 1);  -- Vegetable Biryani, qty=1

-- ==========================================
-- QUERY 51: CALL STORED PROCEDURE – PROCESS PAYMENT
-- ==========================================
-- Purpose:
--   Processes payment for an order and returns success/failure.

CALL sp_process_payment(@order_id, 'cash', 90.00, NULL, @success);
SELECT @success AS Payment_Success;

-- ==========================================
-- QUERY 52: CALL STORED PROCEDURE – DAILY SALES REPORT
-- ==========================================
-- Purpose:
--   Generates a sales report for a specific date range.

CALL sp_daily_sales_report('2026-11-01', '2026-11-03');


-- ==========================================
-- SECTION 20: TRIGGERS
-- ==========================================

-- ==========================================
-- QUERY 53: VERIFY TRIGGER BEHAVIOR – ORDER TOTAL AUTO-UPDATE
-- ==========================================
-- Purpose:
--   Demonstrates that the trigger automatically updates order totals.
--
-- What it does:
--   After inserting a new ORDER_ITEM, the trigger fires automatically.
--   It recalculates and updates ORDERS.Subtotal, Tax_Amount, Total_Amount.
--   No manual UPDATE needed – the trigger handles it.
--
-- Why we use it:
--   Triggers enforce business rules automatically without application code.
--   They fire for every INSERT, even if done by a different application.

-- Check order 1 before
SELECT Order_ID, Subtotal, Tax_Amount, Total_Amount FROM ORDERS WHERE Order_ID = 1;

-- View the trigger definition
SHOW TRIGGERS LIKE 'ORDERS%';
SHOW TRIGGERS;

-- ==========================================
-- QUERY 54: VERIFY TRIGGER BEHAVIOR – STOCK UPDATE
-- ==========================================
-- Purpose:
--   Verifies that inserting a STOCK_TRANSACTION updates INVENTORY_ITEM stock.

-- Check stock before
SELECT Inventory_Item_ID, Item_Name, Current_Stock FROM INVENTORY_ITEM WHERE Inventory_Item_ID = 1;

-- Insert a purchase transaction
INSERT INTO STOCK_TRANSACTION
    (Inventory_Item_ID, Employee_ID, Supplier_ID, Txn_Type, Quantity, Unit_Cost, Remarks)
VALUES (1, 4, 4, 'purchase', 10.000, 75.00, 'Test purchase – trigger demo');

-- Check stock after (should have increased by 10)
SELECT Inventory_Item_ID, Item_Name, Current_Stock FROM INVENTORY_ITEM WHERE Inventory_Item_ID = 1;


-- ==========================================
-- SECTION 21: REAL-WORLD CAFETERIA QUERIES
-- ==========================================

-- ==========================================
-- QUERY 55: ORDERS READY FOR DELIVERY
-- ==========================================
-- Purpose:
--   Shows all orders that are 'ready' and waiting for delivery.
--
-- Used by: Counter/server staff to know which orders to hand out.

SELECT
    o.Order_ID,
    c.Full_Name AS Customer_Name,
    ct.Counter_Name,
    o.Order_DateTime,
    o.Total_Amount,
    GROUP_CONCAT(mi.Item_Name ORDER BY mi.Item_Name SEPARATOR ', ') AS Items_Ordered
FROM ORDERS o
JOIN CUSTOMER  c  ON o.Customer_ID  = c.Customer_ID
JOIN COUNTER   ct ON o.Counter_ID   = ct.Counter_ID
JOIN ORDER_ITEM oi ON o.Order_ID    = oi.Order_ID
JOIN MENU_ITEM  mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
WHERE o.Order_Status = 'ready'
GROUP BY o.Order_ID, c.Full_Name, ct.Counter_Name, o.Order_DateTime, o.Total_Amount
ORDER BY o.Order_DateTime ASC;

-- ==========================================
-- QUERY 56: UNPAID ORDERS (OUTSTANDING DUES)
-- ==========================================
-- Purpose:
--   Lists all orders that have not been paid yet.
--
-- Used by: Cashier to follow up on unpaid orders.

SELECT
    o.Order_ID,
    c.Full_Name AS Customer_Name,
    c.Phone,
    o.Total_Amount,
    o.Order_DateTime,
    o.Order_Status
FROM ORDERS o
JOIN CUSTOMER c ON o.Customer_ID = c.Customer_ID
WHERE o.Payment_Status = 'unpaid'
  AND o.Order_Status != 'cancelled'
ORDER BY o.Order_DateTime ASC;

-- ==========================================
-- QUERY 57: LOW STOCK ITEMS WITH SUPPLIER INFO
-- ==========================================
-- Purpose:
--   Shows items below reorder level so reorders can be placed.
--
-- Used by: Inventory staff to know what to order and from whom.

SELECT
    ii.Item_Code,
    ii.Item_Name,
    ii.Unit,
    ii.Current_Stock,
    ii.Reorder_Level,
    ii.Current_Stock - ii.Reorder_Level AS Stock_Gap,
    s.Supplier_Name,
    s.Phone AS Supplier_Phone
FROM INVENTORY_ITEM ii
LEFT JOIN SUPPLIER s ON ii.Supplier_ID = s.Supplier_ID
WHERE ii.Current_Stock <= ii.Reorder_Level
  AND ii.Inventory_Status = 'active'
ORDER BY Stock_Gap ASC;

-- ==========================================
-- QUERY 58: APPLY OFFER AND RECALCULATE ORDER TOTAL
-- ==========================================
-- Purpose:
--   Applies a discount offer to an order and updates the total.
--
-- Used by: Cashier when a customer presents a valid offer code.

-- 1. Get the offer details
SELECT Offer_ID, Offer_Code, Discount_Type, Discount_Value, Min_Order_Value
FROM OFFER
WHERE Offer_Code = 'STUDENT10'
  AND Offer_Status = 'active'
  AND CURDATE() BETWEEN Valid_From AND Valid_To;

-- 2. Calculate and apply discount (simulate for Order 16)
-- For a 10% percentage discount on ₹47.25 order:
-- Applied_Discount = 47.25 * 10 / 100 = ₹4.725 → rounded to ₹4.73

UPDATE ORDERS
SET Discount_Amount = ROUND(Total_Amount * 10 / 100, 2),
    Total_Amount    = Total_Amount - ROUND(Total_Amount * 10 / 100, 2)
WHERE Order_ID = 16;

-- 3. Record the offer usage
INSERT INTO ORDER_OFFER (Order_ID, Offer_ID, Applied_Discount)
VALUES (16, 1, ROUND(47.25 * 10 / 100, 2));

-- ==========================================
-- QUERY 59: AVERAGE RATING BY CATEGORY
-- ==========================================
-- Purpose:
--   Shows which feedback categories have the highest/lowest ratings.
--
-- Used by: Manager to identify areas needing improvement.

SELECT
    Feedback_Category,
    COUNT(Feedback_ID)  AS Total_Feedback,
    AVG(Rating)         AS Avg_Rating,
    MIN(Rating)         AS Min_Rating,
    MAX(Rating)         AS Max_Rating
FROM FEEDBACK
GROUP BY Feedback_Category
ORDER BY Avg_Rating DESC;

-- ==========================================
-- QUERY 60: EMPLOYEE PERFORMANCE (ORDERS HANDLED)
-- ==========================================
-- Purpose:
--   Shows how many orders each employee has handled.
--
-- Used by: Manager for performance evaluation.

SELECT
    e.Employee_Name,
    e.Role,
    cf.Cafeteria_Name,
    COUNT(o.Order_ID)   AS Orders_Handled,
    SUM(o.Total_Amount) AS Revenue_Processed
FROM EMPLOYEE e
JOIN ORDERS o    ON e.Employee_ID   = o.Employee_ID
JOIN CAFETERIA cf ON e.Cafeteria_ID = cf.Cafeteria_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY e.Employee_ID, e.Employee_Name, e.Role, cf.Cafeteria_Name
ORDER BY Orders_Handled DESC;


-- ==========================================
-- SECTION 22: REPORTS AND ANALYTICS
-- ==========================================

-- ==========================================
-- QUERY 61: DAILY SALES REPORT
-- ==========================================
-- Purpose:
--   Generates a complete daily sales report.
--
-- Used by: Manager to review each day's performance.

SELECT
    DATE(Order_DateTime)    AS Sale_Date,
    COUNT(Order_ID)         AS Total_Orders,
    SUM(Subtotal)           AS Subtotal_Revenue,
    SUM(Tax_Amount)         AS Tax_Collected,
    SUM(Discount_Amount)    AS Discounts_Given,
    SUM(Total_Amount)       AS Net_Revenue,
    AVG(Total_Amount)       AS Avg_Order_Value
FROM ORDERS
WHERE Order_Status != 'cancelled'
GROUP BY DATE(Order_DateTime)
ORDER BY Sale_Date DESC;

-- ==========================================
-- QUERY 62: TOP 5 BEST-SELLING MENU ITEMS
-- ==========================================
-- Purpose:
--   Identifies the most popular food items by quantity sold.
--
-- Used by: Manager to plan which items to promote or stock more ingredients for.

SELECT
    mi.Item_Code,
    mi.Item_Name,
    cat.Category_Name,
    mi.Price,
    COUNT(oi.Order_Item_ID) AS Times_Ordered,
    SUM(oi.Quantity)        AS Total_Qty_Sold,
    SUM(oi.Line_Total)      AS Total_Revenue
FROM ORDER_ITEM oi
JOIN MENU_ITEM mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
JOIN CATEGORY cat ON mi.Category_ID  = cat.Category_ID
JOIN ORDERS o     ON oi.Order_ID     = o.Order_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY mi.Menu_Item_ID, mi.Item_Code, mi.Item_Name, cat.Category_Name, mi.Price
ORDER BY Total_Qty_Sold DESC
LIMIT 5;

-- ==========================================
-- QUERY 63: PAYMENT METHOD ANALYSIS
-- ==========================================
-- Purpose:
--   Shows which payment method customers prefer.
--
-- Used by: Manager to decide whether to invest in more payment infrastructure.

SELECT
    Payment_Method,
    COUNT(Payment_ID)     AS Total_Transactions,
    SUM(Amount)           AS Total_Amount,
    ROUND(AVG(Amount), 2) AS Avg_Amount,
    ROUND(COUNT(Payment_ID) * 100.0 / (SELECT COUNT(*) FROM PAYMENT WHERE Payment_Status = 'completed'), 1) AS Percentage
FROM PAYMENT
WHERE Payment_Status = 'completed'
GROUP BY Payment_Method
ORDER BY Total_Amount DESC;

-- ==========================================
-- QUERY 64: REVENUE BY ORDER TYPE
-- ==========================================
-- Purpose:
--   Breaks down revenue by dine-in, takeaway, and online.

SELECT
    Order_Type,
    COUNT(Order_ID)   AS Total_Orders,
    SUM(Total_Amount) AS Total_Revenue,
    AVG(Total_Amount) AS Avg_Order_Value
FROM ORDERS
WHERE Order_Status != 'cancelled'
GROUP BY Order_Type
ORDER BY Total_Revenue DESC;

-- ==========================================
-- QUERY 65: MONTHLY REVENUE TREND (LAST 12 MONTHS)
-- ==========================================
-- Purpose:
--   Shows monthly revenue for the past year to identify trends.
--
-- Used by: Manager for financial planning and forecasting.

SELECT
    YEAR(Order_DateTime)  AS Year,
    MONTH(Order_DateTime) AS Month,
    MONTHNAME(Order_DateTime) AS Month_Name,
    COUNT(Order_ID)           AS Total_Orders,
    SUM(Total_Amount)         AS Monthly_Revenue
FROM ORDERS
WHERE Order_Status != 'cancelled'
  AND Order_DateTime >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
GROUP BY YEAR(Order_DateTime), MONTH(Order_DateTime), MONTHNAME(Order_DateTime)
ORDER BY Year ASC, Month ASC;

-- ==========================================
-- QUERY 66: CUSTOMER FREQUENCY ANALYSIS
-- ==========================================
-- Purpose:
--   Categorizes customers as regular, occasional, or new based on order frequency.
--
-- Used by: Marketing to create loyalty programs.

SELECT
    c.Full_Name,
    c.Customer_Type,
    c.Phone,
    COUNT(o.Order_ID)              AS Total_Orders,
    COALESCE(SUM(o.Total_Amount), 0) AS Total_Spent,
    CASE
        WHEN COUNT(o.Order_ID) >= 10 THEN 'Regular Customer'
        WHEN COUNT(o.Order_ID) BETWEEN 3 AND 9 THEN 'Occasional Customer'
        ELSE 'New Customer'
    END AS Customer_Category
FROM CUSTOMER c
LEFT JOIN ORDERS o ON c.Customer_ID = o.Customer_ID AND o.Order_Status != 'cancelled'
GROUP BY c.Customer_ID, c.Full_Name, c.Customer_Type, c.Phone
ORDER BY Total_Orders DESC;

-- ==========================================
-- QUERY 67: CATEGORY-WISE SALES REPORT
-- ==========================================
-- Purpose:
--   Shows which food category generates the most revenue.

SELECT
    cat.Category_Name,
    COUNT(DISTINCT oi.Order_Item_ID) AS Total_Items_Sold,
    SUM(oi.Quantity)                 AS Total_Qty_Sold,
    SUM(oi.Line_Total)               AS Category_Revenue,
    AVG(mi.Price)                    AS Avg_Item_Price
FROM ORDER_ITEM oi
JOIN MENU_ITEM mi ON oi.Menu_Item_ID = mi.Menu_Item_ID
JOIN CATEGORY cat ON mi.Category_ID  = cat.Category_ID
JOIN ORDERS o     ON oi.Order_ID     = o.Order_ID
WHERE o.Order_Status != 'cancelled'
GROUP BY cat.Category_ID, cat.Category_Name
ORDER BY Category_Revenue DESC;

-- ==========================================
-- QUERY 68: OFFER USAGE ANALYSIS
-- ==========================================
-- Purpose:
--   Shows which offers are most popular and how much discount they granted.

SELECT
    off.Offer_Code,
    off.Offer_Name,
    off.Discount_Type,
    off.Discount_Value,
    COUNT(oo.Order_ID)      AS Times_Used,
    SUM(oo.Applied_Discount) AS Total_Discount_Given
FROM OFFER off
LEFT JOIN ORDER_OFFER oo ON off.Offer_ID = oo.Offer_ID
GROUP BY off.Offer_ID, off.Offer_Code, off.Offer_Name, off.Discount_Type, off.Discount_Value
ORDER BY Times_Used DESC;

-- ==========================================
-- QUERY 69: INVENTORY CONSUMPTION REPORT
-- ==========================================
-- Purpose:
--   Shows how much of each ingredient has been consumed vs purchased.

SELECT
    ii.Item_Code,
    ii.Item_Name,
    ii.Unit,
    ii.Current_Stock,
    COALESCE(SUM(CASE WHEN st.Txn_Type = 'purchase'   THEN st.Quantity ELSE 0 END), 0) AS Total_Purchased,
    COALESCE(SUM(CASE WHEN st.Txn_Type = 'consumption' THEN st.Quantity ELSE 0 END), 0) AS Total_Consumed,
    COALESCE(SUM(CASE WHEN st.Txn_Type = 'waste'       THEN st.Quantity ELSE 0 END), 0) AS Total_Wasted
FROM INVENTORY_ITEM ii
LEFT JOIN STOCK_TRANSACTION st ON ii.Inventory_Item_ID = st.Inventory_Item_ID
GROUP BY ii.Inventory_Item_ID, ii.Item_Code, ii.Item_Name, ii.Unit, ii.Current_Stock
ORDER BY Total_Consumed DESC;

-- ==========================================
-- QUERY 70: FEEDBACK RATING DISTRIBUTION
-- ==========================================
-- Purpose:
--   Shows the distribution of star ratings across all feedback.

SELECT
    Rating,
    CONCAT(REPEAT('★', Rating), REPEAT('☆', 5 - Rating)) AS Stars,
    COUNT(Feedback_ID)  AS Count,
    ROUND(COUNT(Feedback_ID) * 100.0 / (SELECT COUNT(*) FROM FEEDBACK), 1) AS Percentage
FROM FEEDBACK
GROUP BY Rating
ORDER BY Rating DESC;

-- ============================================================
-- END OF MYSQL_QUERIES.sql
-- Total Queries: 70 (organized into 22 sections)
-- Author: CS1133 – DBMS Project, IET JKLU, Jaipur
-- ============================================================
