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
const inventoryController = new InventoryController(getInventoryReportUseCase, transferStockUseCase, inventoryRepo);
const productController = new ProductController(searchProductsUseCase);
const reportController = new ReportController(getStaffKpiUseCase, getBranchRevenueUseCase, reportRepo);
const authController = new AuthController(loginByRoleUseCase);

// =========================================================================
// 1. AUTH ROUTE (4 Native SQL Server Roles)
// =========================================================================
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));

// =========================================================================
// 2. ORDER ROUTES (Bán hàng & Hóa đơn)
// =========================================================================
// Gọi SP 1: sp_TaoDonHangVaChiTiet
router.post('/orders', (req, res, next) => orderController.create(req, res, next));

// Gọi iTVF 3: fn_DanhSachDonHangTheoKhoangThoiGian
router.get('/orders', (req, res, next) => orderController.getOrders(req, res, next));

// Gọi View 4 (v_InHoaDon_ChiTietPhucHop) + UDF 5 (fn_FormatMaHoaDonTuDong)
router.get('/orders/:id/invoice', (req, res, next) => orderController.getInvoice(req, res, next));

// Gọi SP 2: sp_CapNhatTrangThaiDonHang
router.patch('/orders/:id/status', (req, res, next) => orderController.updateStatus(req, res, next));

// Gọi Scalar UDF 1: fn_TinhTienSauChietKhauVIP
router.get('/orders/vip-discount', (req, res, next) => orderController.calculateDiscount(req, res, next));

// Gọi Scalar UDF 2: fn_KiemTraKhaNangDapUngDonHang
router.get('/orders/check-stock', (req, res, next) => orderController.checkStock(req, res, next));

// Gọi Giao dịch ACID Tx 1: usp_Tx_DatHangVaGiuCho (UPDLOCK + HOLDLOCK)
router.post('/orders/atomic-reserve', (req, res, next) => orderController.createAtomic(req, res, next));

// Gọi Giao dịch ACID Tx 2: usp_Tx_HuyDonHangVaHoanTonKho (Hoàn tồn kho)
router.post('/orders/:id/cancel-refund', (req, res, next) => orderController.cancelRefund(req, res, next));

// =========================================================================
// 3. INVENTORY ROUTES (Kho hàng & Điều chuyển)
// =========================================================================
// Gọi View 1: v_BaoCaoTonKho_XepHang (Window Functions)
router.get('/inventory/ranked-report', (req, res, next) => inventoryController.getReport(req, res, next));

// Gọi SP 3: sp_ChuyenKhoNoiBo (UPDLOCK)
router.post('/inventory/transfer', (req, res, next) => inventoryController.transfer(req, res, next));

// Gọi Giao dịch ACID Tx 5: usp_Tx_ChuyenKhoHangHoaLienChiNhanh
router.post('/inventory/inter-branch-transfer', (req, res, next) => inventoryController.transferInterBranch(req, res, next));

// =========================================================================
// 4. PRODUCT ROUTES (Tìm kiếm)
// =========================================================================
// Gọi SP 4: sp_TimKiemSanPhamNangCao (Dynamic Filters)
router.get('/products/search', (req, res, next) => productController.search(req, res, next));

// =========================================================================
// 5. REPORT & HR ROUTES (Báo cáo tổng hợp, KPI & Quản trị nhân sự)
// =========================================================================
// Gọi mTVF 4: fn_BaoCaoDoanhThuNhanVienChiTiet
router.get('/reports/staff-kpi', (req, res, next) => reportController.getStaffKpi(req, res, next));

// Gọi SP 5: sp_BaoCaoTongHopDoanhThuChiNhanh
router.get('/reports/branch-revenue', (req, res, next) => reportController.getBranchRevenue(req, res, next));

// Gọi View 5 (Indexed View): v_TongHopDoanhThuSanPham WITH (NOEXPAND)
router.get('/reports/indexed-sales', (req, res, next) => reportController.getIndexedSales(req, res, next));

// Gọi View 2: v_PhanCapNhanSu_ToanDien (Self-Join Hierarchy)
router.get('/reports/staff-hierarchy', (req, res, next) => reportController.getStaffHierarchy(req, res, next));

// Gọi View 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)
router.get('/reports/branch1-staff', (req, res, next) => reportController.getBranch1Staff(req, res, next));

// Gọi Giao dịch ACID Tx 3: usp_Tx_XoaNhanVienVaDieuChuyenQuanLy
router.post('/staff/reorganize', (req, res, next) => reportController.reorganizeStaff(req, res, next));

// Gọi Giao dịch ACID Tx 4: usp_Tx_ThangHangThanhVienHangLoat
router.post('/customers/batch-promote', (req, res, next) => reportController.batchPromote(req, res, next));

module.exports = router;
