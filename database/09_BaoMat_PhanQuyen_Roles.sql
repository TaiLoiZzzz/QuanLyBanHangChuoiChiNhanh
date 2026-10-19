-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 9: BẢO MẬT & PHÂN QUYỀN NATIVE (4 LOGINS, 4 ROLES, GRANT/REVOKE/DENY)
-- NGƯỜI PHỤ TRÁCH: QUÁCH TÀI LỢI (70%) - HỖ TRỢ: PHAN THIỆN KHỞI (7.5%)
-- =========================================================================

USE master;
GO

-- 1. TẠO 4 SERVER LOGINS NATIVE TRONG SQL SERVER
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_Admin')
    CREATE LOGIN Login_Admin WITH PASSWORD = 'AdminPassword@2026', CHECK_POLICY = OFF;

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_QuanLyChiNhanh')
    CREATE LOGIN Login_QuanLyChiNhanh WITH PASSWORD = 'ManagerPassword@2026', CHECK_POLICY = OFF;

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_ThuNgan')
    CREATE LOGIN Login_ThuNgan WITH PASSWORD = 'CashierPassword@2026', CHECK_POLICY = OFF;

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_ThuKho')
    CREATE LOGIN Login_ThuKho WITH PASSWORD = 'StockPassword@2026', CHECK_POLICY = OFF;
GO

USE QuanLyBanHangDB;
GO

-- 2. TẠO 4 DATABASE USERS ÁNH XẠ TỪ CÁC LOGIN
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'User_Admin')
    CREATE USER User_Admin FOR LOGIN Login_Admin;

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'User_QuanLyChiNhanh')
    CREATE USER User_QuanLyChiNhanh FOR LOGIN Login_QuanLyChiNhanh;

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'User_ThuNgan')
    CREATE USER User_ThuNgan FOR LOGIN Login_ThuNgan;

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'User_ThuKho')
    CREATE USER User_ThuKho FOR LOGIN Login_ThuKho;
GO

-- 3. TẠO 4 DATABASE ROLES RIÊNG BIỆT (CHÍNH SÁCH LEAST PRIVILEGE)
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'Role_Admin' AND type = 'R')
    CREATE ROLE Role_Admin;

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'Role_QuanLyChiNhanh' AND type = 'R')
    CREATE ROLE Role_QuanLyChiNhanh;

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'Role_ThuNgan' AND type = 'R')
    CREATE ROLE Role_ThuNgan;

IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'Role_ThuKho' AND type = 'R')
    CREATE ROLE Role_ThuKho;
GO

-- GÁN USERS VÀO ROLES TƯƠNG ỨNG
ALTER ROLE Role_Admin ADD MEMBER User_Admin;
ALTER ROLE Role_QuanLyChiNhanh ADD MEMBER User_QuanLyChiNhanh;
ALTER ROLE Role_ThuNgan ADD MEMBER User_ThuNgan;
ALTER ROLE Role_ThuKho ADD MEMBER User_ThuKho;
GO

-- =========================================================================
-- 4. THIẾT LẬP QUYỀN HẠN CHI TIẾT (GRANT / REVOKE / DENY)
-- =========================================================================

-- ROLE 1: ADMIN (QUẢN TRỊ VIÊN CAO CẤP) -> TOÀN QUYỀN
GRANT CONTROL ON DATABASE::QuanLyBanHangDB TO Role_Admin;
GO

-- ROLE 2: QUẢN LÝ CHI NHÁNH
-- Được xem tất cả Views báo cáo, thủ tục chuyển kho, tìm kiếm
GRANT SELECT ON v_BaoCaoTonKho_XepHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_TongHopDoanhThuSanPham TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_PhanCapNhanSu_ToanDien TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_NhanVien_ChiNhanh1_KiemSoat TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_BaoCaoTongHopDoanhThuChiNhanh TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_ChuyenKhoNoiBo TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_TimKiemSanPhamNangCao TO Role_QuanLyChiNhanh;
-- DENY xem trực tiếp bảng lương nhạy cảm (bắt buộc xem qua View)
DENY SELECT ON NhanVien TO Role_QuanLyChiNhanh;
GO

-- ROLE 3: THU NGÂN (CASHIER)
-- Chỉ được tạo đơn, in hóa đơn, tìm khách và tra sản phẩm
GRANT EXECUTE ON dbo.sp_TaoDonHangVaChiTiet TO Role_ThuNgan;
GRANT EXECUTE ON dbo.sp_CapNhatTrangThaiDonHang TO Role_ThuNgan;
GRANT SELECT ON v_InHoaDon_ChiTietPhucHop TO Role_ThuNgan;
GRANT SELECT, INSERT, UPDATE ON KhachHang TO Role_ThuNgan;
GRANT SELECT ON SanPham TO Role_ThuNgan;
GRANT SELECT ON DanhMuc TO Role_ThuNgan;
-- BẢO MẬT: CẤM TUYỆT ĐỐI XEM LƯƠNG HOẶC XÓA BẤT KỲ DỮ LIỆU NÀO
DENY SELECT ON NhanVien TO Role_ThuNgan;
DENY DELETE ON DonHang TO Role_ThuNgan;
DENY DELETE ON ChiTietDonHang TO Role_ThuNgan;
DENY SELECT ON LichSuGia TO Role_ThuNgan;
GO

-- ROLE 4: THỦ KHO (STOCKKEEPER)
-- Chỉ được kiểm tra tồn kho, chuyển kho
GRANT SELECT ON v_BaoCaoTonKho_XepHang TO Role_ThuKho;
GRANT SELECT ON TonKho TO Role_ThuKho;
GRANT SELECT ON KhoHang TO Role_ThuKho;
GRANT EXECUTE ON dbo.sp_ChuyenKhoNoiBo TO Role_ThuKho;
-- BẢO MẬT: CẤM XEM THÔNG TIN KHÁCH HÀNG, ĐƠN HÀNG, NHÂN SỰ
DENY SELECT ON KhachHang TO Role_ThuKho;
DENY SELECT ON DonHang TO Role_ThuKho;
DENY SELECT ON ChiTietDonHang TO Role_ThuKho;
DENY SELECT ON NhanVien TO Role_ThuKho;
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH PHAN QUYEN NATIVE 4 LOGINS, 4 ROLES THEO CHUAN LEAST PRIVILEGE!';
PRINT N'=========================================================================';
GO
