const express = require('express');
const router = express.Router();
router.param('id', (req,res,next,id) => /^[1-9]\d*$/.test(id) ? next() : res.status(422).json({success:false,error:'Mã không hợp lệ.'}));
router.use(require('../middlewares/validateInput'));

// Repositories
const SqlServerOrderRepository = require('../../infrastructure/repositories/SqlServerOrderRepository');
const SqlServerInventoryRepository = require('../../infrastructure/repositories/SqlServerInventoryRepository');
const SqlServerProductRepository = require('../../infrastructure/repositories/SqlServerProductRepository');
const SqlServerReportRepository = require('../../infrastructure/repositories/SqlServerReportRepository');
const SqlServerAuthRepository = require('../../infrastructure/repositories/SqlServerAuthRepository');
const SqlServerMasterRepository = require('../../infrastructure/repositories/SqlServerMasterRepository');

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
const MasterDataController = require('../controllers/MasterDataController');

// Instantiate dependencies (Dependency Injection)
const orderRepo = new SqlServerOrderRepository();
const inventoryRepo = new SqlServerInventoryRepository();
const productRepo = new SqlServerProductRepository();
const reportRepo = new SqlServerReportRepository();
const authRepo = new SqlServerAuthRepository();
const masterRepo = new SqlServerMasterRepository();

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
const productController = new ProductController(searchProductsUseCase, productRepo);
const reportController = new ReportController(getStaffKpiUseCase, getBranchRevenueUseCase, reportRepo);
const authController = new AuthController(loginByRoleUseCase);
const masterController = new MasterDataController(masterRepo);

// =========================================================================
// 1. AUTH ROUTE (4 Native SQL Server Roles)
// =========================================================================
router.post('/auth/login', (req, res, next) => authController.login(req, res, next));
router.get('/auth/me', (req, res) => authController.me(req, res));
router.post('/auth/logout', (req, res) => authController.logout(req, res));

// =========================================================================
// 2. MASTER DATA ROUTES (Chi nhánh, Kho hàng, Danh mục, Khách hàng, Nhân viên, Logs)
// =========================================================================
// Chi nhánh
router.get('/branches', (req, res, next) => masterController.getBranches(req, res, next));
router.post('/branches', (req, res, next) => masterController.createBranch(req, res, next));

// Kho hàng
router.get('/warehouses', (req, res, next) => masterController.getWarehouses(req, res, next));

// Danh mục
router.get('/categories', (req, res, next) => masterController.getCategories(req, res, next));

// Khách hàng
router.get('/customers', (req, res, next) => masterController.getCustomers(req, res, next));
router.post('/customers', (req, res, next) => masterController.createCustomer(req, res, next));

// Nhân viên
router.get('/employees', (req, res, next) => masterController.getEmployees(req, res, next));
router.post('/employees', (req, res, next) => masterController.createEmployee(req, res, next));

// Nhật ký hệ thống
router.get('/audit-logs', (req, res, next) => masterController.getAuditLogs(req, res, next));

// =========================================================================
// 3. PRODUCT ROUTES (Danh sách, Tìm kiếm, Thêm, Sửa, Xóa mềm)
// =========================================================================
router.get('/products', (req, res, next) => productController.getAll(req, res, next));
router.get('/products/search', (req, res, next) => productController.search(req, res, next));
router.post('/products', (req, res, next) => productController.create(req, res, next));
router.put('/products/:id', (req, res, next) => productController.update(req, res, next));
router.delete('/products/:id', (req, res, next) => productController.delete(req, res, next));

// =========================================================================
// 4. ORDER ROUTES (Bán hàng & Hóa đơn)
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
// 5. INVENTORY ROUTES (Kho hàng & Điều chuyển)
// =========================================================================
// Gọi View 1: v_BaoCaoTonKho_XepHang (Window Functions)
router.get('/inventory/ranked-report', (req, res, next) => inventoryController.getReport(req, res, next));

// Gọi SP 3: sp_ChuyenKhoNoiBo (UPDLOCK)
router.post('/inventory/transfer', (req, res, next) => inventoryController.transfer(req, res, next));

// Gọi Giao dịch ACID Tx 5: usp_Tx_ChuyenKhoHangHoaLienChiNhanh
router.post('/inventory/inter-branch-transfer', (req, res, next) => inventoryController.transferInterBranch(req, res, next));

// =========================================================================
// 6. REPORT & HR ROUTES (Báo cáo tổng hợp, KPI & Quản trị nhân sự)
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


router.post('/inventory/receipts', async (req, res, next) => {
  try {
    const { maKho, maSP, soLuong } = req.body;
    if (![maKho,maSP,soLuong].every(n => Number.isSafeInteger(n) && n > 0)) return res.status(422).json({ success: false, error: 'Thông tin nhập kho không hợp lệ.' });
    const sql = require('mssql');
    const pool = await require('../../infrastructure/database/SqlServerConnectionFactory').getPool(req.userContext.user, req.userContext.password);
    const result = await pool.request().input('MaKho',sql.Int,maKho).input('MaSP',sql.Int,maSP).input('SoLuong',sql.Int,soLuong).execute('dbo.usp_NhapKho');
    res.status(201).json({ success: true, receipt: result.recordset[0] });
  } catch (err) { next(err); }
});

module.exports = router;
