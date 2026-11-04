-- ============================================================
-- SAMPLE DATA – Cafeteria Management System
-- Run AFTER schema.sql
-- ============================================================
USE cafeteria_management;

-- ============================================================
-- 1. CAFETERIA
-- ============================================================
INSERT INTO CAFETERIA (Cafeteria_Name, Building_Name, Opening_Time, Closing_Time, Cafeteria_Status) VALUES
('Main Campus Cafeteria', 'Academic Block A', '07:30:00', '21:00:00', 'open'),
('Engineering Block Canteen', 'Engineering Block', '08:00:00', '20:00:00', 'open'),
('Faculty Lounge Cafe', 'Administrative Block', '09:00:00', '18:00:00', 'open');

-- ============================================================
-- 2. COUNTER
-- ============================================================
INSERT INTO COUNTER (Cafeteria_ID, Counter_Name, Counter_Type, Counter_Status) VALUES
(1, 'Main Food Counter', 'food', 'open'),
(1, 'Beverages Corner', 'beverage', 'open'),
(1, 'Desserts & Snacks', 'dessert', 'open'),
(1, 'Combo Meals Counter', 'combo', 'open'),
(2, 'Engineering Snacks', 'food', 'open'),
(2, 'Hot Drinks', 'beverage', 'open'),
(3, 'Faculty Meals', 'general', 'open');

-- ============================================================
-- 3. CUSTOMER
-- ============================================================
INSERT INTO CUSTOMER (Full_Name, Phone, Email, Customer_Type, Account_Status) VALUES
('Arjun Sharma', '9876543210', 'arjun.sharma@jklu.edu.in', 'student', 'active'),
('Priya Patel', '9812345678', 'priya.patel@jklu.edu.in', 'student', 'active'),
('Dr. Ramesh Nair', '9845612345', 'ramesh.nair@jklu.edu.in', 'faculty', 'active'),
('Sonia Verma', '9934567890', 'sonia.verma@jklu.edu.in', 'staff', 'active'),
('Rohan Gupta', '9923456789', 'rohan.gupta@jklu.edu.in', 'student', 'active'),
('Divya Mehta', '9867890123', 'divya.mehta@jklu.edu.in', 'student', 'active'),
('Prof. Anita Singh', '9811234567', 'anita.singh@jklu.edu.in', 'faculty', 'active'),
('Karan Joshi', '9789012345', 'karan.joshi@jklu.edu.in', 'student', 'active'),
('Meena Reddy', '9978901234', 'meena.reddy@jklu.edu.in', 'student', 'active'),
('Vikram Bose', '9701234567', 'vikram.bose@jklu.edu.in', 'visitor', 'active');

-- ============================================================
-- 4. EMPLOYEE
-- ============================================================
INSERT INTO EMPLOYEE (Cafeteria_ID, Employee_Name, Role, Phone, Employee_Status) VALUES
(1, 'Ramesh Yadav', 'manager', '9600001111', 'active'),
(1, 'Sunita Devi', 'cashier', '9600002222', 'active'),
(1, 'Manoj Kumar', 'cook', '9600003333', 'active'),
(1, 'Anita Sharma', 'inventory_staff', '9600004444', 'active'),
(1, 'Ravi Shankar', 'server', '9600005555', 'active'),
(2, 'Pradeep Nair', 'manager', '9600006666', 'active'),
(2, 'Lalita Mishra', 'cashier', '9600007777', 'active'),
(2, 'Suresh Verma', 'cook', '9600008888', 'active'),
(3, 'Geeta Joshi', 'manager', '9600009999', 'active'),
(3, 'Asha Rani', 'cashier', '9600010000', 'active');

-- ============================================================
-- 5. CATEGORY
-- ============================================================
INSERT INTO CATEGORY (Category_Name, Category_Status) VALUES
('South Indian', 'active'),
('North Indian', 'active'),
('Beverages', 'active'),
('Snacks & Fast Food', 'active'),
('Desserts', 'active'),
('Healthy Bowls', 'active'),
('Combo Meals', 'active');

