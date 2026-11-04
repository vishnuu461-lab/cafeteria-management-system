-- ============================================================
-- CAFETERIA MANAGEMENT SYSTEM
-- MySQL 8.0+ Schema - CS1133: Database Management Systems
-- Institute of Engineering and Technology (IET)
-- JK Lakshmipat University, Jaipur
-- ============================================================

-- ============================================================
-- CREATE AND SELECT DATABASE
-- ============================================================
CREATE DATABASE IF NOT EXISTS cafeteria_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE cafeteria_management;

-- ============================================================
-- DROP TABLES IN REVERSE FK ORDER (for clean re-runs)
-- ============================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS FEEDBACK;
DROP TABLE IF EXISTS ORDER_OFFER;
DROP TABLE IF EXISTS OFFER;
DROP TABLE IF EXISTS STOCK_TRANSACTION;
DROP TABLE IF EXISTS PAYMENT;
DROP TABLE IF EXISTS ORDER_ITEM;
DROP TABLE IF EXISTS ORDERS;
DROP TABLE IF EXISTS RECIPE_ITEM;
DROP TABLE IF EXISTS INVENTORY_ITEM;
DROP TABLE IF EXISTS SUPPLIER;
DROP TABLE IF EXISTS MENU_ITEM;
DROP TABLE IF EXISTS CATEGORY;
DROP TABLE IF EXISTS EMPLOYEE;
DROP TABLE IF EXISTS CUSTOMER;
DROP TABLE IF EXISTS COUNTER;
DROP TABLE IF EXISTS CAFETERIA;
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- TABLE 1: CAFETERIA
-- Strong entity – no foreign keys
-- ============================================================
CREATE TABLE CAFETERIA (
    Cafeteria_ID    INT            NOT NULL AUTO_INCREMENT,
    Cafeteria_Name  VARCHAR(100)   NOT NULL,
    Building_Name   VARCHAR(100)   NOT NULL,
    Opening_Time    TIME           NOT NULL,
    Closing_Time    TIME           NOT NULL,
    Cafeteria_Status ENUM('open','closed','under_maintenance') NOT NULL DEFAULT 'open',
    CONSTRAINT pk_cafeteria PRIMARY KEY (Cafeteria_ID),
    CONSTRAINT chk_cafe_times CHECK (Closing_Time > Opening_Time)
);

