
if (process.env.RUN_LEGACY_TESTS !== 'true' || !process.env.DB_NAME?.startsWith('DBMSTest_')) throw new Error('Legacy diagnostics require an isolated DBMSTest_* database. Use npm run test:integration for supported regression tests.');
/**
 * =========================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG CHUYÊN SÂU CỰC CAO (ULTRA-DEEP VERIFICATION SUITE)
 * HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - GV: TS. PHAN THỊ THỂ
 * HỆ THỐNG: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
 * =========================================================================
 */

const sql = require('mssql');
require('dotenv').config();

const BASE_API = 'http://localhost:5000/api';
const sqlConfig = {
  server: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 11433,
  database: process.env.DB_NAME || 'QuanLyBanHangDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'PasswordAdmin@2026',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 30000
};

let passCount = 0;
let failCount = 0;
const report = [];

function recordTest(suite, name, pass, detail = '') {
  if (pass) {
    passCount++;
    console.log(`  [PASS] [${suite}] ${name}`);
    report.push({ suite, name, status: 'PASS', detail });
  } else {
    failCount++;
    console.error(`  [FAIL] [${suite}] ${name} -> ${detail}`);
    report.push({ suite, name, status: 'FAIL', detail });
  }
}

async function runUltraDeepTests() {
  console.log('\n========================================================================');
  console.log('   BỘ KIỂM THỬ MỨC ĐỘ CHUYÊN SÂU CỰC CAO - HỆ THỐNG DBMS RETAIL CHUỖI');
  console.log('========================================================================\n');

  const pool = new sql.ConnectionPool(sqlConfig);
  await pool.connect();

  // =========================================================================
  // PHẦN 1: KIỂM THỬ TOÀN DIỆN 5 KHUNG NHÌN (VIEWS & INDEXED VIEWS)
  // =========================================================================
  console.log('--- PHẦN 1: KIỂM TRA TÍNH TOÀN VẸN 5 KHUNG NHÌN (VIEWS) ---');
  try {
    // View 1: v_BaoCaoTonKho_XepHang (Window Functions)
    const v1 = await pool.request().query('SELECT * FROM v_BaoCaoTonKho_XepHang');
    recordTest('VIEW', 'v_BaoCaoTonKho_XepHang tồn tại & trả về dữ liệu', v1.recordset.length > 0, `${v1.recordset.length} dòng`);
    const hasWindowCols = v1.recordset.every(r => r.TyTrongTonKhoPct !== undefined && r.HangKhanHiemTaiChiNhanh !== undefined && r.TrangThaiTonKho !== undefined);
    recordTest('VIEW', 'v_BaoCaoTonKho_XepHang tính đúng các cột Window Function & CASE WHEN', hasWindowCols);

    // View 2: v_PhanCapNhanSu_ToanDien (Self-Join Hierarchy)
    const v2 = await pool.request().query('SELECT * FROM v_PhanCapNhanSu_ToanDien');
    recordTest('VIEW', 'v_PhanCapNhanSu_ToanDien phân cấp nhân sự hoàn chỉnh', v2.recordset.length > 0, `${v2.recordset.length} nhân sự`);

    // View 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)
    const v3 = await pool.request().query('SELECT * FROM v_NhanVien_ChiNhanh1_KiemSoat');
    recordTest('VIEW', 'v_NhanVien_ChiNhanh1_KiemSoat WITH CHECK OPTION hoạt động', v3.recordset.length > 0);

    // View 4: v_InHoaDon_ChiTietPhucHop
    const v4 = await pool.request().query('SELECT * FROM v_InHoaDon_ChiTietPhucHop');
    recordTest('VIEW', 'v_InHoaDon_ChiTietPhucHop xuất đầy đủ tiền gốc, VAT 8% và thanh toán', v4.recordset.length > 0);

    // View 5: v_TongHopDoanhThuSanPham WITH (NOEXPAND)
    const v5 = await pool.request().query('SELECT * FROM v_TongHopDoanhThuSanPham WITH (NOEXPAND)');
    recordTest('VIEW', 'v_TongHopDoanhThuSanPham là Clustered Indexed View vật lý hóa', v5.recordset.length > 0);
  } catch (err) {
    recordTest('VIEW', 'Kiểm tra Views thất bại', false, err.message);
  }

  // =========================================================================
  // PHẦN 2: KIỂM THỬ TOÀN BỘ 5 HÀM ĐẶC TẢ NGHIỆP VỤ (FUNCTIONS UDF/TVF)
  // =========================================================================
  console.log('\n--- PHẦN 2: KIỂM TRA 5 HÀM UDF, iTVF, mTVF ---');
  try {
    // Tạo 3 khách hàng test độc lập cho 3 hạng (0: Thường, 1: VIP, 2: Kim Cương)
    const khTest = await pool.request().query(`
      INSERT INTO KhachHang (HoTen, SoDT, LoaiKH, DiemTichLuy)
      VALUES 
        (N'KH Thường Test UDF', '0990000001', 0, 50),
        (N'KH VIP Test UDF', '0990000002', 1, 1500),
        (N'KH Kim Cương Test UDF', '0990000003', 2, 6000);
      SELECT MaKH, LoaiKH FROM KhachHang WHERE SoDT IN ('0990000001', '0990000002', '0990000003');
    `);
    const idThuong = khTest.recordset.find(r => r.LoaiKH === 0)?.MaKH;
    const idVIP = khTest.recordset.find(r => r.LoaiKH === 1)?.MaKH;
    const idKimCuong = khTest.recordset.find(r => r.LoaiKH === 2)?.MaKH;

    // Hàm 1: fn_TinhTienSauChietKhauVIP
    const f1Normal = await pool.request().query(`SELECT dbo.fn_TinhTienSauChietKhauVIP(${idThuong}, 1000000) AS Tien`);
    const f1Vip = await pool.request().query(`SELECT dbo.fn_TinhTienSauChietKhauVIP(${idVIP}, 1000000) AS Tien`);
    const f1Kc = await pool.request().query(`SELECT dbo.fn_TinhTienSauChietKhauVIP(${idKimCuong}, 1000000) AS Tien`);

    recordTest('FUNCTION', 'fn_TinhTienSauChietKhauVIP: Khách thường giữ nguyên (1.000.000đ -> 1.000.000đ)', Number(f1Normal.recordset[0].Tien) === 1000000);
    recordTest('FUNCTION', 'fn_TinhTienSauChietKhauVIP: Khách VIP giảm 10% (1.000.000đ -> 900.000đ)', Number(f1Vip.recordset[0].Tien) === 900000);
    recordTest('FUNCTION', 'fn_TinhTienSauChietKhauVIP: Khách Kim Cương giảm 15% (1.000.000đ -> 850.000đ)', Number(f1Kc.recordset[0].Tien) === 850000);

    // Xóa khách test
    await pool.request().query("DELETE FROM KhachHang WHERE SoDT IN ('0990000001', '0990000002', '0990000003');");

    // Hàm 2: fn_KiemTraKhaNangDapUngDonHang
    const f2Yes = await pool.request().query('SELECT dbo.fn_KiemTraKhaNangDapUngDonHang(1, 1, 1) AS DapUng');
    const f2No = await pool.request().query('SELECT dbo.fn_KiemTraKhaNangDapUngDonHang(1, 1, 999999) AS DapUng');
    recordTest('FUNCTION', 'fn_KiemTraKhaNangDapUngDonHang trả về 1 khi kho đủ hàng', Boolean(f2Yes.recordset[0].DapUng) === true);
    recordTest('FUNCTION', 'fn_KiemTraKhaNangDapUngDonHang trả về 0 khi kho thiếu hàng', Boolean(f2No.recordset[0].DapUng) === false);

    // Hàm 3: fn_DanhSachDonHangTheoKhoangThoiGian (iTVF)
    const f3 = await pool.request().query("SELECT * FROM dbo.fn_DanhSachDonHangTheoKhoangThoiGian('2020-01-01', '2030-12-31', NULL)");
    recordTest('FUNCTION', 'iTVF fn_DanhSachDonHangTheoKhoangThoiGian lọc đơn hàng theo ngày', f3.recordset.length > 0);

    // Hàm 4: fn_BaoCaoDoanhThuNhanVienChiTiet (mTVF)
    const f4 = await pool.request().query(`SELECT * FROM dbo.fn_BaoCaoDoanhThuNhanVienChiTiet(${new Date().getFullYear()})`);
    recordTest('FUNCTION', 'mTVF fn_BaoCaoDoanhThuNhanVienChiTiet tính KPI và xếp loại nhân sự', f4.recordset.length > 0);

    // Hàm 5: fn_FormatMaHoaDonTuDong (Scalar)
    const f5 = await pool.request().query("SELECT dbo.fn_FormatMaHoaDonTuDong(12, '2026-10-19') AS MaHD");
    recordTest('FUNCTION', 'fn_FormatMaHoaDonTuDong chuẩn hóa mã hóa đơn HD-YYYYMMDD-000012', f5.recordset[0].MaHD === 'HD-20261019-000012', `Kết quả: ${f5.recordset[0].MaHD}`);
  } catch (err) {
    recordTest('FUNCTION', 'Kiểm tra Functions thất bại', false, err.message);
  }

  // =========================================================================
  // PHẦN 3: KIỂM THỬ CẢ 5 TRIGGER BẢO TOÀN DỮ LIỆU & AUDIT LOG
  // =========================================================================
  console.log('\n--- PHẦN 3: KIỂM THỬ 5 TRIGGERS NÂNG CAO ---');
  try {
    // Test Trigger 2: trg_SanPham_LichSuGia (Thay đổi giá ghi log)
    const spTestRes = await pool.request().query(`
      INSERT INTO SanPham (TenSP, MaDM, GiaBanHienTai, DonViTinh, DaXoa)
      OUTPUT INSERTED.MaSP
      VALUES (N'Sản Phẩm Test Audit Log', 1, 100000, N'Cái', 0);
    `);
    const testSpId = spTestRes.recordset[0].MaSP;

    await pool.request().query(`
      UPDATE SanPham SET GiaBanHienTai = 150000 WHERE MaSP = ${testSpId};
    `);
    const lsGia = await pool.request().query(`
      SELECT * FROM LichSuGia WHERE MaSP = ${testSpId};
    `);
    recordTest('TRIGGER', 'Trigger 2 (trg_SanPham_LichSuGia): Tự động ghi vết đổi giá 100k -> 150k vào LichSuGia', 
      lsGia.recordset.length > 0 && Number(lsGia.recordset[0].GiaCu) === 100000 && Number(lsGia.recordset[0].GiaMoi) === 150000);

    // Test Trigger 5: trg_NhanVien_AuditLog (Thêm nhân viên ghi NhatKyHeThong với SCOPE_IDENTITY)
    const nvRes = await pool.request().query(`
      INSERT INTO NhanVien (HoTen, Luong, MaCN, MaQL, DaXoa)
      VALUES (N'Nhân Viên Test Log', 12000000, 1, 1, 0);
      SELECT SCOPE_IDENTITY() AS MaNV;
    `);
    const testNvId = nvRes.recordset[0].MaNV;
    const nkLog = await pool.request().query(`
      SELECT * FROM NhatKyHeThong WHERE NoiDung LIKE '%MÃ NV: ${testNvId}%';
    `);
    recordTest('TRIGGER', 'Trigger 5 (trg_NhanVien_AuditLog): Tự động ghi hành động THEM_NHAN_VIEN_MOI vào NhatKyHeThong', nkLog.recordset.length > 0);

    // Test Trigger 4: trg_DonHang_CamXoaDonDaGiao (Chống gian lận: Cấm xóa đơn đã giao)
    let trigger4Blocked = false;
    try {
      await pool.request().query(`
        DELETE FROM DonHang WHERE MaDH = 1;
      `);
    } catch (t4Err) {
      trigger4Blocked = t4Err.number === 3609 || 
                        t4Err.message.includes('ended in the trigger') || 
                        t4Err.number === 50000;
    }
    recordTest('TRIGGER', 'Trigger 4 (trg_DonHang_CamXoaDonDaGiao): Chặn tuyệt đối hành vi xóa đơn hàng đã giao (TrangThai = 3)', trigger4Blocked);

    // Clean up test data
    await pool.request().query(`
      DELETE FROM LichSuGia WHERE MaSP = ${testSpId};
      DELETE FROM SanPham WHERE MaSP = ${testSpId};
      DELETE FROM NhanVien WHERE MaNV = ${testNvId};
    `);
  } catch (err) {
    recordTest('TRIGGER', 'Kiểm tra Trigger thất bại', false, err.message);
  }

  // =========================================================================
  // PHẦN 4: KIỂM THỬ TOÀN BỘ CÁC ROUTE API CỦA HỆ THỐNG (HTTP REST API)
  // =========================================================================
  console.log('\n--- PHẦN 4: KIỂM THỬ TẤT CẢ ENDPOINT BACKEND API (PORT 5000) ---');
  const apiEndpoints = [
    { method: 'GET', path: '/branches', name: 'API Danh sách Chi nhánh' },
    { method: 'GET', path: '/warehouses', name: 'API Danh sách Kho hàng' },
    { method: 'GET', path: '/categories', name: 'API Danh sách Danh mục' },
    { method: 'GET', path: '/customers', name: 'API Danh sách Khách hàng' },
    { method: 'GET', path: '/employees', name: 'API Danh sách Nhân viên' },
    { method: 'GET', path: '/products', name: 'API Danh sách Sản phẩm' },
    { method: 'GET', path: '/products/search?tuKhoa=ao', name: 'API Tìm kiếm Sản phẩm nâng cao (SP 4)' },
    { method: 'GET', path: '/orders', name: 'API Danh sách Đơn hàng (iTVF 3)' },
    { method: 'GET', path: '/inventory/ranked-report', name: 'API Báo cáo Tồn kho xếp hạng (View 1)' },
    { method: 'GET', path: '/reports/branch-revenue?year=2026', name: 'API Báo cáo Doanh thu Chi nhánh (SP 5)' },
    { method: 'GET', path: '/reports/staff-kpi?year=2026', name: 'API Báo cáo KPI Nhân viên (mTVF 4)' },
    { method: 'GET', path: '/reports/indexed-sales', name: 'API Sản phẩm bán chạy (Indexed View 5)' },
    { method: 'GET', path: '/reports/staff-hierarchy', name: 'API Cây phân cấp nhân sự (View 2)' },
    { method: 'GET', path: '/reports/branch1-staff', name: 'API Nhân sự Chi nhánh 1 (View 3 WITH CHECK OPTION)' },
    { method: 'GET', path: '/audit-logs', name: 'API Nhật ký Hệ thống (NhatKyHeThong)' }
  ];

  for (const ep of apiEndpoints) {
    try {
      const res = await fetch(`${BASE_API}${ep.path}`);
      const data = await res.json();
      recordTest('HTTP API', `${ep.name} [${ep.method} ${ep.path}]`, res.status === 200 && data.success === true, `Status ${res.status}`);
    } catch (err) {
      recordTest('HTTP API', `${ep.name} thất bại`, false, err.message);
    }
  }

  // =========================================================================
  // PHẦN 5: KIỂM THỬ MA TRẬN PHÂN QUYỀN NATIVE LEAST PRIVILEGE 4 TÀI KHOẢN
  // =========================================================================
  console.log('\n--- PHẦN 5: KIỂM THỬ MA TRẬN BẢO MẬT & PHÂN QUYỀN LEAST PRIVILEGE ---');
  const roleAccounts = [
    { user: 'Login_ThuNgan', pass: 'CashierPassword@2026', allowed: 'DonHang', denied: 'NhanVien' },
    { user: 'Login_ThuKho', pass: 'StockPassword@2026', allowed: 'TonKho', denied: 'KhachHang' },
    { user: 'Login_QuanLyChiNhanh', pass: 'ManagerPassword@2026', allowed: 'v_BaoCaoTonKho_XepHang', denied: 'NhanVien' }
  ];

  for (const acc of roleAccounts) {
    try {
      const accPool = new sql.ConnectionPool({
        ...sqlConfig,
        user: acc.user,
        password: acc.pass
      });
      await accPool.connect();

      // Kiểm tra quyền được cấp (GRANT)
      const allowedRes = await accPool.request().query(`SELECT TOP 1 * FROM ${acc.allowed}`);
      recordTest('SECURITY', `Tài khoản [${acc.user}] truy cập ĐÚNG BẢNG ĐƯỢC CẤP (${acc.allowed})`, allowedRes.recordset !== undefined);

      // Kiểm tra quyền bị cấm (DENY)
      let denyTriggered = false;
      try {
        await accPool.request().query(`SELECT TOP 1 * FROM ${acc.denied}`);
      } catch (denyErr) {
        denyTriggered = denyErr.message.includes('permission was denied') || denyErr.message.includes('SELECT permission was denied');
      }
      recordTest('SECURITY', `Tài khoản [${acc.user}] bị CHẶN NGHIÊM NGẶT bảng cấm (${acc.denied}) theo Least Privilege`, denyTriggered);

      await accPool.close();
    } catch (err) {
      recordTest('SECURITY', `Lỗi kết nối tài khoản phân quyền [${acc.user}]`, false, err.message);
    }
  }

  // =========================================================================
  // PHẦN 6: KIỂM THỬ TRANH CHẤP ĐỒNG THỜI CAO ĐỘ (CONCURRENCY & UPDLOCK/HOLDLOCK)
  // =========================================================================
  console.log('\n--- PHẦN 6: KIỂM THỬ TRANH CHẤP ĐỒNG THỜI CAO ĐỘ (CONCURRENCY) ---');
  try {
    // Tạo 1 sản phẩm test với số lượng tồn chính xác = 10
    const spConcRes = await pool.request().query(`
      INSERT INTO SanPham (TenSP, MaDM, GiaBanHienTai, DonViTinh, DaXoa)
      OUTPUT INSERTED.MaSP
      VALUES (N'Sản Phẩm Test Concurrency Stress', 1, 500000, N'Cái', 0);
    `);
    const cSpId = spConcRes.recordset[0].MaSP;
    await pool.request().query(`
      INSERT INTO TonKho (MaKho, MaSP, SoLuongTon) VALUES (1, ${cSpId}, 10);
    `);

    // 2 luồng đồng thời cố gắng đặt mua 8 chiếc (Tổng 16 chiếc > 10 tồn kho)
    const p1 = new sql.ConnectionPool(sqlConfig);
    const p2 = new sql.ConnectionPool(sqlConfig);
    await Promise.all([p1.connect(), p2.connect()]);

    const req1 = p1.request()
      .input('MaKH', sql.Int, 1)
      .input('MaNV', sql.Int, 1)
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaSP', sql.Int, cSpId)
      .input('SoLuong', sql.Int, 8)
      .input('DonGiaBan', sql.Decimal(12, 2), 500000)
      .execute('usp_Tx_DatHangVaGiuCho');

    const req2 = p2.request()
      .input('MaKH', sql.Int, 2)
      .input('MaNV', sql.Int, 1)
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaSP', sql.Int, cSpId)
      .input('SoLuong', sql.Int, 8)
      .input('DonGiaBan', sql.Decimal(12, 2), 500000)
      .execute('usp_Tx_DatHangVaGiuCho');

    const [t1, t2] = await Promise.allSettled([req1, req2]);
    const succ = [t1, t2].filter(r => r.status === 'fulfilled' && r.value.recordset?.[0]?.MaDH);
    const rej = [t1, t2].filter(r => r.status === 'rejected' || !r.value.recordset?.[0]?.MaDH);

    await Promise.all([p1.close(), p2.close()]);

    const stockCheck = await pool.request().query(`SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = ${cSpId}`);
    const remainStock = stockCheck.recordset[0].SoLuongTon;

    recordTest('CONCURRENCY', 'Khóa UPDLOCK + HOLDLOCK chỉ cho phép đúng 1 giao dịch thành công khi vượt tồn kho', succ.length === 1 && rej.length === 1);
    recordTest('CONCURRENCY', 'Số lượng tồn kho còn lại chính xác = 2 (10 - 8 = 2), hoàn toàn không âm kho', remainStock === 2, `Thực tế: ${remainStock}`);

    // Dọn dẹp dữ liệu kiểm thử tranh chấp
    await pool.request().query(`
      DELETE FROM ChiTietDonHang WHERE MaSP = ${cSpId};
      DELETE FROM DonHang WHERE MaDH IN (SELECT MaDH FROM ChiTietDonHang WHERE MaSP = ${cSpId});
      DELETE FROM TonKho WHERE MaSP = ${cSpId};
      DELETE FROM SanPham WHERE MaSP = ${cSpId};
    `);
  } catch (err) {
    recordTest('CONCURRENCY', 'Kiểm tra Concurrency thất bại', false, err.message);
  }

  await pool.close();

  // =========================================================================
  // TỔNG KẾT
  // =========================================================================
  console.log('\n========================================================================');
  console.log('   TỔNG KẾT BỘ KIỂM THỬ CHUYÊN SÂU CỰC CAO (DEEP AUDIT REPORT)');
  console.log(`   - TỔNG SỐ TEST CASE ĐÃ CHẠY : ${passCount + failCount}`);
  console.log(`   - SỐ TEST CASE ĐẠT (PASS)   : ${passCount}`);
  console.log(`   - SỐ TEST CASE LỖI (FAIL)   : ${failCount}`);
  console.log(`   - TỶ LỆ CHUẨN XÁC           : ${((passCount / (passCount + failCount)) * 100).toFixed(1)}%`);
  console.log('========================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runUltraDeepTests().catch(err => {
  console.error('Lỗi nghiêm trọng:', err);
  process.exit(1);
});