-- ============================================================
-- 6. MENU_ITEM
-- ============================================================
INSERT INTO MENU_ITEM (Category_ID, Item_Code, Item_Name, Description, Price, Prep_Time_Min, Availability_Status, Tax_Rate) VALUES
(1, 'SI001', 'Masala Dosa', 'Crispy dosa with spiced potato filling and chutneys', 45.00, 10, 'available', 5.00),
(1, 'SI002', 'Idli Sambar (2 pcs)', 'Soft steamed idlis served with sambar and chutney', 35.00, 8, 'available', 5.00),
(1, 'SI003', 'Medu Vada (2 pcs)', 'Crispy lentil fritters with coconut chutney', 30.00, 7, 'available', 5.00),
(1, 'SI004', 'Uttapam', 'Thick rice pancake topped with vegetables', 50.00, 12, 'available', 5.00),
(2, 'NI001', 'Dal Makhani + Rice', 'Slow-cooked black lentils with steamed rice', 80.00, 5, 'available', 5.00),
(2, 'NI002', 'Paneer Butter Masala + Roti', 'Cottage cheese in tomato gravy with 2 rotis', 90.00, 5, 'available', 5.00),
(2, 'NI003', 'Chole Bhature', 'Spiced chickpea curry with fried bread', 75.00, 10, 'available', 5.00),
(2, 'NI004', 'Vegetable Biryani', 'Fragrant basmati rice with mixed vegetables', 85.00, 15, 'available', 5.00),
(3, 'BV001', 'Masala Chai', 'Spiced Indian tea with milk', 15.00, 3, 'available', 5.00),
(3, 'BV002', 'Filter Coffee', 'South Indian filter coffee with milk', 20.00, 4, 'available', 5.00),
(3, 'BV003', 'Fresh Lime Soda', 'Freshly squeezed lime with soda water', 25.00, 2, 'available', 5.00),
(3, 'BV004', 'Lassi (Sweet)', 'Thick yoghurt-based drink', 30.00, 3, 'available', 5.00),
(4, 'SN001', 'Samosa (2 pcs)', 'Crispy pastry with spiced potato filling', 20.00, 5, 'available', 5.00),
(4, 'SN002', 'Aloo Tikki Burger', 'Spiced potato patty in a bun with sauces', 55.00, 8, 'available', 5.00),
(4, 'SN003', 'Maggi Noodles', 'Quick-cook noodles with vegetables', 40.00, 7, 'available', 5.00),
(5, 'DS001', 'Gulab Jamun (2 pcs)', 'Milk dumplings in sugar syrup', 30.00, 2, 'available', 5.00),
(5, 'DS002', 'Kheer', 'Rice pudding with dry fruits', 35.00, 2, 'available', 5.00),
(5, 'DS003', 'Ice Cream Scoop', 'Vanilla / Chocolate scoop', 40.00, 1, 'available', 5.00),
(6, 'HB001', 'Sprouts Salad Bowl', 'Mixed sprouted legumes with lemon dressing', 60.00, 5, 'available', 5.00),
(6, 'HB002', 'Fruit Bowl', 'Assorted seasonal fruits', 50.00, 3, 'available', 5.00),
(7, 'CM001', 'Student Combo', 'Dal + Rice + Sabzi + Roti + Salad', 99.00, 5, 'available', 5.00),
(7, 'CM002', 'Breakfast Combo', 'Idli (2) + Vada (1) + Filter Coffee', 60.00, 8, 'available', 5.00);

-- ============================================================
-- 7. SUPPLIER
-- ============================================================
INSERT INTO SUPPLIER (Supplier_Name, Phone, Email, City, Supplier_Status) VALUES
('Jaipur Fresh Farms', '9111222333', 'jff@example.com', 'Jaipur', 'active'),
('Rajasthan Dairy Co.', '9222333444', 'rdc@example.com', 'Jaipur', 'active'),
('Spice Garden Wholesale', '9333444555', 'sgw@example.com', 'Jaipur', 'active'),
('Golden Grain Distributors', '9444555666', 'ggd@example.com', 'Ajmer', 'active'),
('Rajasthan Beverages Ltd.', '9555666777', 'rbl@example.com', 'Kota', 'active');

