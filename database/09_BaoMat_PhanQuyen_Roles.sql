-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 9: BẢO MẬT & PHÂN QUYỀN NATIVE (4 LOGINS, 4 ROLES, GRANT/REVOKE/DENY)
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE master;
GO

-- 1. TẠO 4 SERVER LOGINS NATIVE TRONG SQL SERVER
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_Admin')
    CREATE LOGIN Login_Admin WITH PASSWORD = '$(DB_ADMIN_PASSWORD)', CHECK_POLICY = ON;

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_QuanLyChiNhanh')
    CREATE LOGIN Login_QuanLyChiNhanh WITH PASSWORD = '$(DB_MANAGER_PASSWORD)', CHECK_POLICY = ON;

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_ThuNgan')
    CREATE LOGIN Login_ThuNgan WITH PASSWORD = '$(DB_CASHIER_PASSWORD)', CHECK_POLICY = ON;

IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'Login_ThuKho')
    CREATE LOGIN Login_ThuKho WITH PASSWORD = '$(DB_STOCK_PASSWORD)', CHECK_POLICY = ON;
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

-- ROLE 1: ADMIN (QUẢN TRỊ VIÊN CAO CẤP) -> TOÀN QUYỀN (QUÁCH TÀI LỢI - 20%)
GRANT CONTROL ON DATABASE::QuanLyBanHangDB TO Role_Admin;
GO

-- ROLE 2: QUẢN LÝ CHI NHÁNH (PHAN THIỆN KHỞI - 20%)
-- Được xem tất cả Views báo cáo, thủ tục chuyển kho, tìm kiếm, KPI và giao dịch quản lý
GRANT SELECT ON v_BaoCaoTonKho_XepHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_TongHopDoanhThuSanPham TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_PhanCapNhanSu_ToanDien TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_NhanVien_ChiNhanh1_KiemSoat TO Role_QuanLyChiNhanh;
GRANT SELECT ON dbo.fn_BaoCaoDoanhThuNhanVienChiTiet TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_BaoCaoTongHopDoanhThuChiNhanh TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_ChuyenKhoNoiBo TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_TimKiemSanPhamNangCao TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_Tx_XoaNhanVienVaDieuChuyenQuanLy TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_Tx_ThangHangThanhVienHangLoat TO Role_QuanLyChiNhanh;

-- Nghiệp vụ Bán hàng & Quản lý Đơn hàng (POS)
GRANT SELECT ON dbo.fn_DanhSachDonHangTheoKhoangThoiGian TO Role_QuanLyChiNhanh;
GRANT SELECT ON v_InHoaDon_ChiTietPhucHop TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_TaoDonHangVaChiTiet TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.sp_CapNhatTrangThaiDonHang TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_Tx_DatHangVaGiuCho TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_Tx_HuyDonHangVaHoanTonKho TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.fn_TinhTienSauChietKhauVIP TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.fn_KiemTraKhaNangDapUngDonHang TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.fn_FormatMaHoaDonTuDong TO Role_QuanLyChiNhanh;

GRANT SELECT ON ChiNhanh TO Role_QuanLyChiNhanh;
GRANT SELECT ON KhoHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON TonKho TO Role_QuanLyChiNhanh;
GRANT SELECT ON SanPham TO Role_QuanLyChiNhanh;
GRANT SELECT ON DanhMuc TO Role_QuanLyChiNhanh;
GRANT SELECT, INSERT, UPDATE ON KhachHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON DonHang TO Role_QuanLyChiNhanh;
REVOKE INSERT, UPDATE ON DonHang FROM Role_QuanLyChiNhanh;
GRANT SELECT ON ChiTietDonHang TO Role_QuanLyChiNhanh;
REVOKE INSERT, UPDATE ON ChiTietDonHang FROM Role_QuanLyChiNhanh;
GRANT SELECT ON NhatKyHeThong TO Role_QuanLyChiNhanh;
-- BẢO MẬT CẤP CỘT (COLUMN-LEVEL SECURITY - LEAST PRIVILEGE):
-- Cho phép xem thông tin định danh nhân sự để liên kết chi nhánh/kho, cấm tuyệt đối cột Luong (Error 229 nếu cố truy vấn)
REVOKE SELECT ON dbo.NhanVien FROM Role_QuanLyChiNhanh;
REVOKE SELECT(MaNV,HoTen,MaCN,MaQL,DaXoa) ON dbo.NhanVien FROM Role_QuanLyChiNhanh;
DENY SELECT ON dbo.NhanVien TO Role_QuanLyChiNhanh;
GO

