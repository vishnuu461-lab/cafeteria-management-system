// Vercel Serverless entry point
// This wraps the Express backend as a serverless function
const app = require('../backend/server');
module.exports = app;