-- ============================================================
-- 8. INVENTORY_ITEM
-- ============================================================
INSERT INTO INVENTORY_ITEM (Supplier_ID, Item_Code, Item_Name, Unit, Current_Stock, Reorder_Level, Unit_Cost, Inventory_Status) VALUES
(4, 'INV001', 'Rice (Basmati)', 'kg', 80.000, 20.000, 75.00, 'active'),
(4, 'INV002', 'Urad Dal', 'kg', 30.000, 10.000, 90.00, 'active'),
(4, 'INV003', 'Chana Dal', 'kg', 25.000, 8.000, 85.00, 'active'),
(2, 'INV004', 'Milk', 'litre', 50.000, 15.000, 50.00, 'active'),
(2, 'INV005', 'Paneer', 'kg', 10.000, 3.000, 280.00, 'active'),
(1, 'INV006', 'Potato', 'kg', 40.000, 10.000, 22.00, 'active'),
(1, 'INV007', 'Onion', 'kg', 30.000, 8.000, 18.00, 'active'),
(1, 'INV008', 'Tomato', 'kg', 25.000, 8.000, 25.00, 'active'),
(3, 'INV009', 'Oil (Sunflower)', 'litre', 20.000, 5.000, 130.00, 'active'),
(3, 'INV010', 'Mustard Seeds', 'kg', 5.000, 1.000, 80.00, 'active'),
(3, 'INV011', 'Salt', 'kg', 10.000, 2.000, 20.00, 'active'),
(3, 'INV012', 'Turmeric Powder', 'kg', 3.000, 0.500, 150.00, 'active'),
(4, 'INV013', 'Maida (All-Purpose Flour)', 'kg', 20.000, 5.000, 40.00, 'active'),
(5, 'INV014', 'Tea Leaves', 'kg', 5.000, 1.000, 250.00, 'active'),
(5, 'INV015', 'Coffee Powder', 'kg', 3.000, 0.500, 400.00, 'active'),
(4, 'INV016', 'Sugar', 'kg', 15.000, 4.000, 45.00, 'active'),
(2, 'INV017', 'Yoghurt (Curd)', 'kg', 10.000, 3.000, 60.00, 'active'),
(4, 'INV018', 'Wheat Flour (Atta)', 'kg', 25.000, 8.000, 35.00, 'active');

-- ============================================================
-- 9. RECIPE_ITEM (M:N — Menu Item <-> Inventory Item)
-- ============================================================
INSERT INTO RECIPE_ITEM (Menu_Item_ID, Inventory_Item_ID, Quantity_Required) VALUES
-- Masala Dosa (SI001 = 1): rice batter, urad dal, potato filling, oil
(1, 1, 0.100), (1, 2, 0.050), (1, 6, 0.150), (1, 9, 0.020),
-- Idli Sambar (SI002 = 2)
(2, 1, 0.080), (2, 2, 0.050), (2, 4, 0.050),
-- Medu Vada (SI003 = 3)
(3, 2, 0.100), (3, 9, 0.020), (3, 11, 0.005),
-- Uttapam (SI004 = 4)
(4, 1, 0.090), (4, 2, 0.040), (4, 7, 0.050), (4, 8, 0.050),
-- Dal Makhani (NI001 = 5)
(5, 3, 0.150), (5, 8, 0.100), (5, 9, 0.015), (5, 1, 0.200),
-- Paneer Butter Masala (NI002 = 6)
(6, 5, 0.150), (6, 8, 0.100), (6, 7, 0.080), (6, 18, 0.100),
-- Masala Chai (BV001 = 9)
(9, 4, 0.100), (9, 14, 0.005), (9, 16, 0.010),
-- Filter Coffee (BV002 = 10)
(10, 4, 0.100), (10, 15, 0.008), (10, 16, 0.010),
-- Student Combo (CM001 = 21)
(21, 1, 0.200), (21, 3, 0.100), (21, 18, 0.100);

-- ============================================================
-- 10. OFFER
-- ============================================================
INSERT INTO OFFER (Offer_Code, Offer_Name, Discount_Type, Discount_Value, Min_Order_Value, Valid_From, Valid_To, Offer_Status) VALUES
('STUDENT10', 'Student 10% Off', 'percentage', 10.00, 50.00, '2026-11-01', '2026-12-31', 'active'),
('WELCOME50', 'Welcome Flat ₹50 Off', 'flat', 50.00, 200.00, '2026-11-01', '2026-11-30', 'active'),
('COMBO15', 'Combo Meal 15% Off', 'percentage', 15.00, 80.00, '2026-11-01', '2026-11-30', 'active'),
('FACULTY20', 'Faculty 20% Discount', 'percentage', 20.00, 0.00, '2026-01-01', '2026-12-31', 'active');

