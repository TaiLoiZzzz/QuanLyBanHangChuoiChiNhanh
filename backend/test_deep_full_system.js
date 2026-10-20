
if (process.env.RUN_LEGACY_TESTS !== 'true' || !process.env.DB_NAME?.startsWith('DBMSTest_')) throw new Error('Legacy diagnostics require an isolated DBMSTest_* database. Use npm run test:integration for supported regression tests.');
/**
 * =========================================================================
 * BỘ KIỂM THỬ TOÀN DIỆN CHUYÊN SÂU BACKEND VÀ CSDL (FULL-SYSTEM DEEP AUDIT)
 * HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
 * GVHD: TS. PHAN THỊ THỂ
 * =========================================================================
 */

const http = require('http');
const sql = require('mssql');
require('dotenv').config();

const dbConfig = {
  server: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 11433,
  database: process.env.DB_NAME || 'QuanLyBanHangDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'PasswordAdmin@2026',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 30000
};

let passed = 0;
let failed = 0;

function assert(condition, name, detail = '') {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${name}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${name} ${detail ? '-> ' + detail : ''}`);
  }
}

// Helper gửi HTTP Request
function sendRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        const duration = Date.now() - startTime;
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, body, json, duration });
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runDeepAudit() {
  console.log('================================================================');
  console.log('KIEM TRA CHUYEN SAU TOAN HE THONG: CSDL SQL SERVER & BACKEND API');
  console.log('GIANG VIEN HUONG DAN: TS. PHAN THI THE (HCMUTE)');
  console.log('================================================================\n');

  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  // =========================================================================
  // PHẦN 1: KIỂM TRA CHUYÊN SÂU TẦNG CSDL (DATABASE SCHEMA & CONSTRAINTS)
  // =========================================================================
  console.log('>>> [PHAN 1] KIEM TRA CAU TRUC VA RANG BUOC CSDL (11 BANG, PK, FK, CK)');

  // 1.1 Kiểm tra đầy đủ 11 bảng
  const expectedTables = [
    'ChiNhanh', 'NhanVien', 'KhachHang', 'DanhMuc', 'SanPham',
    'KhoHang', 'TonKho', 'DonHang', 'ChiTietDonHang', 'LichSuGia', 'NhatKyHeThong'
  ];
  const tablesRes = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
  `);
  const actualTables = tablesRes.recordset.map(t => t.TABLE_NAME);
  const allTablesPresent = expectedTables.every(t => actualTables.includes(t));
  assert(allTablesPresent, `CSDL co day du 11 bang nghiep vu (Thuc te: ${actualTables.length} bang)`);

  // 1.2 Kiểm tra Primary Keys & Foreign Keys
  const fkRes = await pool.request().query(`
    SELECT COUNT(*) AS FkCount FROM sys.foreign_keys
  `);
  assert(fkRes.recordset[0].FkCount >= 10, `He thong co day du Khoa ngoai quan he giua cac bang (${fkRes.recordset[0].FkCount} FKs)`);

  // 1.3 Kiểm tra Check Constraints (Khong am, Dinh dang SDT, Trang thai hop le)
  const ckRes = await pool.request().query(`
    SELECT name, definition FROM sys.check_constraints
  `);
  const ckNames = ckRes.recordset.map(c => c.name);
  assert(ckNames.includes('CK_ChiTiet_SoLuong'), 'Rang buoc CHECK SoLuong > 0 tren ChiTietDonHang');
  assert(ckNames.includes('CK_TonKho_KhongAm'), 'Rang buoc CHECK TonKho >= 0 (Chong am kho)');
  assert(ckNames.includes('CK_KhachHang_SoDT'), 'Rang buoc CHECK SoDT dung 10 chu so');
  assert(ckNames.includes('CK_DonHang_TrangThai'), 'Rang buoc CHECK TrangThai DonHang (0, 1, 2, 3, 4)');

  // 1.4 Kiểm tra Unique Constraints
  const uqRes = await pool.request().query(`
    SELECT name FROM sys.key_constraints WHERE type = 'UQ'
  `);
  const uqNames = uqRes.recordset.map(u => u.name);
  assert(uqNames.includes('UQ_KhachHang_SoDT'), 'Rang buoc UNIQUE SoDT KhachHang (Chong tao trung lap)');
  assert(uqNames.includes('UQ_ChiNhanh_SoDT'), 'Rang buoc UNIQUE SoDT ChiNhanh');
  assert(uqNames.includes('UQ_DanhMuc_TenDM'), 'Rang buoc UNIQUE TenDM DanhMuc');

  // =========================================================================
  // PHẦN 2: KIỂM TRA CHUYÊN SÂU 5 VIEWS, 5 FUNCTIONS, 5 TRIGGERS
  // =========================================================================
  console.log('\n>>> [PHAN 2] KIEM TRA LAP TRINH CSDL (5 VIEWS, 5 FUNCTIONS, 5 TRIGGERS)');

  // 2.1 Kiểm tra 5 Views
  const viewsRes = await pool.request().query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS
  `);
  const actualViews = viewsRes.recordset.map(v => v.TABLE_NAME);
  assert(actualViews.includes('v_BaoCaoTonKho_XepHang'), 'View 1: v_BaoCaoTonKho_XepHang (DENSE_RANK)');
  assert(actualViews.includes('v_TongHopDoanhThuSanPham'), 'View 2: v_TongHopDoanhThuSanPham (SCHEMABINDING)');
  assert(actualViews.includes('v_InHoaDon_ChiTietPhucHop'), 'View 3: v_InHoaDon_ChiTietPhucHop (Hoa don phuc hop)');
  assert(actualViews.includes('v_PhanCapNhanSu_ToanDien'), 'View 4: v_PhanCapNhanSu_ToanDien (Recursive CTE)');
  assert(actualViews.includes('v_NhanVien_ChiNhanh1_KiemSoat'), 'View 5: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)');

  // Kiểm tra chỉ mục Clustered Index trên View 2 (Indexed View)
  const idxViewRes = await pool.request().query(`
    SELECT i.name, i.type_desc 
    FROM sys.indexes i
    INNER JOIN sys.views v ON i.object_id = v.object_id
    WHERE v.name = 'v_TongHopDoanhThuSanPham' AND i.type = 1;
  `);
  assert(idxViewRes.recordset.length > 0, `Indexed View v_TongHopDoanhThuSanPham co Clustered Index doc quyen: ${idxViewRes.recordset[0]?.name}`);

  // 2.2 Kiểm tra 5 Functions
  const fnsRes = await pool.request().query(`
    SELECT name, type_desc FROM sys.objects WHERE type IN ('FN', 'IF', 'TF')
  `);
  const fnNames = fnsRes.recordset.map(f => f.name);
  assert(fnNames.includes('fn_TinhTienSauChietKhauVIP'), 'Function 1: fn_TinhTienSauChietKhauVIP (Scalar UDF)');
  assert(fnNames.includes('fn_KiemTraKhaNangDapUngDonHang'), 'Function 2: fn_KiemTraKhaNangDapUngDonHang (Scalar UDF)');
  assert(fnNames.includes('fn_DanhSachDonHangTheoKhoangThoiGian'), 'Function 3: fn_DanhSachDonHangTheoKhoangThoiGian (Inline TVF)');
  assert(fnNames.includes('fn_BaoCaoDoanhThuNhanVienChiTiet'), 'Function 4: fn_BaoCaoDoanhThuNhanVienChiTiet (Multi-statement TVF)');
  assert(fnNames.includes('fn_FormatMaHoaDonTuDong'), 'Function 5: fn_FormatMaHoaDonTuDong (Scalar UDF)');

  // 2.3 Kiểm tra 5 Triggers
  const trgRes = await pool.request().query(`SELECT name FROM sys.triggers`);
  const trgNames = trgRes.recordset.map(t => t.name);
  assert(trgNames.includes('trg_ChiTietDonHang_SyncKho_TongTien'), 'Trigger 1: trg_ChiTietDonHang_SyncKho_TongTien (Dong bo kho & tong tien)');
  assert(trgNames.includes('trg_SanPham_LichSuGia'), 'Trigger 2: trg_SanPham_LichSuGia (Ghi nhat ky lich su gia)');
  assert(trgNames.includes('trg_DonHang_CapNhatDiemTichLuyKhachHang'), 'Trigger 3: trg_DonHang_CapNhatDiemTichLuyKhachHang (Tich diem thuong)');
  assert(trgNames.includes('trg_DonHang_CamXoaDonDaGiao'), 'Trigger 4: trg_DonHang_CamXoaDonDaGiao (INSTEAD OF DELETE chong gian lan)');
  assert(trgNames.includes('trg_NhanVien_AuditLog'), 'Trigger 5: trg_NhanVien_AuditLog (Audit log nhan su vao NhatKyHeThong)');

  // 2.4 Kiểm tra Trigger 2 (LichSuGia) hoạt động thực tế
  const updatePriceRes = await pool.request().query(`
    DECLARE @OldPrice DECIMAL(12,2), @NewPrice DECIMAL(12,2);
    SELECT @OldPrice = GiaBanHienTai FROM SanPham WHERE MaSP = 1;
    SET @NewPrice = @OldPrice + 100000;
    UPDATE SanPham SET GiaBanHienTai = @NewPrice WHERE MaSP = 1;
    UPDATE SanPham SET GiaBanHienTai = @OldPrice WHERE MaSP = 1; -- Tra ve gia cu
    SELECT COUNT(*) AS LogCount FROM LichSuGia WHERE MaSP = 1;
  `);
  assert(updatePriceRes.recordset[0].LogCount >= 2, `Trigger 2 (trg_SanPham_LichSuGia) tu dong ghi nhat ky thay doi gia vao LichSuGia`);

  // =========================================================================
  // PHẦN 3: KIỂM TRA CHUYÊN SÂU TẦNG BACKEND (CLEAN ARCHITECTURE & REST APIS)
  // =========================================================================
  console.log('\n>>> [PHAN 3] KIEM TRA CHUYEN SAU TOAN BO REST APIS (BACKEND CLEAN ARCHITECTURE)');

  // 3.1 Health check
  const health = await sendRequest({ hostname: 'localhost', port: 5000, path: '/health', method: 'GET' });
  assert(health.status === 200 && health.json?.status === 'ONLINE', 'Endpoint GET /health hoat dong on dinh (HTTP 200)');

  // 3.2 Master data APIs
  const branches = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/branches', method: 'GET' });
  assert(branches.status === 200 && branches.json?.count > 0, `GET /api/branches tra ve ${branches.json?.count} chi nhanh (${branches.duration}ms)`);

  const warehouses = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/warehouses', method: 'GET' });
  assert(warehouses.status === 200 && warehouses.json?.count > 0, `GET /api/warehouses tra ve ${warehouses.json?.count} kho hang`);

  const categories = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/categories', method: 'GET' });
  assert(categories.status === 200 && categories.json?.count > 0, `GET /api/categories tra ve ${categories.json?.count} danh muc`);

  const customers = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/customers', method: 'GET' });
  assert(customers.status === 200 && customers.json?.count > 0, `GET /api/customers tra ve ${customers.json?.count} khach hang`);

  const employees = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/employees', method: 'GET' });
  assert(employees.status === 200 && employees.json?.count > 0, `GET /api/employees tra ve ${employees.json?.count} nhan vien`);

  // 3.3 Product Search (SP 4: sp_TimKiemSanPhamNangCao)
  const searchProd = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/products/search?keyword=iPhone', method: 'GET' });
  assert(searchProd.status === 200 && searchProd.json?.products?.length > 0, `GET /api/products/search tim kiem dung san pham qua SP 4 (${searchProd.duration}ms)`);

  // 3.4 Order APIs (POS, UDF, SP 1, View 4)
  const checkStock = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/orders/check-stock?maKho=1&maSP=1&soLuong=1', method: 'GET' });
  assert(checkStock.status === 200 && checkStock.json?.duHangDapUng === true, 'GET /api/orders/check-stock goi UDF 2 xac nhan du hang');

  const vipDisc = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/orders/vip-discount?maKH=2&tongTienGoc=1000000', method: 'GET' });
  assert(vipDisc.status === 200 && vipDisc.json?.tienSauGiam < 1000000, 'GET /api/orders/vip-discount tinh chiet khau qua UDF 1');

  // Đặt đơn hàng mới qua API (POST /api/orders -> SP 1)
  const newOrderReq = await sendRequest({
    hostname: 'localhost', port: 5000, path: '/api/orders', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    maKH: 1, maNV: 1, maKhoXuat: 1, maSP: 1, soLuong: 1, donGiaBan: 25000000
  });
  const createdOrderId = newOrderReq.json?.maDH;
  assert(newOrderReq.status === 201 && createdOrderId > 0, `POST /api/orders tao don hang moi thanh cong (MaDH: ${createdOrderId})`);

  // Lấy chi tiết hóa đơn (GET /api/orders/:id/invoice -> View 3 + UDF 5)
  const invoiceReq = await sendRequest({ hostname: 'localhost', port: 5000, path: `/api/orders/${createdOrderId}/invoice`, method: 'GET' });
  assert(invoiceReq.status === 200 && invoiceReq.json?.items?.length > 0, `GET /api/orders/:id/invoice in hoa don format ${invoiceReq.json?.items?.[0]?.MaHoaDonFormat}`);

  // Cập nhật trạng thái đơn sang 1 (SP 2: sp_CapNhatTrangThaiDonHang)
  const updateStatusReq = await sendRequest({
    hostname: 'localhost', port: 5000, path: `/api/orders/${createdOrderId}/status`, method: 'PATCH',
    headers: { 'Content-Type': 'application/json' }
  }, { trangThai: 1 });
  assert(updateStatusReq.status === 200, `PATCH /api/orders/:id/status cap nhat trang thai don hang qua SP 2`);

  // 3.5 Báo cáo & Phân tích (Views, mTVF 4, SP 5)
  const kpiReq = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/reports/staff-kpi?year=2026', method: 'GET' });
  assert(kpiReq.status === 200 && kpiReq.json?.report?.length > 0, `GET /api/reports/staff-kpi goi mTVF 4 bao cao doanh thu nhan vien`);

  const branchRevReq = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/reports/branch-revenue?year=2026', method: 'GET' });
  assert(branchRevReq.status === 200 && branchRevReq.json?.report?.length > 0, `GET /api/reports/branch-revenue goi SP 5 bao cao tong hop chi nhanh`);

  const indexedSalesReq = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/reports/indexed-sales', method: 'GET' });
  assert(indexedSalesReq.status === 200 && indexedSalesReq.json?.sales?.length > 0, `GET /api/reports/indexed-sales truy van Indexed View voi NOEXPAND`);

  const hierarchyReq = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/reports/staff-hierarchy', method: 'GET' });
  assert(hierarchyReq.status === 200 && hierarchyReq.json?.hierarchy?.length > 0, `GET /api/reports/staff-hierarchy truy van View 4 Recursive CTE nhan su`);

  const branch1StaffReq = await sendRequest({ hostname: 'localhost', port: 5000, path: '/api/reports/branch1-staff', method: 'GET' });
  assert(branch1StaffReq.status === 200 && branch1StaffReq.json?.staffList?.length > 0, `GET /api/reports/branch1-staff truy van View 5 (WITH CHECK OPTION)`);

  // =========================================================================
  // PHẦN 4: KIỂM TRA BẢO MẬT PHÂN QUYỀN VÀ XỬ LÝ NGOẠI LỆ (ERROR RESILIENCE)
  // =========================================================================
  console.log('\n>>> [PHAN 4] KIEM TRA BAO MAT 4 ROLES & MA LOI HTTP (403, 422, 400)');

  // 4.1 Đăng nhập sai mật khẩu CSDL -> HTTP 401
  const badLogin = await sendRequest({
    hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username: 'sa', password: 'WrongPassword@999' });
  assert(badLogin.status === 401, 'Dang nhap sai mat khau bi tu choi voi HTTP 401 Unauthorized');

  // 4.2 Thu ngân truy cập trái phép chức năng quản lý nhân sự -> HTTP 403 Forbidden
  const cashierForbidden = await sendRequest({
    hostname: 'localhost', port: 5000, path: '/api/staff/reorganize', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-DB-User': 'Login_ThuNgan',
      'X-DB-Password': 'CashierPassword@2026'
    }
  }, { maNVCantXoa: 2, maQLThayThe: 1 });
  assert(cashierForbidden.status === 403, `Thu ngan bi chan khi thuc thi chuc nang quan ly voi HTTP 403 Forbidden`);

  // 4.3 Dữ liệu đầu vào không hợp lệ (Số lượng <= 0) -> HTTP 400/422 Bad Request
  const invalidOrder = await sendRequest({
    hostname: 'localhost', port: 5000, path: '/api/orders', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { maKH: 1, maNV: 1, maKhoXuat: 1, maSP: 1, soLuong: -10, donGiaBan: 25000000 });
  assert(invalidOrder.status === 400 || invalidOrder.status === 422, `Tao don hang so luong am bi chan va tra ve thong bao nghiep vu: "${invalidOrder.json?.error}"`);

  // 4.4 Thao tác điều chuyển cùng kho xuất & nhập -> Bị chặn
  const sameWhTransfer = await sendRequest({
    hostname: 'localhost', port: 5000, path: '/api/inventory/inter-branch-transfer', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { maKhoXuat: 1, maKhoNhap: 1, maSP: 1, soLuong: 1 });
  assert(sameWhTransfer.status === 422 || sameWhTransfer.status === 500, `Dieu chuyen trung kho xuat/nhap bi chan boi SQL Server`);

  await pool.close();

  // =========================================================================
  // TỔNG KẾT BÁO CÁO TOÀN DIỆN
  // =========================================================================
  console.log('\n================================================================');
  console.log('TONG KET KIEM TRA CHUYEN SAU BACKEND & DATABASE:');
  console.log(`- TONG SO HANG MUC KIEM TRA : ${passed + failed}`);
  console.log(`- SO HANG MUC DAT CHUAN    : ${passed}`);
  console.log(`- SO HANG MUC THAT BAI     : ${failed}`);
  console.log(`- TY LE TOAN VEN HE THONG  : ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runDeepAudit().catch(err => {
  console.error('Loi bat thuong khi kiem tra he thong:', err);
  process.exit(1);
});