-- ============================================================
-- TABLE 2: COUNTER
-- Many counters belong to one cafeteria  (1:M)
-- ============================================================
CREATE TABLE COUNTER (
    Counter_ID     INT           NOT NULL AUTO_INCREMENT,
    Cafeteria_ID   INT           NOT NULL,
    Counter_Name   VARCHAR(100)  NOT NULL,
    Counter_Type   ENUM('food','beverage','dessert','combo','general') NOT NULL DEFAULT 'general',
    Counter_Status ENUM('open','closed') NOT NULL DEFAULT 'open',
    CONSTRAINT pk_counter    PRIMARY KEY (Counter_ID),
    CONSTRAINT fk_counter_cafe FOREIGN KEY (Cafeteria_ID)
        REFERENCES CAFETERIA(Cafeteria_ID) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ============================================================
-- TABLE 3: CUSTOMER
-- Strong entity – no foreign keys
-- ============================================================
CREATE TABLE CUSTOMER (
    Customer_ID    INT           NOT NULL AUTO_INCREMENT,
    Full_Name      VARCHAR(150)  NOT NULL,
    Phone          VARCHAR(15)   NOT NULL,
    Email          VARCHAR(150)  UNIQUE,
    Customer_Type  ENUM('student','faculty','staff','visitor') NOT NULL DEFAULT 'student',
    Account_Status ENUM('active','suspended','inactive') NOT NULL DEFAULT 'active',
    Created_At     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_customer PRIMARY KEY (Customer_ID),
    CONSTRAINT uq_customer_phone UNIQUE (Phone),
    CONSTRAINT chk_customer_phone CHECK (LENGTH(Phone) >= 10)
);

-- ============================================================
-- TABLE 4: EMPLOYEE
-- Many employees belong to one cafeteria  (1:M)
-- ============================================================
CREATE TABLE EMPLOYEE (
    Employee_ID     INT           NOT NULL AUTO_INCREMENT,
    Cafeteria_ID    INT           NOT NULL,
    Employee_Name   VARCHAR(150)  NOT NULL,
    Role            ENUM('manager','cashier','cook','inventory_staff','server') NOT NULL,
    Phone           VARCHAR(15)   NOT NULL,
    Employee_Status ENUM('active','on_leave','resigned') NOT NULL DEFAULT 'active',
    CONSTRAINT pk_employee PRIMARY KEY (Employee_ID),
    CONSTRAINT fk_employee_cafe FOREIGN KEY (Cafeteria_ID)
        REFERENCES CAFETERIA(Cafeteria_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT uq_employee_phone UNIQUE (Phone),
    CONSTRAINT chk_employee_phone CHECK (LENGTH(Phone) >= 10)
);

-- ============================================================
-- TABLE 5: CATEGORY
-- Strong entity – no foreign keys
-- ============================================================
CREATE TABLE CATEGORY (
    Category_ID     INT           NOT NULL AUTO_INCREMENT,
    Category_Name   VARCHAR(100)  NOT NULL UNIQUE,
    Category_Status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    CONSTRAINT pk_category PRIMARY KEY (Category_ID)
);

-- ============================================================
-- TABLE 6: MENU_ITEM
-- Many menu items belong to one category  (1:M)
-- ============================================================
CREATE TABLE MENU_ITEM (
    Menu_Item_ID       INT             NOT NULL AUTO_INCREMENT,
    Category_ID        INT             NOT NULL,
    Item_Code          VARCHAR(20)     NOT NULL UNIQUE,
    Item_Name          VARCHAR(150)    NOT NULL,
    Description        TEXT,
    Price              DECIMAL(10,2)   NOT NULL,
    Prep_Time_Min      SMALLINT        NOT NULL DEFAULT 5,
    Availability_Status ENUM('available','unavailable','seasonal') NOT NULL DEFAULT 'available',
    Tax_Rate           DECIMAL(5,2)    NOT NULL DEFAULT 5.00,
    CONSTRAINT pk_menu_item PRIMARY KEY (Menu_Item_ID),
    CONSTRAINT fk_menu_category FOREIGN KEY (Category_ID)
        REFERENCES CATEGORY(Category_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_menu_price   CHECK (Price >= 0),
    CONSTRAINT chk_menu_tax     CHECK (Tax_Rate >= 0 AND Tax_Rate <= 100),
    CONSTRAINT chk_menu_prep    CHECK (Prep_Time_Min > 0)
);

-- ============================================================
-- TABLE 7: SUPPLIER
-- Strong entity – no foreign keys
-- ============================================================
CREATE TABLE SUPPLIER (
    Supplier_ID     INT           NOT NULL AUTO_INCREMENT,
    Supplier_Name   VARCHAR(150)  NOT NULL,
    Phone           VARCHAR(15)   NOT NULL,
    Email           VARCHAR(150),
    City            VARCHAR(100),
    Supplier_Status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    CONSTRAINT pk_supplier PRIMARY KEY (Supplier_ID),
    CONSTRAINT uq_supplier_phone UNIQUE (Phone)
);

-- ============================================================
-- TABLE 8: INVENTORY_ITEM
-- Optional FK to SUPPLIER  (1:M, supplier may be unknown)
-- ============================================================
CREATE TABLE INVENTORY_ITEM (
    Inventory_Item_ID INT            NOT NULL AUTO_INCREMENT,
    Supplier_ID       INT            DEFAULT NULL,
    Item_Code         VARCHAR(20)    NOT NULL UNIQUE,
    Item_Name         VARCHAR(150)   NOT NULL,
    Unit              VARCHAR(20)    NOT NULL DEFAULT 'kg',
    Current_Stock     DECIMAL(12,3)  NOT NULL DEFAULT 0.000,
    Reorder_Level     DECIMAL(12,3)  NOT NULL DEFAULT 0.000,
    Unit_Cost         DECIMAL(10,2)  NOT NULL,
    Inventory_Status  ENUM('active','inactive') NOT NULL DEFAULT 'active',
    CONSTRAINT pk_inventory_item PRIMARY KEY (Inventory_Item_ID),
    CONSTRAINT fk_inv_supplier FOREIGN KEY (Supplier_ID)
        REFERENCES SUPPLIER(Supplier_ID) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_inv_stock  CHECK (Current_Stock >= 0),
    CONSTRAINT chk_inv_cost   CHECK (Unit_Cost >= 0)
);

-- ============================================================
-- TABLE 9: RECIPE_ITEM   (Associative – M:N between MENU_ITEM and INVENTORY_ITEM)
-- Combined PK: Menu_Item_ID + Inventory_Item_ID
-- ============================================================
CREATE TABLE RECIPE_ITEM (
    Menu_Item_ID      INT             NOT NULL,
    Inventory_Item_ID INT             NOT NULL,
    Quantity_Required DECIMAL(10,3)   NOT NULL,
    CONSTRAINT pk_recipe_item PRIMARY KEY (Menu_Item_ID, Inventory_Item_ID),
    CONSTRAINT fk_recipe_menu  FOREIGN KEY (Menu_Item_ID)
        REFERENCES MENU_ITEM(Menu_Item_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_recipe_inv   FOREIGN KEY (Inventory_Item_ID)
        REFERENCES INVENTORY_ITEM(Inventory_Item_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_recipe_qty  CHECK (Quantity_Required > 0)
);

-- ============================================================
-- TABLE 10: ORDERS
-- Transaction table – FKs to CUSTOMER, CAFETERIA, COUNTER, EMPLOYEE
-- ============================================================
CREATE TABLE ORDERS (
    Order_ID            INT              NOT NULL AUTO_INCREMENT,
    Customer_ID         INT              NOT NULL,
    Cafeteria_ID        INT              NOT NULL,
    Counter_ID          INT              NOT NULL,
    Employee_ID         INT              NOT NULL,
    Order_DateTime      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Order_Type          ENUM('dine_in','takeaway','online') NOT NULL DEFAULT 'dine_in',
    Order_Status        ENUM('pending','confirmed','preparing','ready','delivered','cancelled') NOT NULL DEFAULT 'pending',
    Subtotal            DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    Tax_Amount          DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    Discount_Amount     DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    Total_Amount        DECIMAL(12,2)    NOT NULL DEFAULT 0.00,
    Payment_Status      ENUM('unpaid','paid','refunded') NOT NULL DEFAULT 'unpaid',
    Inventory_Deducted  TINYINT(1)       NOT NULL DEFAULT 0,
    CONSTRAINT pk_orders      PRIMARY KEY (Order_ID),
    CONSTRAINT fk_order_cust  FOREIGN KEY (Customer_ID)
        REFERENCES CUSTOMER(Customer_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_cafe  FOREIGN KEY (Cafeteria_ID)
        REFERENCES CAFETERIA(Cafeteria_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_counter FOREIGN KEY (Counter_ID)
        REFERENCES COUNTER(Counter_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_order_emp   FOREIGN KEY (Employee_ID)
        REFERENCES EMPLOYEE(Employee_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_order_subtotal  CHECK (Subtotal >= 0),
    CONSTRAINT chk_order_total     CHECK (Total_Amount >= 0),
    CONSTRAINT chk_order_discount  CHECK (Discount_Amount >= 0)
);

-- ============================================================
-- TABLE 11: ORDER_ITEM   (Associative – ORDERS × MENU_ITEM)
-- ============================================================
CREATE TABLE ORDER_ITEM (
    Order_Item_ID INT             NOT NULL AUTO_INCREMENT,
    Order_ID      INT             NOT NULL,
    Menu_Item_ID  INT             NOT NULL,
    Quantity      SMALLINT        NOT NULL,
    Unit_Price    DECIMAL(10,2)   NOT NULL,
    Tax_Rate      DECIMAL(5,2)    NOT NULL DEFAULT 0.00,
    Line_Total    DECIMAL(12,2)   NOT NULL,
    CONSTRAINT pk_order_item   PRIMARY KEY (Order_Item_ID),
    CONSTRAINT fk_oi_order     FOREIGN KEY (Order_ID)
        REFERENCES ORDERS(Order_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_oi_menu      FOREIGN KEY (Menu_Item_ID)
        REFERENCES MENU_ITEM(Menu_Item_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_oi_qty      CHECK (Quantity > 0),
    CONSTRAINT chk_oi_price    CHECK (Unit_Price >= 0),
    CONSTRAINT chk_oi_total    CHECK (Line_Total >= 0)
);

-- ============================================================
-- TABLE 12: PAYMENT
-- 1:0..1 with ORDERS (Order_ID unique FK)
-- ============================================================
CREATE TABLE PAYMENT (
    Payment_ID        INT             NOT NULL AUTO_INCREMENT,
    Order_ID          INT             NOT NULL UNIQUE,
    Payment_Method    ENUM('cash','upi','card','wallet','online') NOT NULL,
    Payment_DateTime  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Amount            DECIMAL(12,2)   NOT NULL,
    Payment_Status    ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
    Transaction_Ref   VARCHAR(100),
    CONSTRAINT pk_payment       PRIMARY KEY (Payment_ID),
    CONSTRAINT fk_payment_order FOREIGN KEY (Order_ID)
        REFERENCES ORDERS(Order_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_payment_amt  CHECK (Amount >= 0)
);

-- ============================================================
-- TABLE 13: STOCK_TRANSACTION
-- FKs to INVENTORY_ITEM, EMPLOYEE (required), SUPPLIER (optional)
-- ============================================================
CREATE TABLE STOCK_TRANSACTION (
    Stock_Txn_ID      INT             NOT NULL AUTO_INCREMENT,
    Inventory_Item_ID INT             NOT NULL,
    Employee_ID       INT             NOT NULL,
    Supplier_ID       INT             DEFAULT NULL,
    Txn_Type          ENUM('purchase','consumption','waste','return','adjustment') NOT NULL,
    Quantity          DECIMAL(12,3)   NOT NULL,
    Txn_DateTime      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Reference_Type    VARCHAR(50),
    Reference_ID      INT,
    Unit_Cost         DECIMAL(10,2)   DEFAULT NULL,
    Remarks           TEXT,
    CONSTRAINT pk_stock_txn       PRIMARY KEY (Stock_Txn_ID),
    CONSTRAINT fk_stxn_inv        FOREIGN KEY (Inventory_Item_ID)
        REFERENCES INVENTORY_ITEM(Inventory_Item_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_stxn_emp        FOREIGN KEY (Employee_ID)
        REFERENCES EMPLOYEE(Employee_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT fk_stxn_supplier   FOREIGN KEY (Supplier_ID)
        REFERENCES SUPPLIER(Supplier_ID) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT chk_stxn_qty       CHECK (Quantity > 0)
);

-- ============================================================
-- TABLE 14: OFFER
-- Strong entity – no foreign keys
-- ============================================================
CREATE TABLE OFFER (
    Offer_ID         INT              NOT NULL AUTO_INCREMENT,
    Offer_Code       VARCHAR(30)      NOT NULL UNIQUE,
    Offer_Name       VARCHAR(150)     NOT NULL,
    Discount_Type    ENUM('percentage','flat') NOT NULL DEFAULT 'percentage',
    Discount_Value   DECIMAL(10,2)    NOT NULL,
    Min_Order_Value  DECIMAL(10,2)    NOT NULL DEFAULT 0.00,
    Valid_From       DATE             NOT NULL,
    Valid_To         DATE             NOT NULL,
    Offer_Status     ENUM('active','inactive','expired') NOT NULL DEFAULT 'active',
    CONSTRAINT pk_offer        PRIMARY KEY (Offer_ID),
    CONSTRAINT chk_offer_dates CHECK (Valid_To >= Valid_From),
    CONSTRAINT chk_offer_disc  CHECK (Discount_Value > 0),
    CONSTRAINT chk_offer_min   CHECK (Min_Order_Value >= 0)
);

-- ============================================================
-- TABLE 15: ORDER_OFFER   (Associative – Order 1:0..1; Offer 1:M)
-- Order_ID is PK (so at most one offer per order)
-- ============================================================
CREATE TABLE ORDER_OFFER (
    Order_ID          INT             NOT NULL,
    Offer_ID          INT             NOT NULL,
    Applied_Discount  DECIMAL(12,2)   NOT NULL DEFAULT 0.00,
    CONSTRAINT pk_order_offer    PRIMARY KEY (Order_ID),
    CONSTRAINT fk_oo_order       FOREIGN KEY (Order_ID)
        REFERENCES ORDERS(Order_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_oo_offer       FOREIGN KEY (Offer_ID)
        REFERENCES OFFER(Offer_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_oo_disc       CHECK (Applied_Discount >= 0)
);

-- ============================================================
-- TABLE 16: FEEDBACK
-- 1:0..1 with ORDERS (Order_ID unique FK); 1:M with CUSTOMER
-- ============================================================
CREATE TABLE FEEDBACK (
    Feedback_ID       INT             NOT NULL AUTO_INCREMENT,
    Order_ID          INT             NOT NULL UNIQUE,
    Customer_ID       INT             NOT NULL,
    Rating            TINYINT         NOT NULL,
    Feedback_Category ENUM('food_quality','service','cleanliness','value','other') NOT NULL DEFAULT 'food_quality',
    Comments          TEXT,
    Feedback_Date     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT pk_feedback       PRIMARY KEY (Feedback_ID),
    CONSTRAINT fk_fb_order       FOREIGN KEY (Order_ID)
        REFERENCES ORDERS(Order_ID) ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_fb_customer    FOREIGN KEY (Customer_ID)
        REFERENCES CUSTOMER(Customer_ID) ON UPDATE CASCADE ON DELETE RESTRICT,
    CONSTRAINT chk_fb_rating     CHECK (Rating BETWEEN 1 AND 5)
);

-- ============================================================
-- INDEXES (for performance on common lookups)
-- ============================================================
CREATE INDEX idx_orders_datetime    ON ORDERS(Order_DateTime);
CREATE INDEX idx_orders_customer    ON ORDERS(Customer_ID);
CREATE INDEX idx_orders_cafeteria   ON ORDERS(Cafeteria_ID);
CREATE INDEX idx_orders_status      ON ORDERS(Order_Status);
CREATE INDEX idx_orders_pay_status  ON ORDERS(Payment_Status);
CREATE INDEX idx_order_item_order   ON ORDER_ITEM(Order_ID);
CREATE INDEX idx_order_item_menu    ON ORDER_ITEM(Menu_Item_ID);
CREATE INDEX idx_menu_category      ON MENU_ITEM(Category_ID);
CREATE INDEX idx_menu_avail         ON MENU_ITEM(Availability_Status);
CREATE INDEX idx_inv_stock          ON INVENTORY_ITEM(Current_Stock);
CREATE INDEX idx_stxn_datetime      ON STOCK_TRANSACTION(Txn_DateTime);
CREATE INDEX idx_stxn_inv           ON STOCK_TRANSACTION(Inventory_Item_ID);
CREATE INDEX idx_feedback_customer  ON FEEDBACK(Customer_ID);
CREATE INDEX idx_payment_datetime   ON PAYMENT(Payment_DateTime);

-- ============================================================
-- VIEW 1: vw_daily_sales
-- Shows total revenue and order count per day
-- ============================================================
CREATE OR REPLACE VIEW vw_daily_sales AS
SELECT
    DATE(Order_DateTime)  AS Sale_Date,
    COUNT(Order_ID)       AS Total_Orders,
    SUM(Subtotal)         AS Total_Subtotal,
    SUM(Tax_Amount)       AS Total_Tax,
    SUM(Discount_Amount)  AS Total_Discount,
    SUM(Total_Amount)     AS Total_Revenue
FROM ORDERS
WHERE Order_Status NOT IN ('cancelled')
GROUP BY DATE(Order_DateTime)
ORDER BY Sale_Date DESC;

-- ============================================================
-- VIEW 2: vw_low_stock_items
-- Lists inventory items that have reached or fallen below reorder level
-- ============================================================
CREATE OR REPLACE VIEW vw_low_stock_items AS
SELECT
    ii.Inventory_Item_ID,
    ii.Item_Code,
    ii.Item_Name,
    ii.Unit,
    ii.Current_Stock,
    ii.Reorder_Level,
    ii.Unit_Cost,
    s.Supplier_Name,
    s.Phone AS Supplier_Phone
FROM INVENTORY_ITEM ii
LEFT JOIN SUPPLIER s ON ii.Supplier_ID = s.Supplier_ID
WHERE ii.Current_Stock <= ii.Reorder_Level
  AND ii.Inventory_Status = 'active'
ORDER BY (ii.Current_Stock / NULLIF(ii.Reorder_Level, 0)) ASC;

-- ============================================================
-- VIEW 3: vw_order_summary
-- Full order summary with customer, cafeteria, payment details
-- ============================================================
CREATE OR REPLACE VIEW vw_order_summary AS
SELECT
    o.Order_ID,
    c.Full_Name       AS Customer_Name,
    c.Phone           AS Customer_Phone,
    cf.Cafeteria_Name,
    ct.Counter_Name,
    e.Employee_Name,
    o.Order_DateTime,
    o.Order_Type,
    o.Order_Status,
    o.Subtotal,
    o.Tax_Amount,
    o.Discount_Amount,
    o.Total_Amount,
    o.Payment_Status,
    p.Payment_Method,
    p.Transaction_Ref
FROM ORDERS o
JOIN CUSTOMER c   ON o.Customer_ID  = c.Customer_ID
JOIN CAFETERIA cf ON o.Cafeteria_ID = cf.Cafeteria_ID
JOIN COUNTER ct   ON o.Counter_ID   = ct.Counter_ID
JOIN EMPLOYEE e   ON o.Employee_ID  = e.Employee_ID
LEFT JOIN PAYMENT p ON o.Order_ID   = p.Order_ID;

-- ============================================================
-- VIEW 4: vw_menu_popularity
-- Shows how many times each menu item was ordered and total revenue
-- ============================================================
CREATE OR REPLACE VIEW vw_menu_popularity AS
SELECT
    mi.Menu_Item_ID,
    mi.Item_Code,
    mi.Item_Name,
    cat.Category_Name,
    COUNT(oi.Order_Item_ID) AS Times_Ordered,
    SUM(oi.Quantity)        AS Total_Qty_Sold,
    SUM(oi.Line_Total)      AS Total_Revenue,
    AVG(oi.Unit_Price)      AS Avg_Price
FROM MENU_ITEM mi
JOIN CATEGORY cat   ON mi.Category_ID  = cat.Category_ID
LEFT JOIN ORDER_ITEM oi ON mi.Menu_Item_ID = oi.Menu_Item_ID
LEFT JOIN ORDERS o      ON oi.Order_ID     = o.Order_ID
    AND o.Order_Status NOT IN ('cancelled')
GROUP BY mi.Menu_Item_ID, mi.Item_Code, mi.Item_Name, cat.Category_Name
ORDER BY Total_Qty_Sold DESC;

-- ============================================================
-- VIEW 5: vw_customer_order_history
-- Customer with their total orders and spend
-- ============================================================
CREATE OR REPLACE VIEW vw_customer_order_history AS
SELECT
    c.Customer_ID,
    c.Full_Name,
    c.Phone,
    c.Email,
    c.Customer_Type,
    COUNT(o.Order_ID)    AS Total_Orders,
    SUM(o.Total_Amount)  AS Total_Spent,
    AVG(o.Total_Amount)  AS Avg_Order_Value,
    MAX(o.Order_DateTime) AS Last_Order_Date
FROM CUSTOMER c
LEFT JOIN ORDERS o ON c.Customer_ID = o.Customer_ID
    AND o.Order_Status != 'cancelled'
GROUP BY c.Customer_ID, c.Full_Name, c.Phone, c.Email, c.Customer_Type;

-- ============================================================
-- STORED PROCEDURE 1: sp_create_order
-- Creates a new order and auto-calculates totals
-- ============================================================
DELIMITER $$
CREATE PROCEDURE sp_create_order (
    IN p_customer_id  INT,
    IN p_cafeteria_id INT,
    IN p_counter_id   INT,
    IN p_employee_id  INT,
    IN p_order_type   VARCHAR(20),
    OUT p_order_id    INT
)
BEGIN
    INSERT INTO ORDERS (
        Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID,
        Order_Type, Order_Status, Payment_Status
    ) VALUES (
        p_customer_id, p_cafeteria_id, p_counter_id, p_employee_id,
        p_order_type, 'pending', 'unpaid'
    );
    SET p_order_id = LAST_INSERT_ID();
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE 2: sp_add_order_item
-- Adds a menu item to the order and updates order totals
-- ============================================================
DELIMITER $$
CREATE PROCEDURE sp_add_order_item (
    IN p_order_id     INT,
    IN p_menu_item_id INT,
    IN p_quantity     INT
)
BEGIN
    DECLARE v_price    DECIMAL(10,2);
    DECLARE v_tax_rate DECIMAL(5,2);
    DECLARE v_line_total DECIMAL(12,2);

    SELECT Price, Tax_Rate INTO v_price, v_tax_rate
    FROM MENU_ITEM WHERE Menu_Item_ID = p_menu_item_id;

    SET v_line_total = ROUND(p_quantity * v_price * (1 + v_tax_rate / 100), 2);

    INSERT INTO ORDER_ITEM (Order_ID, Menu_Item_ID, Quantity, Unit_Price, Tax_Rate, Line_Total)
    VALUES (p_order_id, p_menu_item_id, p_quantity, v_price, v_tax_rate, v_line_total);

    -- Recalculate order totals
    UPDATE ORDERS SET
        Subtotal = (SELECT SUM(Quantity * Unit_Price) FROM ORDER_ITEM WHERE Order_ID = p_order_id),
        Tax_Amount = (SELECT SUM(Line_Total - Quantity * Unit_Price) FROM ORDER_ITEM WHERE Order_ID = p_order_id)
    WHERE Order_ID = p_order_id;

    UPDATE ORDERS SET
        Total_Amount = Subtotal + Tax_Amount - Discount_Amount
    WHERE Order_ID = p_order_id;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE 3: sp_process_payment
-- Records payment and updates order payment status
-- ============================================================
DELIMITER $$
CREATE PROCEDURE sp_process_payment (
    IN p_order_id        INT,
    IN p_payment_method  VARCHAR(20),
    IN p_amount          DECIMAL(12,2),
    IN p_transaction_ref VARCHAR(100),
    OUT p_success        TINYINT
)
BEGIN
    DECLARE v_order_total DECIMAL(12,2);
    DECLARE v_existing INT DEFAULT 0;

    SELECT Total_Amount INTO v_order_total FROM ORDERS WHERE Order_ID = p_order_id;
    SELECT COUNT(*) INTO v_existing FROM PAYMENT WHERE Order_ID = p_order_id;

    IF v_existing > 0 THEN
        SET p_success = 0; -- Payment already exists
    ELSEIF p_amount >= v_order_total THEN
        INSERT INTO PAYMENT (Order_ID, Payment_Method, Amount, Payment_Status, Transaction_Ref)
        VALUES (p_order_id, p_payment_method, p_amount, 'completed', p_transaction_ref);

        UPDATE ORDERS SET Payment_Status = 'paid', Order_Status = 'confirmed'
        WHERE Order_ID = p_order_id;

        SET p_success = 1;
    ELSE
        SET p_success = 0; -- Insufficient amount
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- STORED PROCEDURE 4: sp_daily_sales_report
-- Returns daily sales summary for a given date range
-- ============================================================
DELIMITER $$
CREATE PROCEDURE sp_daily_sales_report (
    IN p_from_date DATE,
    IN p_to_date   DATE
)
BEGIN
    SELECT
        DATE(Order_DateTime) AS Sale_Date,
        COUNT(Order_ID)      AS Total_Orders,
        SUM(Total_Amount)    AS Total_Revenue,
        SUM(Tax_Amount)      AS Total_Tax,
        SUM(Discount_Amount) AS Total_Discount
    FROM ORDERS
    WHERE DATE(Order_DateTime) BETWEEN p_from_date AND p_to_date
      AND Order_Status NOT IN ('cancelled')
    GROUP BY DATE(Order_DateTime)
    ORDER BY Sale_Date;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER 1: trg_after_order_item_insert
-- Recalculates ORDERS totals after an ORDER_ITEM is inserted
-- ============================================================
DELIMITER $$
CREATE TRIGGER trg_after_order_item_insert
AFTER INSERT ON ORDER_ITEM
FOR EACH ROW
BEGIN
    UPDATE ORDERS SET
        Subtotal   = (SELECT COALESCE(SUM(Quantity * Unit_Price), 0) FROM ORDER_ITEM WHERE Order_ID = NEW.Order_ID),
        Tax_Amount = (SELECT COALESCE(SUM(Line_Total - Quantity * Unit_Price), 0) FROM ORDER_ITEM WHERE Order_ID = NEW.Order_ID)
    WHERE Order_ID = NEW.Order_ID;

    UPDATE ORDERS SET
        Total_Amount = Subtotal + Tax_Amount - Discount_Amount
    WHERE Order_ID = NEW.Order_ID;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER 2: trg_after_payment_insert
-- Updates ORDERS Payment_Status to 'paid' after payment is recorded
-- ============================================================
DELIMITER $$
CREATE TRIGGER trg_after_payment_insert
AFTER INSERT ON PAYMENT
FOR EACH ROW
BEGIN
    IF NEW.Payment_Status = 'completed' THEN
        UPDATE ORDERS SET Payment_Status = 'paid'
        WHERE Order_ID = NEW.Order_ID;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER 3: trg_after_stock_txn_insert
-- Adjusts INVENTORY_ITEM.Current_Stock after any stock transaction
-- ============================================================
DELIMITER $$
CREATE TRIGGER trg_after_stock_txn_insert
AFTER INSERT ON STOCK_TRANSACTION
FOR EACH ROW
BEGIN
    IF NEW.Txn_Type IN ('purchase') THEN
        UPDATE INVENTORY_ITEM
        SET Current_Stock = Current_Stock + NEW.Quantity
        WHERE Inventory_Item_ID = NEW.Inventory_Item_ID;
    ELSEIF NEW.Txn_Type IN ('consumption', 'waste') THEN
        UPDATE INVENTORY_ITEM
        SET Current_Stock = Current_Stock - NEW.Quantity
        WHERE Inventory_Item_ID = NEW.Inventory_Item_ID;
    ELSEIF NEW.Txn_Type = 'return' THEN
        UPDATE INVENTORY_ITEM
        SET Current_Stock = Current_Stock + NEW.Quantity
        WHERE Inventory_Item_ID = NEW.Inventory_Item_ID;
    END IF;
END$$
DELIMITER ;

-- ============================================================
-- TRIGGER 4: trg_before_order_item_insert
-- Validates that Menu_Item is available before adding to order
-- ============================================================
DELIMITER $$
CREATE TRIGGER trg_before_order_item_insert
BEFORE INSERT ON ORDER_ITEM
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    SELECT Availability_Status INTO v_status
    FROM MENU_ITEM WHERE Menu_Item_ID = NEW.Menu_Item_ID;
    IF v_status != 'available' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Cannot add an unavailable menu item to an order.';
    END IF;
END$$
DELIMITER ;

-- End of schema.sql