-- ============================================================
-- 11. ORDERS (15 sample orders)
-- ============================================================
INSERT INTO ORDERS (Customer_ID, Cafeteria_ID, Counter_ID, Employee_ID, Order_DateTime, Order_Type, Order_Status, Subtotal, Tax_Amount, Discount_Amount, Total_Amount, Payment_Status, Inventory_Deducted) VALUES
(1, 1, 1, 2, '2026-11-01 08:30:00', 'dine_in',  'delivered', 80.00,  4.00, 0.00, 84.00,  'paid', 1),
(2, 1, 1, 2, '2026-11-01 09:15:00', 'dine_in',  'delivered', 90.00,  4.50, 9.00, 85.50,  'paid', 1),
(3, 1, 1, 2, '2026-11-01 12:00:00', 'dine_in',  'delivered', 99.00,  4.95, 19.80, 84.15, 'paid', 1),
(4, 1, 2, 2, '2026-11-01 10:00:00', 'takeaway', 'delivered', 45.00,  2.25, 0.00, 47.25,  'paid', 1),
(5, 1, 4, 2, '2026-11-02 08:45:00', 'dine_in',  'delivered', 60.00,  3.00, 9.00, 54.00,  'paid', 1),
(6, 1, 1, 2, '2026-11-02 12:30:00', 'dine_in',  'delivered', 170.00, 8.50, 0.00, 178.50, 'paid', 1),
(7, 3, 7, 10,'2026-11-02 11:00:00', 'dine_in',  'delivered', 180.00, 9.00, 36.00, 153.00,'paid', 1),
(8, 2, 5, 7, '2026-11-02 14:00:00', 'takeaway', 'delivered', 75.00,  3.75, 0.00, 78.75,  'paid', 1),
(9, 1, 1, 2, '2026-11-03 09:00:00', 'dine_in',  'preparing', 135.00, 6.75, 0.00, 141.75, 'unpaid', 0),
(10,1, 1, 2, '2026-11-03 09:30:00', 'dine_in',  'pending',   45.00,  2.25, 0.00, 47.25,  'unpaid', 0),
(1, 1, 2, 5, '2026-11-03 10:00:00', 'dine_in',  'delivered', 35.00,  1.75, 0.00, 36.75,  'paid', 1),
(2, 1, 3, 5, '2026-11-03 10:15:00', 'dine_in',  'delivered', 70.00,  3.50, 0.00, 73.50,  'paid', 1),
(3, 1, 1, 2, '2026-11-03 11:00:00', 'dine_in',  'confirmed', 99.00,  4.95, 19.80, 84.15, 'paid', 0),
(5, 2, 5, 7, '2026-11-03 11:30:00', 'takeaway', 'delivered', 55.00,  2.75, 0.00, 57.75,  'paid', 1),
(6, 1, 1, 2, '2026-11-03 12:00:00', 'dine_in',  'pending',   175.00, 8.75, 0.00, 183.75, 'unpaid', 0);

-- ============================================================
-- 12. ORDER_ITEM
-- ============================================================
INSERT INTO ORDER_ITEM (Order_ID, Menu_Item_ID, Quantity, Unit_Price, Tax_Rate, Line_Total) VALUES
-- Order 1: Dal Makhani + Rice
(1,  5,  1, 80.00, 5.00, 84.00),
-- Order 2: Paneer Butter Masala + Roti  (with 10% student offer)
(2,  6,  1, 90.00, 5.00, 94.50),
-- Order 3: Student Combo (with 20% faculty discount)
(3,  21, 1, 99.00, 5.00, 103.95),
-- Order 4: Masala Dosa
(4,  1,  1, 45.00, 5.00, 47.25),
-- Order 5: Breakfast Combo (combo 15% off)
(5,  22, 1, 60.00, 5.00, 63.00),
-- Order 6: Veg Biryani + Gulab Jamun + Lassi
(6,  8,  1, 85.00, 5.00, 89.25),
(6,  16, 1, 30.00, 5.00, 31.50),
(6,  12, 1, 30.00, 5.00, 31.50),
-- Order 7: 2x Paneer Butter Masala (faculty 20% off)
(7,  6,  2, 90.00, 5.00, 189.00),
-- Order 8: Chole Bhature
(8,  7,  1, 75.00, 5.00, 78.75),
-- Order 9: 3x Masala Dosa
(9,  1,  3, 45.00, 5.00, 141.75),
-- Order 10: Masala Dosa
(10, 1,  1, 45.00, 5.00, 47.25),
-- Order 11: Idli Sambar
(11, 2,  1, 35.00, 5.00, 36.75),
-- Order 12: Gulab Jamun + Ice Cream
(12, 16, 1, 30.00, 5.00, 31.50),
(12, 18, 1, 40.00, 5.00, 42.00),
-- Order 13: Student Combo (faculty discount)
(13, 21, 1, 99.00, 5.00, 103.95),
-- Order 14: Samosa (2) + Masala Chai
(14, 13, 2, 20.00, 5.00, 42.00),
(14, 9,  1, 15.00, 5.00, 15.75),
-- Order 15: Veg Biryani + Paneer + Chai
(15, 8,  1, 85.00, 5.00, 89.25),
(15, 6,  1, 90.00, 5.00, 94.50);

