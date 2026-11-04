import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: BASE,
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
});

api.interceptors.response.use(
    res => res,
    err => {
        const msg = err.response?.data?.error || err.message || 'Network error';
        return Promise.reject(new Error(msg));
    }
);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data);

// Customers
export const getCustomers = (params) => api.get('/customers', { params }).then(r => r.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then(r => r.data);
export const createCustomer = (data) => api.post('/customers', data).then(r => r.data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data).then(r => r.data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then(r => r.data);

// Menu
export const getMenuItems = (params) => api.get('/menu', { params }).then(r => r.data);
export const getMenuItem = (id) => api.get(`/menu/${id}`).then(r => r.data);
export const createMenuItem = (data) => api.post('/menu', data).then(r => r.data);
export const updateMenuItem = (id, d) => api.put(`/menu/${id}`, d).then(r => r.data);
export const deleteMenuItem = (id) => api.delete(`/menu/${id}`).then(r => r.data);

// Categories
export const getCategories = () => api.get('/categories').then(r => r.data);
export const createCategory = (d) => api.post('/categories', d).then(r => r.data);
export const updateCategory = (id, d) => api.put(`/categories/${id}`, d).then(r => r.data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`).then(r => r.data);

// Cafeterias & Counters
export const getCafeterias = () => api.get('/cafeterias').then(r => r.data);
export const createCafeteria = (d) => api.post('/cafeterias', d).then(r => r.data);
export const updateCafeteria = (id, d) => api.put(`/cafeterias/${id}`, d).then(r => r.data);
export const getCounters = (p) => api.get('/counters', { params: p }).then(r => r.data);
export const createCounter = (d) => api.post('/counters', d).then(r => r.data);

// Employees
export const getEmployees = (p) => api.get('/employees', { params: p }).then(r => r.data);
export const createEmployee = (d) => api.post('/employees', d).then(r => r.data);
export const updateEmployee = (id, d) => api.put(`/employees/${id}`, d).then(r => r.data);

// Orders
export const getOrders = (params) => api.get('/orders', { params }).then(r => r.data);
export const getOrder = (id) => api.get(`/orders/${id}`).then(r => r.data);
export const createOrder = (data) => api.post('/orders', data).then(r => r.data);
export const updateOrderStatus = (id, status) => api.patch(`/orders/${id}/status`, { status }).then(r => r.data);

// Payments
export const getPayments = (p) => api.get('/payments', { params: p }).then(r => r.data);
export const createPayment = (d) => api.post('/payments', d).then(r => r.data);
export const getPaymentSummary = () => api.get('/payments/summary').then(r => r.data);

// Inventory
export const getInventory = (p) => api.get('/inventory', { params: p }).then(r => r.data);
export const getInventoryItem = (id) => api.get(`/inventory/${id}`).then(r => r.data);
export const createInventoryItem = (d) => api.post('/inventory', d).then(r => r.data);
export const updateInventoryItem = (id, d) => api.put(`/inventory/${id}`, d).then(r => r.data);
export const recordStockTxn = (d) => api.post('/inventory/stock-transaction', d).then(r => r.data);
export const getSuppliers = () => api.get('/inventory/suppliers/all').then(r => r.data);
export const createSupplier = (d) => api.post('/inventory/suppliers', d).then(r => r.data);

// Offers & Feedback
export const getOffers = () => api.get('/offers').then(r => r.data);
export const getActiveOffers = () => api.get('/offers/active').then(r => r.data);
export const createOffer = (d) => api.post('/offers', d).then(r => r.data);
export const updateOffer = (id, d) => api.put(`/offers/${id}`, d).then(r => r.data);
export const deactivateOffer = (id) => api.delete(`/offers/${id}`).then(r => r.data);
export const getFeedback = () => api.get('/offers/feedback/all').then(r => r.data);
export const submitFeedback = (d) => api.post('/offers/feedback', d).then(r => r.data);

// Reports
export const getDailySales = (p) => api.get('/reports/daily-sales', { params: p }).then(r => r.data);
export const getTopItems = (p) => api.get('/reports/top-items', { params: p }).then(r => r.data);
export const getCategorySales = () => api.get('/reports/category-sales').then(r => r.data);
export const getCustomerAnalysis = () => api.get('/reports/customer-analysis').then(r => r.data);
export const getLowStock = () => api.get('/reports/low-stock').then(r => r.data);
export const getFeedbackAnalysis = () => api.get('/reports/feedback-analysis').then(r => r.data);
export const getPaymentAnalysis = () => api.get('/reports/payment-analysis').then(r => r.data);

export default api;