-- ROLE 3: THU NGÂN / CASHIER (HUỲNH VĂN BÌNH - 20%)
-- Được tạo đơn, in hóa đơn, tìm khách, tra sản phẩm và chạy các hàm/giao dịch bán hàng
GRANT EXECUTE ON dbo.sp_TaoDonHangVaChiTiet TO Role_ThuNgan;
GRANT EXECUTE ON dbo.sp_CapNhatTrangThaiDonHang TO Role_ThuNgan;
GRANT EXECUTE ON dbo.sp_TimKiemSanPhamNangCao TO Role_ThuNgan;
GRANT EXECUTE ON dbo.usp_Tx_DatHangVaGiuCho TO Role_ThuNgan;
GRANT EXECUTE ON dbo.usp_Tx_HuyDonHangVaHoanTonKho TO Role_ThuNgan;
GRANT EXECUTE ON dbo.fn_TinhTienSauChietKhauVIP TO Role_ThuNgan;
GRANT EXECUTE ON dbo.fn_KiemTraKhaNangDapUngDonHang TO Role_ThuNgan;
GRANT EXECUTE ON dbo.fn_FormatMaHoaDonTuDong TO Role_ThuNgan;
GRANT SELECT ON dbo.fn_DanhSachDonHangTheoKhoangThoiGian TO Role_ThuNgan;
GRANT SELECT ON v_InHoaDon_ChiTietPhucHop TO Role_ThuNgan;
GRANT SELECT ON KhachHang TO Role_ThuNgan;
REVOKE INSERT, UPDATE ON KhachHang FROM Role_ThuNgan;
GRANT SELECT ON ChiNhanh TO Role_ThuNgan;
GRANT SELECT ON KhoHang TO Role_ThuNgan;
GRANT SELECT ON TonKho TO Role_ThuNgan;
GRANT SELECT ON SanPham TO Role_ThuNgan;
GRANT SELECT ON DanhMuc TO Role_ThuNgan;
GRANT SELECT ON DonHang TO Role_ThuNgan;
GRANT SELECT ON ChiTietDonHang TO Role_ThuNgan;
-- BẢO MẬT: CẤM TUYỆT ĐỐI XEM LƯƠNG HOẶC XÓA BẤT KỲ DỮ LIỆU NÀO TRỰC TIẾP
REVOKE SELECT ON dbo.NhanVien FROM Role_ThuNgan;
REVOKE SELECT(MaNV,HoTen,MaCN,MaQL,DaXoa) ON dbo.NhanVien FROM Role_ThuNgan;
DENY SELECT ON dbo.NhanVien TO Role_ThuNgan;
DENY DELETE ON DonHang TO Role_ThuNgan;
DENY DELETE ON ChiTietDonHang TO Role_ThuNgan;
DENY SELECT ON LichSuGia TO Role_ThuNgan;
GO

-- ROLE 4: THỦ KHO / STOCKKEEPER (HOÀNG GIA KIỆT - 20%)
-- Được kiểm tra tồn kho, chuyển kho nội bộ và liên chi nhánh
GRANT SELECT ON v_BaoCaoTonKho_XepHang TO Role_ThuKho;
GRANT SELECT ON ChiNhanh TO Role_ThuKho;
GRANT SELECT ON TonKho TO Role_ThuKho;
GRANT SELECT ON KhoHang TO Role_ThuKho;
GRANT SELECT ON SanPham TO Role_ThuKho;
GRANT SELECT ON DanhMuc TO Role_ThuKho;
GRANT EXECUTE ON dbo.sp_ChuyenKhoNoiBo TO Role_ThuKho;
GRANT EXECUTE ON dbo.sp_TimKiemSanPhamNangCao TO Role_ThuKho;
GRANT EXECUTE ON dbo.fn_KiemTraKhaNangDapUngDonHang TO Role_ThuKho;
GRANT EXECUTE ON dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh TO Role_ThuKho;
-- BẢO MẬT: CẤM XEM THÔNG TIN KHÁCH HÀNG, ĐƠN HÀNG, NHÂN SỰ
DENY SELECT ON KhachHang TO Role_ThuKho;
DENY SELECT ON DonHang TO Role_ThuKho;
DENY SELECT ON ChiTietDonHang TO Role_ThuKho;
REVOKE SELECT ON dbo.NhanVien FROM Role_ThuKho;
REVOKE SELECT(MaNV,HoTen,MaCN,MaQL,DaXoa) ON dbo.NhanVien FROM Role_ThuKho;
DENY SELECT ON dbo.NhanVien TO Role_ThuKho;
GO

-- MA TRẬN BẢO MẬT & KIỂM THỬ XÁC THỰC RLS (TRẦN NHẬT TÂN - 20%)
-- Thiết lập chính sách kiểm thử kết nối trực tiếp từ Web Dashboard qua 4 tài khoản CSDL

PRINT N'=========================================================================';
PRINT N'HOAN THANH PHAN QUYEN NATIVE 4 LOGINS, 4 ROLES THEO CHUAN LEAST PRIVILEGE!';
PRINT N'=========================================================================';
GO

-- Shared application policy: POS never needs salary, and writes go through transactions.
GRANT SELECT ON dbo.v_NhanVien_BanHang TO Role_QuanLyChiNhanh,Role_ThuNgan;
GRANT EXECUTE ON dbo.usp_LuuSanPham TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_XoaMemSanPham TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_ThemChiNhanh TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_ThemNhanVien TO Role_QuanLyChiNhanh;
GRANT EXECUTE ON dbo.usp_ThemKhachHang TO Role_QuanLyChiNhanh,Role_ThuNgan;
GRANT EXECUTE ON dbo.usp_NhapKho TO Role_QuanLyChiNhanh,Role_ThuKho;
DENY INSERT,UPDATE,DELETE ON dbo.DonHang TO Role_QuanLyChiNhanh,Role_ThuNgan,Role_ThuKho;
DENY INSERT,UPDATE,DELETE ON dbo.ChiTietDonHang TO Role_QuanLyChiNhanh,Role_ThuNgan,Role_ThuKho;
GO