-- ============================================================
-- 13. PAYMENT
-- ============================================================
INSERT INTO PAYMENT (Order_ID, Payment_Method, Payment_DateTime, Amount, Payment_Status, Transaction_Ref) VALUES
(1,  'cash',   '2026-11-01 08:35:00', 84.00,  'completed', NULL),
(2,  'upi',    '2026-11-01 09:20:00', 85.50,  'completed', 'UPI20261101092001'),
(3,  'card',   '2026-11-01 12:05:00', 84.15,  'completed', 'CARD20261101120501'),
(4,  'cash',   '2026-11-01 10:05:00', 47.25,  'completed', NULL),
(5,  'upi',    '2026-11-02 08:50:00', 54.00,  'completed', 'UPI20261102085001'),
(6,  'card',   '2026-11-02 12:35:00', 178.50, 'completed', 'CARD20261102123501'),
(7,  'card',   '2026-11-02 11:05:00', 153.00, 'completed', 'CARD20261102110501'),
(8,  'cash',   '2026-11-02 14:05:00', 78.75,  'completed', NULL),
(11, 'upi',    '2026-11-03 10:05:00', 36.75,  'completed', 'UPI20261103100501'),
(12, 'cash',   '2026-11-03 10:20:00', 73.50,  'completed', NULL),
(13, 'card',   '2026-11-03 11:05:00', 84.15,  'completed', 'CARD20261103110501'),
(14, 'upi',    '2026-11-03 11:35:00', 57.75,  'completed', 'UPI20261103113501');

-- ============================================================
-- 14. ORDER_OFFER
-- ============================================================
INSERT INTO ORDER_OFFER (Order_ID, Offer_ID, Applied_Discount) VALUES
(2,  1, 9.00),   -- STUDENT10 on Order 2
(3,  4, 19.80),  -- FACULTY20 on Order 3
(5,  3, 9.00),   -- COMBO15 on Order 5
(7,  4, 36.00),  -- FACULTY20 on Order 7
(13, 4, 19.80);  -- FACULTY20 on Order 13

-- ============================================================
-- 15. STOCK_TRANSACTION
-- ============================================================
INSERT INTO STOCK_TRANSACTION (Inventory_Item_ID, Employee_ID, Supplier_ID, Txn_Type, Quantity, Txn_DateTime, Reference_Type, Reference_ID, Unit_Cost, Remarks) VALUES
(1, 4, 4, 'purchase', 50.000, '2026-10-30 08:00:00', 'PURCHASE_ORDER', 1001, 75.00, 'Weekly rice stock'),
(4, 4, 2, 'purchase', 30.000, '2026-10-30 08:30:00', 'PURCHASE_ORDER', 1002, 50.00, 'Fresh milk delivery'),
(6, 4, 1, 'purchase', 20.000, '2026-10-30 09:00:00', 'PURCHASE_ORDER', 1003, 22.00, 'Potato stock'),
(14,4, 5, 'purchase', 3.000,  '2026-10-30 09:30:00', 'PURCHASE_ORDER', 1004, 250.00, 'Tea leaves'),
(1, 4, NULL, 'consumption', 5.000, '2026-11-01 22:00:00', 'ORDER_BATCH', NULL, NULL, 'Daily rice consumption'),
(4, 4, NULL, 'consumption', 3.000, '2026-11-01 22:00:00', 'ORDER_BATCH', NULL, NULL, 'Daily milk usage'),
(6, 4, NULL, 'waste',       0.500, '2026-11-01 22:30:00', 'WASTE_LOG',   NULL, NULL, 'Damaged potatoes disposed');

-- ============================================================
-- 16. FEEDBACK
-- ============================================================
INSERT INTO FEEDBACK (Order_ID, Customer_ID, Rating, Feedback_Category, Comments, Feedback_Date) VALUES
(1,  1, 5, 'food_quality', 'Excellent Dal Makhani! Loved the taste.', '2026-11-01 09:00:00'),
(2,  2, 4, 'service',      'Good service, quick delivery.', '2026-11-01 10:00:00'),
(4,  4, 5, 'food_quality', 'Best Masala Dosa on campus!', '2026-11-01 11:00:00'),
(5,  5, 4, 'value',        'Great value for money.', '2026-11-02 09:30:00'),
(6,  6, 3, 'cleanliness',  'Food was good but the table was not clean.', '2026-11-02 13:30:00'),
(8,  8, 5, 'food_quality', 'Chole Bhature was amazing!', '2026-11-02 15:00:00'),
(11, 1, 4, 'food_quality', 'Good Idli Sambar.', '2026-11-03 11:00:00'),
(14, 5, 5, 'value',        'Quick snack at a good price!', '2026-11-03 12:00:00');

COMMIT;
