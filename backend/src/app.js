const express = require('express');
const cors = require('cors');
const path = require('path');
const authMiddleware = require('./presentation/middlewares/authMiddleware');
const errorHandler = require('./presentation/middlewares/errorHandler');
const apiRoutes = require('./presentation/routes/apiRoutes');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../public')));

// Security context injection
app.use(authMiddleware);

// API Routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Hệ thống Quản lý Bán hàng & Chuỗi Tồn kho Đa Chi nhánh',
    course: 'Hệ quản trị CSDL (DBMS330284) - GV: TS. Phan Thị Thể',
    teamLead: 'Quách Tài Lợi (70%)',
    architecture: 'Clean Architecture (OOP) + Raw Driver mssql'
  });
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
