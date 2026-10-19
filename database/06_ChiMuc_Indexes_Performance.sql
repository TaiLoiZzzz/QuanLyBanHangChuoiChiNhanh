-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 6: XÂY DỰNG 5 CHỈ MỤC (INDEXES) & PHÂN TÍCH HIỆU NĂNG EXECUTION PLAN
-- NGƯỜI PHỤ TRÁCH: QUÁCH TÀI LỢI (70%) - HỖ TRỢ: PHAN THIỆN KHỞI (7.5%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA INDEX NẾU ĐÃ TỒN TẠI ĐỂ TẠO LẠI KHÔNG BỊ TRÙNG
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_KhachHang_SoDT' AND object_id = OBJECT_ID('KhachHang'))
    DROP INDEX IX_KhachHang_SoDT ON KhachHang;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DonHang_NgayDat_TrangThai' AND object_id = OBJECT_ID('DonHang'))
    DROP INDEX IX_DonHang_NgayDat_TrangThai ON DonHang;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_SanPham_MaDM_GiaBan' AND object_id = OBJECT_ID('SanPham'))
    DROP INDEX IX_SanPham_MaDM_GiaBan ON SanPham;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_TonKho_MaSP_SoLuongTon' AND object_id = OBJECT_ID('TonKho'))
    DROP INDEX IX_TonKho_MaSP_SoLuongTon ON TonKho;

IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_NhanVien_MaCN_MaQL' AND object_id = OBJECT_ID('NhanVien'))
    DROP INDEX IX_NhanVien_MaCN_MaQL ON NhanVien;
GO

-- =========================================================================
-- CHỈ MỤC 1: NON-CLUSTERED UNIQUE INDEX TRÊN SỐ ĐIỆN THOẠI KHÁCH HÀNG
-- Nghiệp vụ: Thu ngân gõ số điện thoại khách tại quầy để tra cứu tích điểm và hạng thành viên
-- Kỹ thuật: Unique Non-clustered Index B-Tree, FILLFACTOR = 80 chống Page Split
-- =========================================================================
CREATE UNIQUE NONCLUSTERED INDEX IX_KhachHang_SoDT
ON KhachHang(SoDT)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 1: IX_KhachHang_SoDT';
GO

-- =========================================================================
-- CHỈ MỤC 2: COMPOSITE COVERING INDEX TRÊN ĐƠN HÀNG (NGÀY ĐẶT & TRẠNG THÁI)
-- Nghiệp vụ: Báo cáo doanh số theo khoảng thời gian và lọc trạng thái đơn hàng
-- Kỹ thuật: Composite Index (NgayDat, TrangThai) kèm INCLUDE (TongTien, MaKH, MaNV)
--           giúp biến câu truy vấn thành Index Seek 100% không cần Key Lookup!
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_DonHang_NgayDat_TrangThai
ON DonHang(NgayDat, TrangThai)
INCLUDE (TongTien, MaKH, MaNV)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 2: IX_DonHang_NgayDat_TrangThai (Covering Index)';
GO

-- =========================================================================
-- CHỈ MỤC 3: FILTERED INDEX TRÊN SẢN PHẨM CÒN KINH DOANH (DANH MỤC & GIÁ BÁN)
-- Nghiệp vụ: Khách hàng lọc sản phẩm theo nhóm và tầm giá trên Web/App
-- Kỹ thuật: Filtered Index có điều kiện WHERE DaXoa = 0, giúp tiết kiệm bộ nhớ RAM
--           và không phải index các sản phẩm đã ngừng kinh doanh (Soft-deleted)
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_SanPham_MaDM_GiaBan
ON SanPham(MaDM, GiaBanHienTai)
INCLUDE (TenSP, DonViTinh)
WHERE DaXoa = 0
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 3: IX_SanPham_MaDM_GiaBan (Filtered Index)';
GO

-- =========================================================================
-- CHỈ MỤC 4: COMPOSITE INDEX HỖ TRỢ TRUY VẤN VÀ CẢNH BÁO TỒN KHO
-- Nghiệp vụ: Phục vụ trực tiếp cho View 1 (v_BaoCaoTonKho_XepHang) và Trigger kiểm tra tồn kho
-- Kỹ thuật: Non-clustered Index trên TonKho(MaSP, SoLuongTon)
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_TonKho_MaSP_SoLuongTon
ON TonKho(MaSP, SoLuongTon)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 4: IX_TonKho_MaSP_SoLuongTon';
GO

-- =========================================================================
-- CHỈ MỤC 5: INDEX HỖ TRỢ TÌM KIẾM CÂY NHÂN SỰ VÀ PHÂN QUYỀN THEO CHI NHÁNH
-- Nghiệp vụ: Phục vụ tra cứu danh bạ nội bộ (View 2) và kiểm tra quyền quản lý chi nhánh
-- Kỹ thuật: Non-clustered Index trên NhanVien(MaCN, MaQL) INCLUDE (HoTen)
-- =========================================================================
CREATE NONCLUSTERED INDEX IX_NhanVien_MaCN_MaQL
ON NhanVien(MaCN, MaQL)
INCLUDE (HoTen)
WITH (FILLFACTOR = 80);
GO

PRINT N'Da tao thanh cong INDEX 5: IX_NhanVien_MaCN_MaQL';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 INDEX CHUYEN SAU VA TOI UU TRUY VAN!';
PRINT N'=========================================================================';
GO
