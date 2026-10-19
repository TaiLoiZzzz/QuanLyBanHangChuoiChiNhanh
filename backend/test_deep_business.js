/**
 * =========================================================================
 * BỘ KIỂM THỬ TỰ ĐỘNG CHUYÊN SÂU MỨC NGHIỆP VỤ (DEEP BUSINESS INTEGRATION TEST)
 * HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - GV: TS. PHAN THỊ THỂ
 * ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
 * =========================================================================
 */

const sql = require('mssql');
require('dotenv').config();

const baseConfig = {
  server: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 11433,
  database: process.env.DB_NAME || 'QuanLyBanHangDB',
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'PasswordAdmin@2026',
  options: { encrypt: false, trustServerCertificate: true },
  requestTimeout: 30000
};

let passedCount = 0;
let failedCount = 0;
const results = [];

function assert(condition, testName, details = '') {
  if (condition) {
    passedCount++;
    console.log(`  [PASS] ${testName}`);
    results.push({ testName, status: 'PASS', details });
  } else {
    failedCount++;
    console.error(`  [FAIL] ${testName} - ${details}`);
    results.push({ testName, status: 'FAIL', details });
  }
}

async function runDeepBusinessTests() {
  console.log('================================================================');
  console.log('BAT DAU KIEM THU CHUYEN SAU TOAN DIEN CAC MUC NGHIEP VU CSDL');
  console.log('KHOA CNTT - HCMUTE | GVHD: TS. PHAN THI THE');
  console.log('================================================================\n');

  const mainPool = new sql.ConnectionPool(baseConfig);
  await mainPool.connect();

  // -------------------------------------------------------------------------
  // SUITE 1: BÁN HÀNG (POS), UDF CHIẾT KHẤU, TỒN KHO & ĐỒNG BỘ TRIGGER
  // -------------------------------------------------------------------------
  console.log('--- SUITE 1: QUY TRINH BAN HANG, UDF & TRIGGER DONG BO ---');
  try {
    // 1.1 Test UDF TinhTienSauChietKhauVIP (VIP giam 10%, Diamond giam 15%)
    // Tao 3 khach hang test rieng biet de dam bao moi hang thanh vien deu duoc kiem tra doc lap
    const khTestRes = await mainPool.request().query(`
      INSERT INTO KhachHang (HoTen, SoDT, LoaiKH, DiemTichLuy)
      VALUES 
        (N'Test Khách Thường', '0981111111', 0, 0),
        (N'Test Khách VIP', '0982222222', 1, 1000),
        (N'Test Khách Kim Cương', '0983333333', 2, 5000);
      SELECT SCOPE_IDENTITY() AS LastId;
    `);

    const idsRes = await mainPool.request().query(`
      SELECT MaKH, LoaiKH FROM KhachHang WHERE SoDT IN ('0981111111', '0982222222', '0983333333') ORDER BY LoaiKH ASC
    `);
    const idThuong = idsRes.recordset.find(k => k.LoaiKH === 0).MaKH;
    const idVip = idsRes.recordset.find(k => k.LoaiKH === 1).MaKH;
    const idDiamond = idsRes.recordset.find(k => k.LoaiKH === 2).MaKH;

    const udfRes = await mainPool.request().query(`
      SELECT 
        dbo.fn_TinhTienSauChietKhauVIP(${idVip}, 1000000) AS Tien_Vip,
        dbo.fn_TinhTienSauChietKhauVIP(${idDiamond}, 1000000) AS Tien_Diamond,
        dbo.fn_TinhTienSauChietKhauVIP(${idThuong}, 1000000) AS Tien_Thuong
    `);
    const rUdf = udfRes.recordset[0];
    assert(rUdf.Tien_Vip === 900000, 'UDF fn_TinhTienSauChietKhauVIP giam 10% cho VIP (1M -> 900k)', `Actual: ${rUdf.Tien_Vip}`);
    assert(rUdf.Tien_Diamond === 850000, 'UDF fn_TinhTienSauChietKhauVIP giam 15% cho Kim Cuong (1M -> 850k)', `Actual: ${rUdf.Tien_Diamond}`);
    assert(rUdf.Tien_Thuong === 1000000, 'UDF fn_TinhTienSauChietKhauVIP giu nguyen cho khach Thuong (1M -> 1M)', `Actual: ${rUdf.Tien_Thuong}`);

    // Don dep 3 khach hang test
    await mainPool.request().query(`DELETE FROM KhachHang WHERE SoDT IN ('0981111111', '0982222222', '0983333333')`);

    // 1.2 Test UDF fn_KiemTraKhaNangDapUngDonHang
    const tonKhoCheck = await mainPool.request().query(`
      SELECT 
        dbo.fn_KiemTraKhaNangDapUngDonHang(1, 1, 5) AS DuHang,
        dbo.fn_KiemTraKhaNangDapUngDonHang(1, 1, 999999) AS KhongDuHang
    `);
    assert(tonKhoCheck.recordset[0].DuHang === true, 'UDF fn_KiemTraKhaNangDapUngDonHang tra ve 1 (Du hang) khi so luong nho');
    assert(tonKhoCheck.recordset[0].KhongDuHang === false, 'UDF fn_KiemTraKhaNangDapUngDonHang tra ve 0 (Khong du hang) khi vuot ton kho');

    // 1.3 Test Tao Don Hang hop le qua Stored Procedure sp_TaoDonHangVaChiTiet
    const stockBeforeRes = await mainPool.request().query(`
      SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = 1
    `);
    const stockBefore = stockBeforeRes.recordset[0].SoLuongTon;

    const orderRes = await mainPool.request()
      .input('MaKH', sql.Int, 1)
      .input('MaNV', sql.Int, 1)
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaSP', sql.Int, 1)
      .input('SoLuong', sql.Int, 2)
      .input('DonGiaBan', sql.Decimal(12, 2), 25000000)
      .execute('sp_TaoDonHangVaChiTiet');

    const newMaDH = orderRes.recordset[0]?.MaDH;
    assert(newMaDH > 0, `Tao don hang thanh cong qua Stored Procedure (MaDH: ${newMaDH})`);

    // Kiem tra trigger da tu dong tru ton kho chua
    const stockAfterRes = await mainPool.request().query(`
      SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = 1
    `);
    const stockAfter = stockAfterRes.recordset[0].SoLuongTon;
    assert(stockAfter === stockBefore - 2, `Trigger trg_ChiTietDonHang_SyncKho_TongTien tu dong tru kho chinh xac: ${stockBefore} -> ${stockAfter}`);

    // Kiem tra TongTien tren bang DonHang da duoc dong bo chua
    const orderCheck = await mainPool.request().query(`
      SELECT TongTien, TrangThai FROM DonHang WHERE MaDH = ${newMaDH}
    `);
    const tongTien = orderCheck.recordset[0].TongTien;
    assert(tongTien === 50000000, `TongTien don hang duoc dong bo chinh xac (50,000,000 d)`, `Actual: ${tongTien}`);

    // 1.4 Test rang buoc am va ban khong (Overselling)
    let negativeQtyError = false;
    try {
      await mainPool.request()
        .input('MaKH', sql.Int, 1)
        .input('MaNV', sql.Int, 1)
        .input('MaKhoXuat', sql.Int, 1)
        .input('MaSP', sql.Int, 1)
        .input('SoLuong', sql.Int, -5)
        .input('DonGiaBan', sql.Decimal(12, 2), 25000000)
        .execute('sp_TaoDonHangVaChiTiet');
    } catch (e) {
      negativeQtyError = true;
    }
    assert(negativeQtyError, 'Chan tao don hang khi SoLuong <= 0 (Bao ve toan ven nghiep vu)');

    let oversellError = false;
    try {
      await mainPool.request()
        .input('MaKH', sql.Int, 1)
        .input('MaNV', sql.Int, 1)
        .input('MaKhoXuat', sql.Int, 1)
        .input('MaSP', sql.Int, 1)
        .input('SoLuong', sql.Int, 999999)
        .input('DonGiaBan', sql.Decimal(12, 2), 25000000)
        .execute('sp_TaoDonHangVaChiTiet');
    } catch (e) {
      oversellError = true;
    }
    assert(oversellError, 'Chan tao don hang vuot qua ton kho hien tai (Chong ban khong)');

    // 1.5 Test View in hoa don
    const invoiceRes = await mainPool.request().query(`
      SELECT * FROM v_InHoaDon_ChiTietPhucHop WHERE MaDH = ${newMaDH}
    `);
    assert(invoiceRes.recordset.length === 1 && invoiceRes.recordset[0].SoLuong === 2, 'View v_InHoaDon_ChiTietPhucHop hien thi day du chi tiet hoa don');

    // 1.6 Test Trigger cap nhat diem tich luy khi trang thai don chuyen sang 3 (Giao thanh cong)
    const pointsBeforeRes = await mainPool.request().query('SELECT DiemTichLuy FROM KhachHang WHERE MaKH = 1');
    const pointsBefore = pointsBeforeRes.recordset[0].DiemTichLuy;

    await mainPool.request()
      .input('MaDH', sql.Int, newMaDH)
      .input('TrangThaiMoi', sql.TinyInt, 3)
      .execute('sp_CapNhatTrangThaiDonHang');

    const pointsAfterRes = await mainPool.request().query('SELECT DiemTichLuy FROM KhachHang WHERE MaKH = 1');
    const pointsAfter = pointsAfterRes.recordset[0].DiemTichLuy;
    const expectedPointsAdded = Math.floor(50000000 / 100000); // 100k = 1 diem -> 500 diem
    assert(pointsAfter === pointsBefore + expectedPointsAdded, `Trigger trg_DonHang_CapNhatDiemTichLuyKhachHang tu dong cong ${expectedPointsAdded} diem khi don chuyen sang TrangThai = 3`);

    // 1.7 Test Trigger chan xoa don da giao (TrangThai = 3)
    let deleteDeliveredBlocked = false;
    try {
      await mainPool.request().query(`DELETE FROM DonHang WHERE MaDH = ${newMaDH}`);
    } catch (e) {
      deleteDeliveredBlocked = true;
    }
    assert(deleteDeliveredBlocked, 'Trigger trg_DonHang_CamXoaDonDaGiao chan tuyet doi xoa don hang da giao thanh cong');

  } catch (err) {
    console.error('Loi Suite 1:', err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // SUITE 2: ĐIỀU CHUYỂN KHO HÀNG HÓA & PHÒNG CHỐNG DEADLOCK
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 2: DIEU CHUYEN KHO & PHONG CHONG DEADLOCK ---');
  try {
    const tonKho1Truoc = (await mainPool.request().query('SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = 2')).recordset[0].SoLuongTon;
    const tonKho2Truoc = (await mainPool.request().query('SELECT SoLuongTon FROM TonKho WHERE MaKho = 2 AND MaSP = 2')).recordset[0].SoLuongTon;

    await mainPool.request()
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaKhoNhap', sql.Int, 2)
      .input('MaSP', sql.Int, 2)
      .input('SoLuong', sql.Int, 3)
      .execute('usp_Tx_ChuyenKhoHangHoaLienChiNhanh');

    const tonKho1Sau = (await mainPool.request().query('SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = 2')).recordset[0].SoLuongTon;
    const tonKho2Sau = (await mainPool.request().query('SELECT SoLuongTon FROM TonKho WHERE MaKho = 2 AND MaSP = 2')).recordset[0].SoLuongTon;

    assert(tonKho1Sau === tonKho1Truoc - 3, `Kho nguon giam chinh xac 3 don vi: ${tonKho1Truoc} -> ${tonKho1Sau}`);
    assert(tonKho2Sau === tonKho2Truoc + 3, `Kho dich tang chinh xac 3 don vi: ${tonKho2Truoc} -> ${tonKho2Sau}`);

    // Rang buoc trung kho
    let sameWarehouseError = false;
    try {
      await mainPool.request()
        .input('MaKhoXuat', sql.Int, 1)
        .input('MaKhoNhap', sql.Int, 1)
        .input('MaSP', sql.Int, 2)
        .input('SoLuong', sql.Int, 1)
        .execute('usp_Tx_ChuyenKhoHangHoaLienChiNhanh');
    } catch (e) {
      sameWarehouseError = true;
    }
    assert(sameWarehouseError, 'Chan dieu chuyen khi Kho Xuat va Kho Nhap trung nhau (MaKhoXuat = MaKhoNhap)');

    // Rang buoc so luong <= 0
    let negativeTransferError = false;
    try {
      await mainPool.request()
        .input('MaKhoXuat', sql.Int, 1)
        .input('MaKhoNhap', sql.Int, 2)
        .input('MaSP', sql.Int, 2)
        .input('SoLuong', sql.Int, -10)
        .execute('usp_Tx_ChuyenKhoHangHoaLienChiNhanh');
    } catch (e) {
      negativeTransferError = true;
    }
    assert(negativeTransferError, 'Chan dieu chuyen khi so luong <= 0');

  } catch (err) {
    console.error('Loi Suite 2:', err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // SUITE 3: HỦY ĐƠN HÀNG & HOÀN TỒN KHO AN TOÀN
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 3: HUY DON HANG & HOAN TON KHO AN TOAN ---');
  try {
    // Tao 1 don hang moi o trang thai 0 (Moi tao)
    const tempOrder = await mainPool.request()
      .input('MaKH', sql.Int, 2)
      .input('MaNV', sql.Int, 2)
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaSP', sql.Int, 3)
      .input('SoLuong', sql.Int, 4)
      .input('DonGiaBan', sql.Decimal(12, 2), 22000000)
      .execute('sp_TaoDonHangVaChiTiet');
    
    const cancelOrderId = tempOrder.recordset[0].MaDH;
    const stockBeforeCancel = (await mainPool.request().query('SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = 3')).recordset[0].SoLuongTon;

    // Goi Transaction huy don va hoan ton kho
    await mainPool.request()
      .input('MaDH', sql.Int, cancelOrderId)
      .input('LyDoHuy', sql.NVarChar(255), 'Kiem thu hoan ton kho')
      .execute('usp_Tx_HuyDonHangVaHoanTonKho');

    const stockAfterCancel = (await mainPool.request().query('SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = 3')).recordset[0].SoLuongTon;
    const orderStatusAfter = (await mainPool.request().query(`SELECT TrangThai FROM DonHang WHERE MaDH = ${cancelOrderId}`)).recordset[0].TrangThai;

    assert(orderStatusAfter === 4, `Trang thai don hang chuyen sang 4 (DaHuy)`);
    assert(stockAfterCancel === stockBeforeCancel + 4, `Ton kho duoc hoan tra chinh xac 4 don vi: ${stockBeforeCancel} -> ${stockAfterCancel}`);

    // Thu huy lai don da huy -> Phai bi chan (Chong hoan kho trung lap)
    let doubleCancelError = false;
    try {
      await mainPool.request()
        .input('MaDH', sql.Int, cancelOrderId)
        .input('LyDoHuy', sql.NVarChar(255), 'Huy lan nua')
        .execute('usp_Tx_HuyDonHangVaHoanTonKho');
    } catch (e) {
      doubleCancelError = true;
    }
    assert(doubleCancelError, 'Chan huy tiep don hang da o trang thai 4 (Chong hoan kho 2 lan)');

  } catch (err) {
    console.error('Loi Suite 3:', err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // SUITE 4: THĂNG HẠNG THÀNH VIÊN HÀNG LOẠT (SET-BASED TRANSACTION)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 4: THANG HANG THANH VIEN HANG LOAT ---');
  try {
    // Tao 1 khach hang thuong co 1500 diem
    const insKh = await mainPool.request().query(`
      INSERT INTO KhachHang (HoTen, SoDT, LoaiKH, DiemTichLuy)
      VALUES (N'Khách Test Thăng Hạng', '0999888777', 0, 1500);
      SELECT SCOPE_IDENTITY() AS NewMaKH;
    `);
    const testMaKH = insKh.recordset[0].NewMaKH;

    // Chay thu tuc thang hang hang loat cho khach >= 1000 diem
    await mainPool.request()
      .input('DiemToiThieu', sql.Int, 1000)
      .input('DiemThuongBonus', sql.Int, 200)
      .execute('usp_Tx_ThangHangThanhVienHangLoat');

    const promotedKh = (await mainPool.request().query(`SELECT LoaiKH, DiemTichLuy FROM KhachHang WHERE MaKH = ${testMaKH}`)).recordset[0];
    assert(promotedKh.LoaiKH === 2, `Khach hang duoc tu dong thang hang len Kim Cuong (LoaiKH = 2)`);
    assert(promotedKh.DiemTichLuy === 1700, `Diem tich luy duoc cong them diem thuong bonus: 1500 + 200 = 1700`);

    // Don sach du lieu test
    await mainPool.request().query(`DELETE FROM KhachHang WHERE MaKH = ${testMaKH}`);

  } catch (err) {
    console.error('Loi Suite 4:', err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // SUITE 5: PHÂN QUYỀN TRUY CẬP LEAST PRIVILEGE (4 TÀI KHOẢN CSDL)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 5: PHAN QUYEN LEAST PRIVILEGE 4 TAI KHOAN SQL SERVER ---');
  try {
    // 5.1 Test Thu Ngan (Login_ThuNgan)
    const cashierPool = new sql.ConnectionPool({
      ...baseConfig,
      user: 'Login_ThuNgan',
      password: 'CashierPassword@2026'
    });
    await cashierPool.connect();

    // Thu Ngan xem san pham -> Duoc phep
    const cashierProducts = await cashierPool.request().query('SELECT TOP 1 MaSP, TenSP FROM SanPham');
    assert(cashierProducts.recordset.length > 0, 'Login_ThuNgan doc duoc danh muc SanPham');

    // Thu Ngan xem bang luong NhanVien -> PHAI BI CHAN (403 / 229)
    let cashierDeniedSalary = false;
    try {
      await cashierPool.request().query('SELECT TOP 1 LuongCoBan FROM NhanVien');
    } catch (e) {
      cashierDeniedSalary = true;
    }
    assert(cashierDeniedSalary, 'Login_ThuNgan bi CHAN TUYET DOI khi xem thong tin luong NhanVien (Least Privilege)');

    // Thu Ngan xoa DonHang -> PHAI BI CHAN (DENY DELETE ON DonHang)
    let cashierDeniedDelete = false;
    try {
      await cashierPool.request().query('DELETE FROM DonHang WHERE MaDH = 999999');
    } catch (e) {
      cashierDeniedDelete = true;
    }
    assert(cashierDeniedDelete, 'Login_ThuNgan bi CHAN TUYET DOI khi xoa DonHang');
    await cashierPool.close();

    // 5.2 Test Thu Kho (Login_ThuKho)
    const stockPool = new sql.ConnectionPool({
      ...baseConfig,
      user: 'Login_ThuKho',
      password: 'StockPassword@2026'
    });
    await stockPool.connect();

    // Thu Kho xem TonKho -> Duoc phep
    const stockView = await stockPool.request().query('SELECT TOP 1 MaSP, SoLuongTon FROM TonKho');
    assert(stockView.recordset.length > 0, 'Login_ThuKho duoc phep xem so luong TonKho');

    // Thu Kho xem KhachHang -> PHAI BI CHAN
    let stockDeniedCustomer = false;
    try {
      await stockPool.request().query('SELECT TOP 1 HoTen, SoDT FROM KhachHang');
    } catch (e) {
      stockDeniedCustomer = true;
    }
    assert(stockDeniedCustomer, 'Login_ThuKho bi CHAN TUYET DOI khi xem danh sach KhachHang');
    await stockPool.close();

  } catch (err) {
    console.error('Loi Suite 5:', err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // SUITE 6: KIỂM THỬ TRANH CHẤP ĐỒNG THỜI (RACE CONDITION & CONCURRENCY)
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 6: TRANH CHAP DONG THOI (CONCURRENCY & OVERSELLING) ---');
  try {
    // Tao 1 san pham test voi so luong ton = 10 trong Kho 1
    const testSpRes = await mainPool.request().query(`
      INSERT INTO SanPham (TenSP, MaDM, GiaBanHienTai, DonViTinh)
      VALUES (N'Sản Phẩm Test Concurrency', 1, 10000000, N'Cái');
      DECLARE @SpId INT = SCOPE_IDENTITY();
      INSERT INTO TonKho (MaKho, MaSP, SoLuongTon) VALUES (1, @SpId, 10);
      SELECT @SpId AS TestSpId;
    `);
    const testSpId = testSpRes.recordset[0].TestSpId;

    // Mo phong 2 luong khach hang DONG THOI dat mua: Moi luong muon mua 8 chiec (Tong = 16 chiec > 10 ton kho)
    // Nho khoa bi quan UPDLOCK + HOLDLOCK va Trigger kiem soat, chi duy nhat 1 luong duoc phep mua
    const poolWorker1 = new sql.ConnectionPool(baseConfig);
    const poolWorker2 = new sql.ConnectionPool(baseConfig);
    await Promise.all([poolWorker1.connect(), poolWorker2.connect()]);

    const thread1 = poolWorker1.request()
      .input('MaKH', sql.Int, 1)
      .input('MaNV', sql.Int, 1)
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaSP', sql.Int, testSpId)
      .input('SoLuong', sql.Int, 8)
      .input('DonGiaBan', sql.Decimal(12, 2), 10000000)
      .execute('sp_TaoDonHangVaChiTiet');

    const thread2 = poolWorker2.request()
      .input('MaKH', sql.Int, 2)
      .input('MaNV', sql.Int, 2)
      .input('MaKhoXuat', sql.Int, 1)
      .input('MaSP', sql.Int, testSpId)
      .input('SoLuong', sql.Int, 8)
      .input('DonGiaBan', sql.Decimal(12, 2), 10000000)
      .execute('sp_TaoDonHangVaChiTiet');

    const [res1, res2] = await Promise.allSettled([thread1, thread2]);
    const successThreads = [res1, res2].filter(r => r.status === 'fulfilled');
    const rejectedThreads = [res1, res2].filter(r => r.status === 'rejected');

    await Promise.all([poolWorker1.close(), poolWorker2.close()]);

    const finalStock = (await mainPool.request().query(`SELECT SoLuongTon FROM TonKho WHERE MaKho = 1 AND MaSP = ${testSpId}`)).recordset[0].SoLuongTon;

    assert(successThreads.length === 1 && rejectedThreads.length === 1, `Tranh chap dong thoi: 1 luong thanh cong va 1 luong bi tu choi do het hang (Acid Isolation)`);
    assert(finalStock === 2, `Ton kho con lai chinh xac la 2 (10 - 8 = 2), tuyet doi khong bi am kho (Actual: ${finalStock})`);

    // Clean up test product
    await mainPool.request().query(`
      DELETE FROM ChiTietDonHang WHERE MaSP = ${testSpId};
      DELETE FROM DonHang WHERE MaDH IN (SELECT MaDH FROM ChiTietDonHang WHERE MaSP = ${testSpId});
      DELETE FROM TonKho WHERE MaSP = ${testSpId};
      DELETE FROM LichSuGia WHERE MaSP = ${testSpId};
      DELETE FROM SanPham WHERE MaSP = ${testSpId};
    `);

  } catch (err) {
    console.error('Loi Suite 6:', err);
    failedCount++;
  }

  // -------------------------------------------------------------------------
  // SUITE 7: KIỂM TRA TÍNH TOÀN VẸN CỦA 5 VIEWS NGHIỆP VỤ & INDEXED VIEWS
  // -------------------------------------------------------------------------
  console.log('\n--- SUITE 7: KIEM TRA 5 VIEWS NGHIEP VU & INDEXED VIEWS ---');
  try {
    const v1 = await mainPool.request().query('SELECT COUNT(*) AS c FROM v_BaoCaoTonKho_XepHang');
    assert(v1.recordset[0].c > 0, `View 1: v_BaoCaoTonKho_XepHang tra ve ${v1.recordset[0].c} dong du lieu xep hang ton kho`);

    const v2 = await mainPool.request().query('SELECT COUNT(*) AS c FROM v_TongHopDoanhThuSanPham WITH (NOEXPAND)');
    assert(v2.recordset[0].c > 0, `View 2: v_TongHopDoanhThuSanPham (Indexed View voi NOEXPAND) tra ve ${v2.recordset[0].c} dong`);

    const v3 = await mainPool.request().query('SELECT COUNT(*) AS c FROM v_InHoaDon_ChiTietPhucHop');
    assert(v3.recordset[0].c > 0, `View 3: v_InHoaDon_ChiTietPhucHop hoat dong on dinh (${v3.recordset[0].c} chi tiet)`);

    const v4 = await mainPool.request().query('SELECT COUNT(*) AS c FROM v_PhanCapNhanSu_ToanDien');
    assert(v4.recordset[0].c > 0, `View 4: v_PhanCapNhanSu_ToanDien (Recursive CTE) phan cap dung cay nhan su (${v4.recordset[0].c} nhan vien)`);

    const v5 = await mainPool.request().query('SELECT COUNT(*) AS c FROM v_NhanVien_ChiNhanh1_KiemSoat');
    assert(v5.recordset[0].c > 0, `View 5: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION) tra ve ${v5.recordset[0].c} nhan vien CN 1`);
  } catch (err) {
    console.error('Loi Suite 7:', err);
    failedCount++;
  }

  await mainPool.close();

  // -------------------------------------------------------------------------
  // TỔNG KẾT KẾT QUẢ KIỂM THỬ
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`TONG KET KET QUA KIEM THU CHUYEN SAU:`);
  console.log(`- TONG SO TEST CASE : ${passedCount + failedCount}`);
  console.log(`- SO TEST PASS      : ${passedCount}`);
  console.log(`- SO TEST FAIL      : ${failedCount}`);
  console.log(`- TY LE DAT         : ${((passedCount / (passedCount + failedCount)) * 100).toFixed(1)}%`);
  console.log('================================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runDeepBusinessTests().catch(err => {
  console.error('Loi nghiem trong khi chay kiem thu:', err);
  process.exit(1);
});
