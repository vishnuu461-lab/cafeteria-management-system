# Implementation Plan — Cafeteria Management System Upgrade

## Phase 1: Database (Tables + Seeds)
- [ ] workers table (3 workers with bcrypt passwords)
- [ ] admins table (1 admin with bcrypt password)
- [ ] Update inventory_item (40 items)
- [ ] recipe_item connections (inventory ↔ menu)

## Phase 2: Backend APIs
- [ ] POST /api/auth/worker/login (bcrypt)
- [ ] POST /api/auth/admin/login (bcrypt)
- [ ] GET /api/worker/counter/orders
- [ ] PATCH /api/worker/counter/cash-confirm
- [ ] PATCH /api/worker/counter/order-status
- [ ] GET /api/worker/inventory
- [ ] PATCH /api/worker/inventory/:id
- [ ] GET /api/student/offers (active offers)
- [ ] POST /api/student/coupon/validate
- [ ] Update /api/student/order (coupon support)
- [ ] Update /api/student/menu (inventory-aware)

## Phase 3: Frontend
- [ ] LoginSelection (3 buttons)
- [ ] WorkerLogin page
- [ ] CounterDashboard (Worker 1 & 2)
- [ ] InventoryDashboard (Worker 3)
- [ ] StudentApp: Offers tab
- [ ] StudentApp: Coupon at checkout
- [ ] StudentApp: PDF receipt
- [ ] App.jsx routing for workers

## Status: IN PROGRESS
