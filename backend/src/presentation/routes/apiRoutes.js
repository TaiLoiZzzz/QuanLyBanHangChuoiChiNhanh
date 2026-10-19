const express = require('express');
const router = express.Router();

// Repositories
const SqlServerOrderRepository = require('../../infrastructure/repositories/SqlServerOrderRepository');
const SqlServerInventoryRepository = require('../../infrastructure/repositories/SqlServerInventoryRepository');
const SqlServerProductRepository = require('../../infrastructure/repositories/SqlServerProductRepository');
const SqlServerReportRepository = require('../../infrastructure/repositories/SqlServerReportRepository');
const SqlServerAuthRepository = require('../../infrastructure/repositories/SqlServerAuthRepository');

// Use Cases
const CreateOrderUseCase = require('../../core/usecases/CreateOrderUseCase');
const GetInvoiceDetailUseCase = require('../../core/usecases/GetInvoiceDetailUseCase');
const GetInventoryReportUseCase = require('../../core/usecases/GetInventoryReportUseCase');
const TransferStockUseCase = require('../../core/usecases/TransferStockUseCase');
const SearchProductsUseCase = require('../../core/usecases/SearchProductsUseCase');
const GetStaffKpiUseCase = require('../../core/usecases/GetStaffKpiUseCase');
const GetBranchRevenueUseCase = require('../../core/usecases/GetBranchRevenueUseCase');
const LoginByRoleUseCase = require('../../core/usecases/LoginByRoleUseCase');

// Controllers
const OrderController = require('../controllers/OrderController');
const InventoryController = require('../controllers/InventoryController');
const ProductController = require('../controllers/ProductController');
const ReportController = require('../controllers/ReportController');
const AuthController = require('../controllers/AuthController');

// Instantiate dependencies (Dependency Injection)
const orderRepo = new SqlServerOrderRepository();
const inventoryRepo = new SqlServerInventoryRepository();
const productRepo = new SqlServerProductRepository();
const reportRepo = new SqlServerReportRepository();
const authRepo = new SqlServerAuthRepository();

const createOrderUseCase = new CreateOrderUseCase(orderRepo);
const getInvoiceDetailUseCase = new GetInvoiceDetailUseCase(orderRepo);
const getInventoryReportUseCase = new GetInventoryReportUseCase(inventoryRepo);
const transferStockUseCase = new TransferStockUseCase(inventoryRepo);
const searchProductsUseCase = new SearchProductsUseCase(productRepo);
const getStaffKpiUseCase = new GetStaffKpiUseCase(reportRepo);
const getBranchRevenueUseCase = new GetBranchRevenueUseCase(reportRepo);
const loginByRoleUseCase = new LoginByRoleUseCase(authRepo);

const orderController = new OrderController(createOrderUseCase, getInvoiceDetailUseCase, orderRepo);
const inventoryController = new InventoryController(getInventoryReportUseCase, transferStockUseCase);
const productController = new ProductController(searchProductsUseCase);
const reportController = new ReportController(getStaffKpiUseCase, getBranchRevenueUseCase, reportRepo);
const authController = new AuthController(loginByRoleUseCase);

// 1. Auth Route
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));

// 2. Order Routes (Bán hàng & Hóa đơn)
router.post('/orders', (req, res, next) => orderController.create(req, res, next));
router.get('/orders', (req, res, next) => orderController.getOrders(req, res, next));
router.get('/orders/:id/invoice', (req, res, next) => orderController.getInvoice(req, res, next));
router.patch('/orders/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));

// 3. Inventory Routes (Kho hàng)
router.get('/inventory/ranked-report', (req, res, next) => inventoryController.getReport(req, res, next));
router.post('/inventory/transfer', (req, res, next) => inventoryController.transfer(req, res, next));

// 4. Product Routes (Tìm kiếm)
router.get('/products/search', (req, res, next) => productController.search(req, res, next));

// 5. Report Routes (KPI & Doanh thu)
router.get('/reports/staff-kpi', (req, res, next) => reportController.getStaffKpi(req, res, next));
router.get('/reports/branch-revenue', (req, res, next) => reportController.getBranchRevenue(req, res, next));
router.get('/reports/indexed-sales', (req, res, next) => reportController.getIndexedSales(req, res, next));

module.exports = router;
