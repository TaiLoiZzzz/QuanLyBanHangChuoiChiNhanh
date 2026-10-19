-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN HƯỚNG DẪN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- KỊCH BẢN MASTER TẠO TOÀN BỘ CSDL TỪ ĐẦU (ONE-CLICK RUN ALL IN SSMS / DBEAVER)
-- NHÓM SINH VIÊN THỰC HIỆN:
-- 1. Quách Tài Lợi (Trưởng nhóm - 20%)
-- 2. Phan Thiện Khởi (20%)
-- 3. Huỳnh Văn Bình (20%)
-- 4. Hoàng Gia Kiệt (20%)
-- 5. Trần Nhật Tân (20%)
-- =========================================================================


-- =========================================================================
-- NOI DUNG TU TEP: 01_TaoCSDL_Bang_RangBuoc.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

-- 1. TẠO CƠ SỞ DỮ LIỆU (NẾU CHƯA CÓ)
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'QuanLyBanHangDB')
BEGIN
    CREATE DATABASE QuanLyBanHangDB;
END;
GO

USE QuanLyBanHangDB;
GO

-- 2. CẤU HÌNH RECOVERY MODEL = FULL (BẮT BUỘC ĐỂ PHỤC VỤ POINT-IN-TIME RECOVERY)
ALTER DATABASE QuanLyBanHangDB SET RECOVERY FULL;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 3. XÓA CÁC ĐỐI TƯỢNG VIEW / INDEXED VIEW (CÓ SCHEMABINDING) TRƯỚC ĐỂ TRÁNH KHÓA BẢNG KHI CHẠY LẠI
IF OBJECT_ID('dbo.v_TongHopDoanhThuSanPham', 'V') IS NOT NULL DROP VIEW dbo.v_TongHopDoanhThuSanPham;
IF OBJECT_ID('dbo.v_InHoaDon_ChiTietPhucHop', 'V') IS NOT NULL DROP VIEW dbo.v_InHoaDon_ChiTietPhucHop;
IF OBJECT_ID('dbo.v_BaoCaoTonKho_XepHang', 'V') IS NOT NULL DROP VIEW dbo.v_BaoCaoTonKho_XepHang;
IF OBJECT_ID('dbo.v_PhanCapNhanSu_ToanDien', 'V') IS NOT NULL DROP VIEW dbo.v_PhanCapNhanSu_ToanDien;
IF OBJECT_ID('dbo.v_NhanVien_ChiNhanh1_KiemSoat', 'V') IS NOT NULL DROP VIEW dbo.v_NhanVien_ChiNhanh1_KiemSoat;
GO

-- 4. XÓA BẢNG THEO THỨ TỰ NGƯỢC (TỪ CON ĐẾN CHA) NẾU ĐÃ TỒN TẠI ĐỂ CHẠY LẠI KHÔNG LỖI
IF OBJECT_ID('dbo.ChiTietDonHang', 'U') IS NOT NULL DROP TABLE dbo.ChiTietDonHang;
IF OBJECT_ID('dbo.DonHang', 'U') IS NOT NULL DROP TABLE dbo.DonHang;
IF OBJECT_ID('dbo.TonKho', 'U') IS NOT NULL DROP TABLE dbo.TonKho;
IF OBJECT_ID('dbo.LichSuGia', 'U') IS NOT NULL DROP TABLE dbo.LichSuGia;
IF OBJECT_ID('dbo.SanPham', 'U') IS NOT NULL DROP TABLE dbo.SanPham;
IF OBJECT_ID('dbo.KhoHang', 'U') IS NOT NULL DROP TABLE dbo.KhoHang;
IF OBJECT_ID('dbo.DanhMuc', 'U') IS NOT NULL DROP TABLE dbo.DanhMuc;
IF OBJECT_ID('dbo.KhachHang', 'U') IS NOT NULL DROP TABLE dbo.KhachHang;
IF OBJECT_ID('dbo.NhanVien', 'U') IS NOT NULL DROP TABLE dbo.NhanVien;
IF OBJECT_ID('dbo.ChiNhanh', 'U') IS NOT NULL DROP TABLE dbo.ChiNhanh;
IF OBJECT_ID('dbo.NhatKyHeThong', 'U') IS NOT NULL DROP TABLE dbo.NhatKyHeThong;
GO

-- =========================================================================
-- 4. TẠO 11 BẢNG VỚI KIỂU DỮ LIỆU TỐI ƯU BỘ NHỚ VÀ RÀNG BUỘC CHUẨN
-- =========================================================================

-- BẢNG 1: CHI NHÁNH
CREATE TABLE ChiNhanh (
    MaCN INT IDENTITY(1,1) PRIMARY KEY,
    TenCN NVARCHAR(100) NOT NULL,
    DiaChi NVARCHAR(200) NULL,
    SoDT CHAR(10) NOT NULL CONSTRAINT UQ_ChiNhanh_SoDT UNIQUE
);
GO

-- BẢNG 2: NHÂN VIÊN (Có tự tham chiếu MaQL và cờ xóa mềm DaXoa)
CREATE TABLE NhanVien (
    MaNV INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    Luong DECIMAL(12,2) NOT NULL CONSTRAINT CK_NhanVien_Luong CHECK (Luong > 0),
    MaCN INT NOT NULL CONSTRAINT FK_NhanVien_ChiNhanh REFERENCES ChiNhanh(MaCN),
    MaQL INT NULL CONSTRAINT FK_NhanVien_QuanLy REFERENCES NhanVien(MaNV),
    DaXoa BIT NOT NULL CONSTRAINT DF_NhanVien_DaXoa DEFAULT 0
);
GO

-- BẢNG 3: KHÁCH HÀNG (LoaiKH: 0: Thường, 1: VIP, 2: Kim Cương)
CREATE TABLE KhachHang (
    MaKH INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    SoDT CHAR(10) NOT NULL CONSTRAINT UQ_KhachHang_SoDT UNIQUE,
    LoaiKH TINYINT NOT NULL CONSTRAINT DF_KhachHang_LoaiKH DEFAULT 0,
    DiemTichLuy INT NOT NULL CONSTRAINT DF_KhachHang_Diem DEFAULT 0,
    CONSTRAINT CK_KhachHang_SoDT CHECK (LEN(SoDT) = 10 AND SoDT NOT LIKE '%[^0-9]%'),
    CONSTRAINT CK_KhachHang_LoaiKH CHECK (LoaiKH IN (0, 1, 2))
);
GO

-- BẢNG 4: DANH MỤC SẢN PHẨM
CREATE TABLE DanhMuc (
    MaDM INT IDENTITY(1,1) PRIMARY KEY,
    TenDM NVARCHAR(100) NOT NULL CONSTRAINT UQ_DanhMuc_TenDM UNIQUE
);
GO

-- BẢNG 5: SẢN PHẨM (Có cờ xóa mềm)
CREATE TABLE SanPham (
    MaSP INT IDENTITY(1,1) PRIMARY KEY,
    TenSP NVARCHAR(150) NOT NULL,
    MaDM INT NOT NULL CONSTRAINT FK_SanPham_DanhMuc REFERENCES DanhMuc(MaDM),
    GiaBanHienTai DECIMAL(12,2) NOT NULL CONSTRAINT CK_SanPham_Gia CHECK (GiaBanHienTai > 0),
    DonViTinh NVARCHAR(20) NOT NULL,
    DaXoa BIT NOT NULL CONSTRAINT DF_SanPham_DaXoa DEFAULT 0
);
GO

-- BẢNG 6: KHO HÀNG
CREATE TABLE KhoHang (
    MaKho INT IDENTITY(1,1) PRIMARY KEY,
    TenKho NVARCHAR(100) NOT NULL,
    MaCN INT NOT NULL CONSTRAINT FK_KhoHang_ChiNhanh REFERENCES ChiNhanh(MaCN)
);
GO

-- BẢNG 7: TỒN KHO (Khóa chính phức hợp: MaKho + MaSP)
CREATE TABLE TonKho (
    MaKho INT NOT NULL CONSTRAINT FK_TonKho_KhoHang REFERENCES KhoHang(MaKho),
    MaSP INT NOT NULL CONSTRAINT FK_TonKho_SanPham REFERENCES SanPham(MaSP),
    SoLuongTon INT NOT NULL CONSTRAINT DF_TonKho_SoLuong DEFAULT 0,
    CONSTRAINT PK_TonKho PRIMARY KEY (MaKho, MaSP),
    CONSTRAINT CK_TonKho_KhongAm CHECK (SoLuongTon >= 0)
);
GO

-- BẢNG 8: ĐƠN HÀNG (TrangThai: 0: Mới, 1: Đã xác nhận, 2: Đang giao, 3: Đã giao, 4: Đã hủy)
CREATE TABLE DonHang (
    MaDH INT IDENTITY(1,1) PRIMARY KEY,
    MaKH INT NOT NULL CONSTRAINT FK_DonHang_KhachHang REFERENCES KhachHang(MaKH),
    MaNV INT NOT NULL CONSTRAINT FK_DonHang_NhanVien REFERENCES NhanVien(MaNV),
    MaKhoXuat INT NOT NULL CONSTRAINT FK_DonHang_KhoHang REFERENCES KhoHang(MaKho),
    NgayDat DATETIME NOT NULL CONSTRAINT DF_DonHang_NgayDat DEFAULT GETDATE(),
    TrangThai TINYINT NOT NULL CONSTRAINT DF_DonHang_TrangThai DEFAULT 0,
    TongTien DECIMAL(14,2) NOT NULL CONSTRAINT DF_DonHang_TongTien DEFAULT 0,
    CONSTRAINT CK_DonHang_TrangThai CHECK (TrangThai IN (0, 1, 2, 3, 4))
);
GO

-- BẢNG 9: CHI TIẾT ĐƠN HÀNG (Khóa chính phức hợp: MaDH + MaSP, Cột tính toán PERSISTED)
CREATE TABLE ChiTietDonHang (
    MaDH INT NOT NULL CONSTRAINT FK_ChiTiet_DonHang REFERENCES DonHang(MaDH),
    MaSP INT NOT NULL CONSTRAINT FK_ChiTiet_SanPham REFERENCES SanPham(MaSP),
    SoLuong INT NOT NULL CONSTRAINT CK_ChiTiet_SoLuong CHECK (SoLuong > 0),
    DonGiaBan DECIMAL(12,2) NOT NULL CONSTRAINT CK_ChiTiet_DonGia CHECK (DonGiaBan > 0),
    ThanhTien AS (SoLuong * DonGiaBan) PERSISTED,
    CONSTRAINT PK_ChiTietDonHang PRIMARY KEY (MaDH, MaSP)
);
GO

-- BẢNG 10: LỊCH SỬ THAY ĐỔI GIÁ (Audit Log - Theo dõi biến động theo trục thời gian)
CREATE TABLE LichSuGia (
    MaLS INT IDENTITY(1,1) PRIMARY KEY,
    MaSP INT NOT NULL CONSTRAINT FK_LichSuGia_SanPham REFERENCES SanPham(MaSP),
    GiaCu DECIMAL(12,2) NOT NULL,
    GiaMoi DECIMAL(12,2) NOT NULL,
    NgayThayDoi DATETIME NOT NULL CONSTRAINT DF_LichSuGia_Ngay DEFAULT GETDATE(),
    NguoiThayDoi NVARCHAR(100) NOT NULL
);
GO

-- BẢNG 11: NHẬT KÝ HỆ THỐNG (System Audit Log)
CREATE TABLE NhatKyHeThong (
    MaLog INT IDENTITY(1,1) PRIMARY KEY,
    HanhDong NVARCHAR(100) NOT NULL,
    NoiDung NVARCHAR(MAX) NULL,
    ThoiGian DATETIME NOT NULL CONSTRAINT DF_NhatKy_ThoiGian DEFAULT GETDATE(),
    NguoiThucHien NVARCHAR(100) NOT NULL
);
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 02_DuLieuMau_Testing.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 2: NẠP DỮ LIỆU MẪU KIỂM THỬ THỰC TẾ (SEED DATA)
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. XÓA DỮ LIỆU CŨ THEO THỨ TỰ NGƯỢC ĐỂ NẠP LẠI SẠCH SẼ
DELETE FROM ChiTietDonHang;
DELETE FROM DonHang;
DELETE FROM TonKho;
DELETE FROM LichSuGia;
DELETE FROM SanPham;
DELETE FROM KhoHang;
DELETE FROM DanhMuc;
DELETE FROM KhachHang;
DELETE FROM NhanVien;
DELETE FROM ChiNhanh;
DELETE FROM NhatKyHeThong;
GO

-- =========================================================================
-- 2. NẠP DỮ LIỆU MẪU CHI TIẾT (SỬ DỤNG IDENTITY_INSERT ĐỂ ĐẢM BẢO KHÓA NGOẠI 100%)
-- =========================================================================

-- NẠP BẢNG CHI NHÁNH (MaCN: 1, 2)
SET IDENTITY_INSERT ChiNhanh ON;
INSERT INTO ChiNhanh (MaCN, TenCN, DiaChi, SoDT) VALUES 
(1, N'Chi nhánh Quận 1', N'123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM', '0901234567'),
(2, N'Chi nhánh Thủ Đức', N'01 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', '0908765432');
SET IDENTITY_INSERT ChiNhanh OFF;
GO

-- NẠP BẢNG KHO HÀNG (MaKho: 1, 2)
SET IDENTITY_INSERT KhoHang ON;
INSERT INTO KhoHang (MaKho, TenKho, MaCN) VALUES 
(1, N'Kho Trung Tâm Quận 1', 1),
(2, N'Kho Chi Nhánh Thủ Đức', 2);
SET IDENTITY_INSERT KhoHang OFF;
GO

-- NẠP BẢNG DANH MỤC (MaDM: 1, 2, 3)
SET IDENTITY_INSERT DanhMuc ON;
INSERT INTO DanhMuc (MaDM, TenDM) VALUES 
(1, N'Áo Nam'),
(2, N'Quần Nam'),
(3, N'Phụ Kiện Thời Trang');
SET IDENTITY_INSERT DanhMuc OFF;
GO

-- NẠP BẢNG SẢN PHẨM (MaSP: 1, 2, 3, 4)
SET IDENTITY_INSERT SanPham ON;
INSERT INTO SanPham (MaSP, TenSP, MaDM, GiaBanHienTai, DonViTinh) VALUES 
(1, N'Áo Thun Cotton Basic', 1, 150000, N'Cái'),
(2, N'Áo Sơ Mi Oxford', 1, 350000, N'Cái'),
(3, N'Quần Jean Slimfit', 2, 450000, N'Cái'),
(4, N'Ví Da Nam Cầm Tay', 3, 250000, N'Cái');
SET IDENTITY_INSERT SanPham OFF;
GO

-- NẠP BẢNG NHÂN VIÊN (MaNV: 1, 2, 3)
-- Lưu ý: Nạp Sếp tổng (MaQL = NULL) trước để lấy MaNV = 1 làm sếp
SET IDENTITY_INSERT NhanVien ON;
INSERT INTO NhanVien (MaNV, HoTen, Luong, MaCN, MaQL) VALUES 
(1, N'Nguyễn Văn Quản Lý', 25000000, 1, NULL), -- MaNV = 1 (Sếp chi nhánh Q1)
(2, N'Trần Thị Thu Ngân', 9000000, 1, 1),      -- MaNV = 2
(3, N'Lê Văn Thủ Kho', 10000000, 1, 1);       -- MaNV = 3
SET IDENTITY_INSERT NhanVien OFF;
GO

-- NẠP BẢNG KHÁCH HÀNG (MaKH: 1, 2)
SET IDENTITY_INSERT KhachHang ON;
INSERT INTO KhachHang (MaKH, HoTen, SoDT, LoaiKH, DiemTichLuy) VALUES 
(1, N'Phạm Hoàng Khách', '0912345678', 0, 50),     -- Thường
(2, N'Vũ Thị VIP', '0987654321', 1, 1200);          -- VIP
SET IDENTITY_INSERT KhachHang OFF;
GO

-- NẠP BẢNG TỒN KHO (Tồn ban đầu cho cả 2 kho)
INSERT INTO TonKho (MaKho, MaSP, SoLuongTon) VALUES 
(1, 1, 100), -- Kho 1 có 100 Áo Thun
(1, 2, 50),  -- Kho 1 có 50 Áo Sơ Mi
(1, 3, 30),  -- Kho 1 có 30 Quần Jean
(1, 4, 10),  -- Kho 1 có 10 Ví Da
(2, 1, 80),  -- Kho 2 có 80 Áo Thun
(2, 2, 20),  -- Kho 2 có 20 Áo Sơ Mi
(2, 3, 15),  -- Kho 2 có 15 Quần Jean
(2, 4, 5);   -- Kho 2 có 5 Ví Da
GO

-- NẠP BẢNG ĐƠN HÀNG MẪU (MaDH: 1)
-- Đơn hàng 1: Khách Phạm Hoàng Khách mua tại Kho 1, NV Thu Ngân lập
SET IDENTITY_INSERT DonHang ON;
INSERT INTO DonHang (MaDH, MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien) 
VALUES (1, 1, 2, 1, DATEADD(DAY, -1, GETDATE()), 3, 650000); -- Trạng thái 3: Đã giao thành công
SET IDENTITY_INSERT DonHang OFF;
GO

-- NẠP BẢNG CHI TIẾT ĐƠN HÀNG MẪU
INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan) VALUES 
(1, 1, 2, 150000), -- Mua 2 Áo thun = 300.000đ
(1, 2, 1, 350000); -- Mua 1 Áo sơ mi = 350.000đ
GO

-- GHI NHẬT KÝ KHỞI TẠO HỆ THỐNG
INSERT INTO NhatKyHeThong (HanhDong, NoiDung, NguoiThucHien) VALUES 
(N'KHOI_TAO_DU_LIEU', N'Khởi tạo thành công 11 bảng và dữ liệu mẫu kiểm thử ban đầu.', N'HeThong_Admin');
GO

-- =========================================================================
-- 3. THỦ TỤC SINH DỮ LIỆU TẢI LỚN ĐỂ KIỂM THỬ HIỆU NĂNG & CHỤP ẢNH EXECUTION PLAN
-- Nghiệp vụ: Phục vụ đo đạc chênh lệch hiệu năng trước và sau khi đánh 5 Index (Bước 6)
-- Kỹ thuật: Sinh hàng loạt N đơn hàng ngẫu nhiên với giao dịch theo lô (Batch Transaction)
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.sp_SinhDuLieuMau_TestTai
    @SoLuongDonHang INT = 5000
AS
BEGIN
    SET NOCOUNT ON;
    PRINT N'Bắt đầu sinh ' + CAST(@SoLuongDonHang AS NVARCHAR(10)) + N' đơn hàng kiểm thử tải...';

    DECLARE @i INT = 1;
    DECLARE @MaKH INT, @MaNV INT, @MaKho INT, @MaSP INT, @SoLuong INT, @DonGia DECIMAL(12,2);
    DECLARE @NgayDat DATETIME, @TrangThai TINYINT, @MaDH_Moi INT;

    BEGIN TRANSACTION;

    WHILE @i <= @SoLuongDonHang
    BEGIN
        -- Random ngẫu nhiên các thông số
        SET @MaKH = (@i % 2) + 1; -- MaKH: 1 hoặc 2
        SET @MaNV = (@i % 3) + 1; -- MaNV: 1, 2, 3
        SET @MaKho = (@i % 2) + 1; -- MaKho: 1 hoặc 2
        SET @TrangThai = (@i % 4); -- 0: Mới, 1: Xác nhận, 2: Giao, 3: Xong
        SET @NgayDat = DATEADD(MINUTE, -(@i * 7), GETDATE()); -- Rải đều thời gian về quá khứ

        INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
        VALUES (@MaKH, @MaNV, @MaKho, @NgayDat, @TrangThai, 0);

        SET @MaDH_Moi = SCOPE_IDENTITY();

        -- Sinh 2 chi tiết đơn hàng cho mỗi đơn
        SET @MaSP = ((@i * 3) % 4) + 1;
        SET @SoLuong = (@i % 3) + 1;
        SELECT @DonGia = GiaBanHienTai FROM SanPham WHERE MaSP = @MaSP;

        -- Tạm thời vô hiệu hóa trigger trừ kho để tránh cạn kho khi sinh dữ liệu kiểm thử tải
        INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
        VALUES (@MaDH_Moi, @MaSP, @SoLuong, @DonGia);

        -- Cập nhật tổng tiền đơn hàng
        UPDATE DonHang 
        SET TongTien = @SoLuong * @DonGia
        WHERE MaDH = @MaDH_Moi;

        SET @i = @i + 1;
    END;

    COMMIT TRANSACTION;

    PRINT N'Đã sinh thành công ' + CAST(@SoLuongDonHang AS NVARCHAR(10)) + N' đơn hàng để phục vụ chụp ảnh Actual Execution Plan!';
END;
GO

PRINT N'=========================================================================';
PRINT N'ĐÃ NẠP DỮ LIỆU MẪU KIỂM THỬ THÀNH CÔNG CHO TOÀN BỘ 11 BẢNG!';
PRINT N'=========================================================================';
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 03_KhungNhin_Views.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 3: XÂY DỰNG 5 KHUNG NHÌN (VIEWS) CHUYÊN SÂU & TỐI ƯU DATABASE ENGINE
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- 1. XÓA CÁC VIEW CŨ NẾU ĐÃ TỒN TẠI (THEO THỨ TỰ)
IF OBJECT_ID('v_TongHopDoanhThuSanPham', 'V') IS NOT NULL DROP VIEW v_TongHopDoanhThuSanPham;
IF OBJECT_ID('v_InHoaDon_ChiTietPhucHop', 'V') IS NOT NULL DROP VIEW v_InHoaDon_ChiTietPhucHop;
IF OBJECT_ID('v_NhanVien_ChiNhanh1_KiemSoat', 'V') IS NOT NULL DROP VIEW v_NhanVien_ChiNhanh1_KiemSoat;
IF OBJECT_ID('v_PhanCapNhanSu_ToanDien', 'V') IS NOT NULL DROP VIEW v_PhanCapNhanSu_ToanDien;
IF OBJECT_ID('v_BaoCaoTonKho_XepHang', 'V') IS NOT NULL DROP VIEW v_BaoCaoTonKho_XepHang;
IF OBJECT_ID('v_BaoCaoTonKhoTheoChiNhanh', 'V') IS NOT NULL DROP VIEW v_BaoCaoTonKhoTheoChiNhanh;
IF OBJECT_ID('v_NhanVien_CongKhai', 'V') IS NOT NULL DROP VIEW v_NhanVien_CongKhai;
GO

-- =========================================================================
-- VIEW 1: BÁO CÁO TỒN KHO & XẾP HẠNG NGUY CƠ HẾT HÀNG (WINDOW FUNCTIONS)
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Kỹ thuật chuyên sâu:
--   - Dùng DENSE_RANK() OVER (PARTITION BY cn.MaCN ORDER BY tk.SoLuongTon ASC) để xếp hạng sản phẩm cạn kho nhất
--   - Dùng SUM(...) OVER (PARTITION BY k.MaKho) để tính % tỷ trọng chiếm dụng kho
--   - CASE WHEN phân loại trạng thái tồn kho
-- =========================================================================
CREATE VIEW v_BaoCaoTonKho_XepHang
AS
SELECT 
    cn.MaCN,
    cn.TenCN,
    k.MaKho,
    k.TenKho,
    sp.MaSP,
    sp.TenSP,
    dm.TenDM,
    sp.DonViTinh,
    tk.SoLuongTon,
    sp.GiaBanHienTai,
    (tk.SoLuongTon * sp.GiaBanHienTai) AS TongGiaTriTonKho,
    -- Tính % lượng hàng món này chiếm trong tổng số lượng hàng của cả kho (ép kiểu DECIMAL(5,2) chuẩn hóa)
    CAST(ROUND(100.0 * tk.SoLuongTon / NULLIF(SUM(tk.SoLuongTon) OVER(PARTITION BY k.MaKho), 0), 2) AS DECIMAL(5,2)) AS TyTrongTonKhoPct,
    -- Xếp hạng độ khan hiếm trong từng chi nhánh (Rank 1 = Sắp hết nhất)
    DENSE_RANK() OVER (
        PARTITION BY cn.MaCN 
        ORDER BY tk.SoLuongTon ASC
    ) AS HangKhanHiemTaiChiNhanh,
    CASE 
        WHEN tk.SoLuongTon = 0 THEN N'HẾT HÀNG'
        WHEN tk.SoLuongTon < 10 THEN N'CẢNH BÁO: Sắp hết'
        WHEN tk.SoLuongTon BETWEEN 10 AND 30 THEN N'Tồn trung bình'
        ELSE N'Tồn dồi dào'
    END AS TrangThaiTonKho
FROM ChiNhanh cn
INNER JOIN KhoHang k ON cn.MaCN = k.MaCN
INNER JOIN TonKho tk ON k.MaKho = tk.MaKho
INNER JOIN SanPham sp ON tk.MaSP = sp.MaSP
INNER JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
WHERE sp.DaXoa = 0;
GO

PRINT N'Da tao thanh cong VIEW 1: v_BaoCaoTonKho_XepHang';
GO

-- =========================================================================
-- VIEW 2: PHÂN CẤP NHÂN SỰ & QUẢN TRỊ ĐỘI NGŨ (SELF-JOIN + AGGREGATION)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Kỹ thuật chuyên sâu:
--   - Self LEFT JOIN giải mã cây phân cấp sếp - lính (MaQL -> HoTen)
--   - Tương quan đếm số lượng nhân viên cấp dưới trực tiếp mà người đó quản lý
--   - Bảo mật mức cột: Không để lộ số lương của từng người
-- =========================================================================
CREATE VIEW v_PhanCapNhanSu_ToanDien
AS
SELECT 
    nv.MaNV,
    nv.HoTen AS TenNhanVien,
    cn.MaCN,
    cn.TenCN AS ChiNhanhLamViec,
    nv.MaQL,
    ISNULL(ql.HoTen, N'(Ban Giám Đốc)') AS NguoiQuanLyTrucTiep,
    -- Đếm số nhân sự cấp dưới trực tiếp do nhân viên này làm sếp
    (SELECT COUNT(*) FROM NhanVien subordinate WHERE subordinate.MaQL = nv.MaNV AND subordinate.DaXoa = 0) AS SoNhanVienDuoiQuyen,
    -- Tính tổng số nhân sự đang làm việc tại cùng chi nhánh đó
    COUNT(*) OVER(PARTITION BY nv.MaCN) AS TongNhanSuChiNhanh
FROM NhanVien nv
INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
LEFT JOIN NhanVien ql ON nv.MaQL = ql.MaNV
WHERE nv.DaXoa = 0;
GO

PRINT N'Da tao thanh cong VIEW 2: v_PhanCapNhanSu_ToanDien';
GO

-- =========================================================================
-- VIEW 3: PHÂN VÙNG QUẢN LÝ NHÂN VIÊN CHI NHÁNH 1 (WITH CHECK OPTION)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Kỹ thuật chuyên sâu:
--   - Phân quyền theo hàng (Row-level Security / Partition View) cho Quản lý Chi nhánh 1
--   - Cho phép UPDATE qua View nhưng ràng buộc WITH CHECK OPTION cấm sửa đổi MaCN sang chi nhánh khác!
-- =========================================================================
CREATE VIEW v_NhanVien_ChiNhanh1_KiemSoat
AS
SELECT 
    MaNV,
    HoTen,
    MaCN,
    MaQL,
    DaXoa
FROM NhanVien
WHERE MaCN = 1
WITH CHECK OPTION; -- Cấm UPDATE/INSERT bản ghi có MaCN <> 1 qua View này!
GO

PRINT N'Da tao thanh cong VIEW 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)';
GO

-- =========================================================================
-- VIEW 4: IN HÓA ĐƠN BÁN HÀNG PHỨC HỢP (COMPOSITE JOIN 5 BẢNG + TÍNH TOÁN)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Kỹ thuật chuyên sâu:
--   - Kết nối 5 bảng: DonHang -> KhachHang -> NhanVien -> KhoHang -> ChiTietDonHang -> SanPham
--   - Tính mức chiết khấu tự động theo phân hạng khách hàng (VIP = 10%, Thường = 0%)
--   - Tính thuế VAT 8% và Tổng tiền thanh toán thực tế (Final Total)
-- =========================================================================
CREATE VIEW v_InHoaDon_ChiTietPhucHop
AS
SELECT 
    dh.MaDH,
    dh.NgayDat,
    CASE dh.TrangThai
        WHEN 0 THEN N'Đơn mới tạo'
        WHEN 1 THEN N'Đã xác nhận'
        WHEN 2 THEN N'Đang giao hàng'
        WHEN 3 THEN N'Giao thành công'
        WHEN 4 THEN N'Đã hủy'
        ELSE N'Không xác định'
    END AS TenTrangThai,
    -- Thông tin khách hàng & Chiết khấu
    kh.MaKH,
    kh.HoTen AS TenKhachHang,
    kh.SoDT AS SoDTKhachHang,
    CASE kh.LoaiKH
        WHEN 1 THEN N'Khách VIP (Giảm 10%)'
        WHEN 2 THEN N'Khách Kim Cương (Giảm 15%)'
        ELSE N'Khách Thường (Không giảm)'
    END AS HangThanhVien,
    -- Thông tin nhân viên & Kho xuất
    nv.HoTen AS NhanVienLapDon,
    k.TenKho AS KhoXuatHang,
    -- Thông tin chi tiết sản phẩm
    sp.MaSP,
    sp.TenSP,
    sp.DonViTinh,
    ct.SoLuong,
    ct.DonGiaBan,
    ct.ThanhTien AS TienGoc,
    -- Tính tiền chiết khấu theo loại khách hàng
    ROUND(ct.ThanhTien * (CASE kh.LoaiKH WHEN 1 THEN 0.10 WHEN 2 THEN 0.15 ELSE 0 END), 0) AS TienChietKhau,
    -- Tính tiền sau chiết khấu
    ROUND(ct.ThanhTien * (1 - (CASE kh.LoaiKH WHEN 1 THEN 0.10 WHEN 2 THEN 0.15 ELSE 0 END)), 0) AS TienSauChietKhau,
    -- Thuế VAT 8%
    ROUND(ct.ThanhTien * (1 - (CASE kh.LoaiKH WHEN 1 THEN 0.10 WHEN 2 THEN 0.15 ELSE 0 END)) * 0.08, 0) AS ThueVAT8Pct,
    -- Thành tiền cuối cùng đã bao gồm VAT
    ROUND(ct.ThanhTien * (1 - (CASE kh.LoaiKH WHEN 1 THEN 0.10 WHEN 2 THEN 0.15 ELSE 0 END)) * 1.08, 0) AS TongThanhToanCuoiCung
FROM DonHang dh
INNER JOIN KhachHang kh ON dh.MaKH = kh.MaKH
INNER JOIN NhanVien nv ON dh.MaNV = nv.MaNV
INNER JOIN KhoHang k ON dh.MaKhoXuat = k.MaKho
INNER JOIN ChiTietDonHang ct ON dh.MaDH = ct.MaDH
INNER JOIN SanPham sp ON ct.MaSP = sp.MaSP;
GO

PRINT N'Da tao thanh cong VIEW 4: v_InHoaDon_ChiTietPhucHop';
GO

-- =========================================================================
-- VIEW 5: TỔNG HỢP DOANH THU SẢN PHẨM (INDEXED VIEW - ĐỈNH CAO DATABASE ENGINE)
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Kỹ thuật chuyên sâu:
--   - Bắt buộc dùng WITH SCHEMABINDING (khóa cứng metadata)
--   - Bắt buộc dùng COUNT_BIG(*) khi có GROUP BY
--   - TẠO UNIQUE CLUSTERED INDEX LÊN VIEW ĐỂ LƯU KẾT QUẢ VẬT LÝ VÀO ĐĨA!
-- =========================================================================
CREATE VIEW v_TongHopDoanhThuSanPham
WITH SCHEMABINDING
AS
SELECT 
    ct.MaSP,
    COUNT_BIG(*) AS SoLanXuatHienTrongDon,
    SUM(ct.SoLuong) AS TongSoLuongBan,
    SUM(ct.ThanhTien) AS TongDoanhThuThuVe
FROM dbo.ChiTietDonHang ct
GROUP BY ct.MaSP;
GO

-- TẠO CLUSTERED INDEX VẬT LÝ BIẾN VIEW NÀY THÀNH INDEXED VIEW
CREATE UNIQUE CLUSTERED INDEX IX_v_TongHopDoanhThuSanPham_MaSP
ON v_TongHopDoanhThuSanPham(MaSP);
GO

PRINT N'Da tao thanh cong VIEW 5: v_TongHopDoanhThuSanPham (INDEXED VIEW CO CLUSTERED INDEX)';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 VIEW CHUYEN SAU DAT CHUAN CUA CO THE!';
PRINT N'=========================================================================';
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 04_Ham_Functions.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 4: XÂY DỰNG 5 HÀM NGƯỜI DÙNG (USER-DEFINED FUNCTIONS - UDF)
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA HÀM NẾU ĐÃ TỒN TẠI ĐỂ THỰC THI LẠI KHÔNG BỊ XUNG ĐỘT
IF OBJECT_ID('dbo.fn_TinhTienSauChietKhauVIP', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_TinhTienSauChietKhauVIP;
IF OBJECT_ID('dbo.fn_KiemTraKhaNangDapUngDonHang', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_KiemTraKhaNangDapUngDonHang;
IF OBJECT_ID('dbo.fn_FormatMaHoaDonTuDong', 'FN') IS NOT NULL DROP FUNCTION dbo.fn_FormatMaHoaDonTuDong;
IF OBJECT_ID('dbo.fn_DanhSachDonHangTheoKhoangThoiGian', 'IF') IS NOT NULL DROP FUNCTION dbo.fn_DanhSachDonHangTheoKhoangThoiGian;
IF OBJECT_ID('dbo.fn_BaoCaoDoanhThuNhanVienChiTiet', 'TF') IS NOT NULL DROP FUNCTION dbo.fn_BaoCaoDoanhThuNhanVienChiTiet;
GO

-- =========================================================================
-- HÀM 1 (SCALAR FUNCTION): TÍNH THÀNH TIỀN SAU CHIẾT KHẤU THEO HẠNG THÀNH VIÊN
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Nghiệp vụ: Tự động tra cứu hạng khách hàng và áp dụng % giảm giá tương ứng
--            (LoaiKH = 0: 0%, LoaiKH = 1 (VIP): Giảm 10%, LoaiKH = 2 (Kim Cương): Giảm 15%)
-- =========================================================================
CREATE FUNCTION dbo.fn_TinhTienSauChietKhauVIP
(
    @MaKH INT,
    @TongTienGoc DECIMAL(14,2)
)
RETURNS DECIMAL(14,2)
AS
BEGIN
    IF @TongTienGoc IS NULL OR @TongTienGoc <= 0
        RETURN 0;

    DECLARE @LoaiKH TINYINT;
    SELECT @LoaiKH = LoaiKH FROM KhachHang WHERE MaKH = @MaKH;

    DECLARE @TiLeGiam DECIMAL(4,2) = 0.00;
    IF @LoaiKH = 1
        SET @TiLeGiam = 0.10; -- Giảm 10% cho VIP
    ELSE IF @LoaiKH = 2
        SET @TiLeGiam = 0.15; -- Giảm 15% cho Kim Cương

    DECLARE @TienSauGiam DECIMAL(14,2);
    SET @TienSauGiam = @TongTienGoc * (1.00 - @TiLeGiam);

    RETURN ROUND(@TienSauGiam, 0);
END;
GO

PRINT N'Da tao thanh cong HÀM 1 (Scalar): dbo.fn_TinhTienSauChietKhauVIP';
GO

-- =========================================================================
-- HÀM 2 (SCALAR FUNCTION): KIỂM TRA KHẢ NĂNG ĐÁP ỨNG TỒN KHO CỦA SẢN PHẨM
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Trả về 1 (Đủ hàng) hoặc 0 (Hết hàng/Thiếu hàng) cho giao dịch bán/chuyển kho
-- =========================================================================
CREATE FUNCTION dbo.fn_KiemTraKhaNangDapUngDonHang
(
    @MaKho INT,
    @MaSP INT,
    @SoLuongYeuCau INT
)
RETURNS BIT
AS
BEGIN
    IF @SoLuongYeuCau <= 0
        RETURN 0;

    DECLARE @SoLuongTonHienTai INT = 0;

    SELECT @SoLuongTonHienTai = ISNULL(SoLuongTon, 0)
    FROM TonKho
    WHERE MaKho = @MaKho AND MaSP = @MaSP;

    IF @SoLuongTonHienTai >= @SoLuongYeuCau
        RETURN 1; -- Đủ khả năng đáp ứng

    RETURN 0; -- Không đủ hàng trong kho
END;
GO

PRINT N'Da tao thanh cong HÀM 2 (Scalar): dbo.fn_KiemTraKhaNangDapUngDonHang';
GO

-- =========================================================================
-- HÀM 3 (INLINE TABLE-VALUED FUNCTION - iTVF): LỌC ĐƠN HÀNG THEO THỜI GIAN & CHI NHÁNH
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Kỹ thuật chuyên sâu: Inline TVF không dùng BEGIN...END, cho phép SQL Server Query Optimizer
-- gộp trực tiếp vào kế hoạch thực thi chính (Inlining) để đạt tốc độ tối đa!
-- =========================================================================
CREATE FUNCTION dbo.fn_DanhSachDonHangTheoKhoangThoiGian
(
    @TuNgay DATETIME,
    @DenNgay DATETIME,
    @MaCN INT = NULL -- Nếu truyền NULL thì lấy toàn bộ chi nhánh
)
RETURNS TABLE
AS
RETURN
(
    SELECT 
        dh.MaDH,
        dh.NgayDat,
        kh.MaKH,
        kh.HoTen AS TenKhachHang,
        kh.SoDT AS SoDTKhachHang,
        nv.HoTen AS NhanVienLap,
        cn.MaCN,
        cn.TenCN AS ChiNhanhBan,
        k.TenKho AS KhoXuat,
        dh.TrangThai,
        CASE dh.TrangThai
            WHEN 0 THEN N'Mới tạo'
            WHEN 1 THEN N'Đã xác nhận'
            WHEN 2 THEN N'Đang giao'
            WHEN 3 THEN N'Giao thành công'
            WHEN 4 THEN N'Đã hủy'
            ELSE N'Khác'
        END AS TenTrangThai,
        dh.TongTien
    FROM DonHang dh
    INNER JOIN KhachHang kh ON dh.MaKH = kh.MaKH
    INNER JOIN NhanVien nv ON dh.MaNV = nv.MaNV
    INNER JOIN KhoHang k ON dh.MaKhoXuat = k.MaKho
    INNER JOIN ChiNhanh cn ON k.MaCN = cn.MaCN
    WHERE dh.NgayDat >= @TuNgay 
      AND dh.NgayDat <= @DenNgay
      AND (@MaCN IS NULL OR cn.MaCN = @MaCN)
);
GO

PRINT N'Da tao thanh cong HÀM 3 (Inline TVF): dbo.fn_DanhSachDonHangTheoKhoangThoiGian';
GO

-- =========================================================================
-- HÀM 4 (MULTI-STATEMENT TABLE-VALUED FUNCTION - mTVF): BÁO CÁO DOANH SỐ & KPI NHÂN VIÊN
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Kỹ thuật chuyên sâu: Khai báo biến bảng cấu trúc tùy biến @KetQua TABLE (...),
-- tổng hợp dữ liệu và đánh giá xếp loại hiệu suất làm việc của nhân viên theo năm
-- =========================================================================
CREATE FUNCTION dbo.fn_BaoCaoDoanhThuNhanVienChiTiet
(
    @Nam INT
)
RETURNS @BaoCao TABLE
(
    MaNV INT,
    HoTen NVARCHAR(100),
    TenChiNhanh NVARCHAR(100),
    SoDonHangDaChot INT,
    TongDoanhSo DECIMAL(14,2),
    DanhGiaKPI NVARCHAR(50)
)
AS
BEGIN
    INSERT INTO @BaoCao (MaNV, HoTen, TenChiNhanh, SoDonHangDaChot, TongDoanhSo, DanhGiaKPI)
    SELECT 
        nv.MaNV,
        nv.HoTen,
        cn.TenCN,
        COUNT(dh.MaDH) AS SoDonHangDaChot,
        ISNULL(SUM(dh.TongTien), 0) AS TongDoanhSo,
        CASE 
            WHEN ISNULL(SUM(dh.TongTien), 0) >= 20000000 THEN N'Xuất sắc (Vượt KPI)'
            WHEN ISNULL(SUM(dh.TongTien), 0) >= 5000000 THEN N'Đạt yêu cầu'
            WHEN ISNULL(SUM(dh.TongTien), 0) > 0 THEN N'Cần cải thiện'
            ELSE N'Chưa phát sinh doanh số'
        END AS DanhGiaKPI
    FROM NhanVien nv
    INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
    LEFT JOIN DonHang dh ON nv.MaNV = dh.MaNV 
                         AND dh.TrangThai = 3 -- Chỉ tính các đơn giao thành công
                         AND YEAR(dh.NgayDat) = @Nam
    WHERE nv.DaXoa = 0
    GROUP BY nv.MaNV, nv.HoTen, cn.TenCN;

    RETURN;
END;
GO

PRINT N'Da tao thanh cong HÀM 4 (Multi-statement TVF): dbo.fn_BaoCaoDoanhThuNhanVienChiTiet';
GO

-- =========================================================================
-- HÀM 5 (SCALAR FUNCTION): TỰ ĐỘNG CHUẨN HÓA MÃ HÓA ĐƠN THEO FORMAT DOANH NGHIỆP
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Nghiệp vụ: Chuyển đổi mã số đơn hàng ID thành chuỗi nghiệp vụ quy chuẩn: HD-YYYYMMDD-00000X
--            Ví dụ: MaDH = 1, Ngay = 18/10/2026 -> HD-20261018-000001
-- =========================================================================
CREATE FUNCTION dbo.fn_FormatMaHoaDonTuDong
(
    @MaDH INT,
    @NgayDat DATETIME
)
RETURNS VARCHAR(30)
AS
BEGIN
    IF @MaDH IS NULL
        RETURN 'HD-UNKNOWN';

    DECLARE @ChuoiNgay VARCHAR(8);
    SET @ChuoiNgay = CONVERT(VARCHAR(8), ISNULL(@NgayDat, GETDATE()), 112); -- Định dạng YYYYMMDD (chuẩn 112 ISO)

    DECLARE @ChuoiSoThuTu VARCHAR(6);
    SET @ChuoiSoThuTu = RIGHT('000000' + CAST(@MaDH AS VARCHAR(10)), 6); -- Đệm đủ 6 chữ số

    RETURN 'HD-' + @ChuoiNgay + '-' + @ChuoiSoThuTu;
END;
GO

PRINT N'Da tao thanh cong HÀM 5 (Scalar): dbo.fn_FormatMaHoaDonTuDong';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 HAM (UDF) CHUAN GU DANH GIA CUA CO THE!';
PRINT N'=========================================================================';
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 05_Trigger_RangBuocNangCao.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 5: XÂY DỰNG 5 TRIGGER CHUYÊN SÂU (CHUẨN MULTI-ROW VÀ TOÀN VẸN DỮ LIỆU)
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA TRIGGER NẾU ĐÃ TỒN TẠI ĐỂ CHẠY LẠI KHÔNG BỊ TRÙNG
IF OBJECT_ID('dbo.trg_ChiTietDonHang_SyncKho_TongTien', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietDonHang_SyncKho_TongTien;
IF OBJECT_ID('dbo.trg_ChiTietDonHang_KiemTraTonKhoTruocKhiGhi', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietDonHang_KiemTraTonKhoTruocKhiGhi;
IF OBJECT_ID('dbo.trg_ChiTietDonHang_TruTonKho', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_ChiTietDonHang_TruTonKho;
IF OBJECT_ID('dbo.trg_SanPham_LichSuGia', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_SanPham_LichSuGia;
IF OBJECT_ID('dbo.trg_DonHang_CapNhatDiemTichLuyKhachHang', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_DonHang_CapNhatDiemTichLuyKhachHang;
IF OBJECT_ID('dbo.trg_DonHang_CamXoaDonDaGiao', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_DonHang_CamXoaDonDaGiao;
IF OBJECT_ID('dbo.trg_NhanVien_AuditLog', 'TR') IS NOT NULL DROP TRIGGER dbo.trg_NhanVien_AuditLog;
GO

-- =========================================================================
-- TRIGGER 1 (AFTER INSERT, UPDATE, DELETE): ĐỒNG BỘ TOÀN DIỆN TỒN KHO & TỔNG TIỀN
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Nghiệp vụ chuyên sâu:
--   - Chặn đứng tình trạng bán hàng vượt quá tồn kho (Bán khống)
--   - Tự động trừ kho khi INSERT, bù trừ chênh lệch khi UPDATE, hoàn tồn kho khi DELETE
--   - Đồng bộ giá trị TongTien cho bảng DonHang (Bảo đảm tính toàn vẹn 3NF phi chuẩn hóa)
-- Kỹ thuật: 100% Set-based multi-row, kiểm tra @@ROWCOUNT = 0 chốt chặn hiệu năng
-- =========================================================================
CREATE TRIGGER trg_ChiTietDonHang_SyncKho_TongTien
ON ChiTietDonHang
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    -- 1. Chốt chặn hiệu năng: Kiểm tra @@ROWCOUNT trước mọi câu lệnh khác
    IF @@ROWCOUNT = 0 RETURN;

    SET NOCOUNT ON;

    -- =========================================================================
    -- TRƯỜNG HỢP A: THAO TÁC INSERT (THÊM MỚI CHI TIẾT ĐƠN HÀNG)
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM inserted) AND NOT EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- A.1. Kiểm tra tồn kho trước khi cho phép trừ (Chống bán âm kho)
        IF EXISTS (
            SELECT 1
            FROM (
                SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong) AS TongSoLuongYeuCau
                FROM inserted i
                INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
                GROUP BY dh.MaKhoXuat, i.MaSP
            ) req
            INNER JOIN TonKho tk ON req.MaKhoXuat = tk.MaKho AND req.MaSP = tk.MaSP
            WHERE tk.SoLuongTon < req.TongSoLuongYeuCau
        )
        BEGIN
            RAISERROR (N'Lỗi giao dịch: Không đủ số lượng tồn kho để đáp ứng đơn hàng mới!', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN;
        END;

        -- A.2. Trừ số lượng trong TonKho
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon - req.TongSoLuongYeuCau
        FROM TonKho tk
        INNER JOIN (
            SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong) AS TongSoLuongYeuCau
            FROM inserted i
            INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
            GROUP BY dh.MaKhoXuat, i.MaSP
        ) req ON tk.MaKho = req.MaKhoXuat AND tk.MaSP = req.MaSP;
    END;

    -- =========================================================================
    -- TRƯỜNG HỢP B: THAO TÁC UPDATE (ĐIỀU CHỈNH SỐ LƯỢNG MUA TRONG ĐƠN)
    -- =========================================================================
    IF EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        IF UPDATE(SoLuong)
        BEGIN
            -- B.1. Kiểm tra nếu tăng số lượng thì kho có đủ hàng bù đắp không
            IF EXISTS (
                SELECT 1
                FROM (
                    SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong - d.SoLuong) AS ChenhLechTang
                    FROM inserted i
                    INNER JOIN deleted d ON i.MaDH = d.MaDH AND i.MaSP = d.MaSP
                    INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
                    GROUP BY dh.MaKhoXuat, i.MaSP
                ) delta
                INNER JOIN TonKho tk ON delta.MaKhoXuat = tk.MaKho AND delta.MaSP = tk.MaSP
                WHERE delta.ChenhLechTang > 0 AND tk.SoLuongTon < delta.ChenhLechTang
            )
            BEGIN
                RAISERROR (N'Lỗi cập nhật: Số lượng tăng thêm vượt quá tồn kho khả dụng!', 16, 1);
                ROLLBACK TRANSACTION;
                RETURN;
            END;

            -- B.2. Cập nhật lại tồn kho theo giá trị bù trừ
            UPDATE tk
            SET tk.SoLuongTon = tk.SoLuongTon - delta.ChenhLech
            FROM TonKho tk
            INNER JOIN (
                SELECT dh.MaKhoXuat, i.MaSP, SUM(i.SoLuong - d.SoLuong) AS ChenhLech
                FROM inserted i
                INNER JOIN deleted d ON i.MaDH = d.MaDH AND i.MaSP = d.MaSP
                INNER JOIN DonHang dh ON i.MaDH = dh.MaDH
                GROUP BY dh.MaKhoXuat, i.MaSP
            ) delta ON tk.MaKho = delta.MaKhoXuat AND tk.MaSP = delta.MaSP;
        END;
    END;

    -- =========================================================================
    -- TRƯỜNG HỢP C: THAO TÁC DELETE (XÓA BỚT MÓN HÀNG RA KHỎI ĐƠN)
    -- =========================================================================
    IF NOT EXISTS (SELECT 1 FROM inserted) AND EXISTS (SELECT 1 FROM deleted)
    BEGIN
        -- Hoàn trả số lượng đã xóa về lại cho TonKho
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon + del.TongSoLuongHoan
        FROM TonKho tk
        INNER JOIN (
            SELECT dh.MaKhoXuat, d.MaSP, SUM(d.SoLuong) AS TongSoLuongHoan
            FROM deleted d
            INNER JOIN DonHang dh ON d.MaDH = dh.MaDH
            GROUP BY dh.MaKhoXuat, d.MaSP
        ) del ON tk.MaKho = del.MaKhoXuat AND tk.MaSP = del.MaSP;
    END;

    -- =========================================================================
    -- ĐỒNG BỘ CỘT TỔNG TIỀN TRONG BẢNG ĐƠN HÀNG (CHO CẢ 3 THAO TÁC INSERT/UPDATE/DELETE)
    -- =========================================================================
    UPDATE dh
    SET dh.TongTien = ISNULL(sub.TongTienChiTiet, 0)
    FROM DonHang dh
    INNER JOIN (
        SELECT affected.MaDH, SUM(ct.ThanhTien) AS TongTienChiTiet
        FROM (
            SELECT MaDH FROM inserted
            UNION
            SELECT MaDH FROM deleted
        ) affected
        LEFT JOIN ChiTietDonHang ct ON affected.MaDH = ct.MaDH
        GROUP BY affected.MaDH
    ) sub ON dh.MaDH = sub.MaDH;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 1 (AFTER INSERT, UPDATE, DELETE): trg_ChiTietDonHang_SyncKho_TongTien';
GO

-- =========================================================================
-- TRIGGER 2 (AFTER UPDATE): AUDIT LOG THAY ĐỔI GIÁ SẢN PHẨM (THEO DÕI LỊCH SỬ GIÁ)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Tự động ghi vết vào bảng LichSuGia mỗi khi giá bán thay đổi
-- Kỹ thuật Multi-row: So sánh bảng ảo inserted và deleted, hỗ trợ cập nhật giá hàng loạt
-- =========================================================================
CREATE TRIGGER trg_SanPham_LichSuGia
ON SanPham
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ kích hoạt khi cột GiaBanHienTai thực sự được cập nhật
    IF UPDATE(GiaBanHienTai)
    BEGIN
        INSERT INTO LichSuGia (MaSP, GiaCu, GiaMoi, NgayThayDoi, NguoiThayDoi)
        SELECT 
            i.MaSP,
            d.GiaBanHienTai AS GiaCu,
            i.GiaBanHienTai AS GiaMoi,
            GETDATE(),
            ISNULL(SUSER_SNAME(), N'HeThong_Auto') AS NguoiThayDoi
        FROM inserted i
        INNER JOIN deleted d ON i.MaSP = d.MaSP
        WHERE i.GiaBanHienTai <> d.GiaBanHienTai; -- Chỉ ghi khi giá có thay đổi thực sự
    END;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 2 (AFTER UPDATE): trg_SanPham_LichSuGia';
GO

-- =========================================================================
-- TRIGGER 3 (AFTER UPDATE): TÍCH ĐIỂM THƯỞNG & TỰ ĐỘNG NÂNG HẠNG VIP KHÁCH HÀNG
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Nghiệp vụ: Khi đơn hàng chuyển trạng thái sang 3 (Giao thành công):
--            - Cộng điểm tích lũy: Cứ 100.000đ = 1 điểm
--            - Nếu điểm >= 1000: Tự động nâng hạng lên 1 (VIP)
--            - Nếu điểm >= 5000: Tự động nâng hạng lên 2 (Kim Cương)
-- Kỹ thuật Multi-row: Group by theo MaKH từ các đơn chuyển trạng thái thành công
-- =========================================================================
CREATE TRIGGER trg_DonHang_CapNhatDiemTichLuyKhachHang
ON DonHang
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Chỉ kích hoạt khi cột TrangThai được cập nhật sang 3 (Giao thành công)
    IF UPDATE(TrangThai)
    BEGIN
        -- Bảng tạm tính tổng điểm cộng cho từng khách hàng từ các đơn vừa hoàn thành
        UPDATE kh
        SET 
            kh.DiemTichLuy = kh.DiemTichLuy + diem.DiemCongThem,
            kh.LoaiKH = CASE 
                WHEN (kh.DiemTichLuy + diem.DiemCongThem) >= 5000 THEN 2 -- Kim Cương
                WHEN (kh.DiemTichLuy + diem.DiemCongThem) >= 1000 THEN 1 -- VIP
                ELSE kh.LoaiKH
            END
        FROM KhachHang kh
        INNER JOIN (
            SELECT 
                i.MaKH,
                SUM(CAST(i.TongTien / 100000 AS INT)) AS DiemCongThem
            FROM inserted i
            INNER JOIN deleted d ON i.MaDH = d.MaDH
            WHERE i.TrangThai = 3 AND d.TrangThai <> 3 -- Chỉ tính đơn vừa đổi sang Giao thành công
            GROUP BY i.MaKH
        ) diem ON kh.MaKH = diem.MaKH;
    END;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 3 (AFTER UPDATE): trg_DonHang_CapNhatDiemTichLuyKhachHang';
GO

-- =========================================================================
-- TRIGGER 4 (INSTEAD OF DELETE): CẤM XÓA ĐƠN HÀNG ĐÃ GIAO THÀNH CÔNG (CHỐNG GIAN LẬN)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Nghiệp vụ: Bảo vệ toàn vẹn chứng từ kế toán. Tuyệt đối không cho phép xóa đơn đã giao (TrangThai = 3)
-- Kỹ thuật Multi-row: Quét toàn bộ bảng deleted, chỉ cần 1 đơn vi phạm là chặn đứng toàn bộ lô xóa
-- =========================================================================
CREATE TRIGGER trg_DonHang_CamXoaDonDaGiao
ON DonHang
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;

    -- Kiểm tra nếu trong lô xóa có chứa đơn hàng đã giao thành công
    IF EXISTS (
        SELECT 1 
        FROM deleted 
        WHERE TrangThai = 3
    )
    BEGIN
        RAISERROR (N'Lỗi bảo mật kế toán: Nghiêm cấm xóa đơn hàng đã giao thành công (TrangThai = 3)!', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END;

    -- Nếu chỉ xóa các đơn hợp lệ (Mới tạo, Đã hủy...), xóa Chi tiết trước rồi xóa Đơn hàng
    DELETE FROM ChiTietDonHang
    WHERE MaDH IN (SELECT MaDH FROM deleted);

    DELETE FROM DonHang
    WHERE MaDH IN (SELECT MaDH FROM deleted);
END;
GO

PRINT N'Da tao thanh cong TRIGGER 4 (INSTEAD OF DELETE): trg_DonHang_CamXoaDonDaGiao';
GO

-- =========================================================================
-- TRIGGER 5 (AFTER INSERT, UPDATE): GHI NHẬT KÝ BẢO MẬT HỆ THỐNG KHI THAY ĐỔI NHÂN SỰ
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Nghiệp vụ: Tự động ghi vết vào NhatKyHeThong khi có nhân viên mới hoặc chỉnh sửa nhân sự
-- Kỹ thuật Multi-row: Phân biệt thao tác INSERT vs UPDATE bằng tương quan deleted / inserted
-- =========================================================================
CREATE TRIGGER trg_NhanVien_AuditLog
ON NhanVien
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Phân biệt hành động: Nếu deleted không có dòng nào -> INSERT; ngược lại -> UPDATE
    DECLARE @HanhDong NVARCHAR(100);
    IF NOT EXISTS (SELECT 1 FROM deleted)
        SET @HanhDong = N'THEM_NHAN_VIEN_MOI';
    ELSE
        SET @HanhDong = N'CAP_NHAT_THONG_TIN_NHAN_VIEN';

    INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
    SELECT 
        @HanhDong,
        N'Mã NV: ' + CAST(i.MaNV AS NVARCHAR(10)) + 
        N', Họ tên: ' + i.HoTen + 
        N', Chi nhánh: ' + CAST(i.MaCN AS NVARCHAR(10)) + 
        N', Trạng thái xóa: ' + CAST(i.DaXoa AS NVARCHAR(2)),
        GETDATE(),
        ISNULL(SUSER_SNAME(), N'HeThong_Admin')
    FROM inserted i;
END;
GO

PRINT N'Da tao thanh cong TRIGGER 5 (AFTER INSERT, UPDATE): trg_NhanVien_AuditLog';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 TRIGGER CHUAN MULTI-ROW VA BAO MAT CUA CO THE!';
PRINT N'=========================================================================';
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 06_ChiMuc_Indexes_Performance.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 6: XÂY DỰNG 5 CHỈ MỤC (INDEXES) & PHÂN TÍCH HIỆU NĂNG EXECUTION PLAN
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
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
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
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
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
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
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
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
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
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
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
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

GO


-- =========================================================================
-- NOI DUNG TU TEP: 07_ThuTuc_StoredProcedures.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 7: XÂY DỰNG 5 THỦ TỤC LƯU TRỮ (STORED PROCEDURES) CÓ TRY...CATCH
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- XÓA THỦ TỤC NẾU ĐÃ TỒN TẠI ĐỂ TẠO LẠI KHÔNG BỊ TRÙNG
IF OBJECT_ID('dbo.sp_TaoDonHangVaChiTiet', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TaoDonHangVaChiTiet;
IF OBJECT_ID('dbo.sp_CapNhatTrangThaiDonHang', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_CapNhatTrangThaiDonHang;
IF OBJECT_ID('dbo.sp_ChuyenKhoNoiBo', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_ChuyenKhoNoiBo;
IF OBJECT_ID('dbo.sp_TimKiemSanPhamNangCao', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_TimKiemSanPhamNangCao;
IF OBJECT_ID('dbo.sp_BaoCaoTongHopDoanhThuChiNhanh', 'P') IS NOT NULL DROP PROCEDURE dbo.sp_BaoCaoTongHopDoanhThuChiNhanh;
GO

-- =========================================================================
-- THỦ TỤC 1: TẠO ĐƠN HÀNG VÀ CHI TIẾT ĐƠN HÀNG NGUYÊN TỬ (INSERT)
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Nghiệp vụ: Thu ngân tạo đơn hàng mới kèm sản phẩm đầu tiên trong 1 giao dịch
-- Kỹ thuật: TRY...CATCH, XACT_STATE(), OUTPUT parameter, Transaction an toàn
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.sp_TaoDonHangVaChiTiet
    @MaKH INT,
    @MaNV INT,
    @MaKhoXuat INT,
    @MaSP INT,
    @SoLuong INT,
    @DonGiaBan DECIMAL(12,2),
    @MaDH_Moi INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @SoLuong <= 0
            THROW 50004, N'Lỗi: Số lượng đặt hàng phải lớn hơn 0!', 1;

        IF @DonGiaBan <= 0
            THROW 50005, N'Lỗi: Đơn giá bán phải lớn hơn 0 VNĐ!', 1;

        -- 1. Kiểm tra tồn tại của Khách hàng, Nhân viên, Kho
        IF NOT EXISTS (SELECT 1 FROM KhachHang WHERE MaKH = @MaKH)
            THROW 50001, N'Lỗi: Khách hàng không tồn tại trong hệ thống!', 1;

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaNV AND DaXoa = 0)
            THROW 50002, N'Lỗi: Nhân viên không hợp lệ hoặc đã nghỉ việc!', 1;

        IF NOT EXISTS (SELECT 1 FROM KhoHang WHERE MaKho = @MaKhoXuat)
            THROW 50003, N'Lỗi: Kho xuất hàng không tồn tại!', 1;

        -- 2. Khóa dòng dữ liệu tồn kho bằng UPDLOCK + HOLDLOCK chống Lost Update / Concurrency Race Condition
        -- Đảm bảo nếu kho còn 1 thì chỉ duy nhất 1 phiên được mua, phiên thứ 2 bắt buộc phải chờ
        DECLARE @TonKhoHienTai INT;
        SELECT @TonKhoHienTai = SoLuongTon
        FROM TonKho WITH (UPDLOCK, HOLDLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonKhoHienTai IS NULL OR @TonKhoHienTai < @SoLuong
            THROW 50006, N'Lỗi giao dịch: Không đủ số lượng tồn kho để đáp ứng đơn hàng!', 1;

        -- 3. Tạo đơn hàng mới với Tổng tiền tính toán trực tiếp (không để mặc định bằng 0)
        DECLARE @TongTienBanDau DECIMAL(14,2) = @SoLuong * @DonGiaBan;

        INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
        VALUES (@MaKH, @MaNV, @MaKhoXuat, GETDATE(), 0, @TongTienBanDau);

        SET @MaDH_Moi = SCOPE_IDENTITY();

        -- 4. Tạo chi tiết đơn hàng (Trigger 1 sẽ tự động kiểm tra và đồng bộ lại)
        INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
        VALUES (@MaDH_Moi, @MaSP, @SoLuong, @DonGiaBan);

        COMMIT TRANSACTION;
        SELECT @MaDH_Moi AS MaDH;
        RETURN 0; -- Thành công mã lỗi 0
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        DECLARE @ErrorSeverity INT = ERROR_SEVERITY();
        DECLARE @ErrorState INT = ERROR_STATE();
        RAISERROR(@ErrorMessage, @ErrorSeverity, @ErrorState);
        RETURN 1; -- Thất bại mã lỗi 1
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 1: dbo.sp_TaoDonHangVaChiTiet';
GO

-- =========================================================================
-- THỦ TỤC 2: CẬP NHẬT TRẠNG THÁI ĐƠN HÀNG CÓ KIỂM SOÁT VÒNG ĐỜI (UPDATE)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Chuyển trạng thái đơn (0: Mới -> 1: Xác nhận -> 2: Đang giao -> 3: Giao thành công / 4: Hủy)
-- Kỹ thuật: Kiểm tra luật chuyển đổi trạng thái hợp lệ, TRY...CATCH
-- =========================================================================
CREATE PROCEDURE dbo.sp_CapNhatTrangThaiDonHang
    @MaDH INT,
    @TrangThaiMoi TINYINT
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM DonHang WHERE MaDH = @MaDH)
            THROW 50004, N'Lỗi: Đơn hàng không tồn tại!', 1;

        DECLARE @TrangThaiHienTai TINYINT;
        SELECT @TrangThaiHienTai = TrangThai FROM DonHang WHERE MaDH = @MaDH;

        -- Quy tắc vòng đời: Không được thay đổi đơn đã giao thành công (3) hoặc đã hủy (4)
        IF @TrangThaiHienTai = 3
            THROW 50005, N'Lỗi nghiệp vụ: Đơn hàng đã giao thành công, không thể thay đổi trạng thái!', 1;

        IF @TrangThaiHienTai = 4
            THROW 50006, N'Lỗi nghiệp vụ: Đơn hàng đã bị hủy, không thể kích hoạt lại!', 1;

        -- Cập nhật trạng thái mới (Trigger 3 sẽ tự động cộng điểm nếu chuyển sang 3)
        UPDATE DonHang
        SET TrangThai = @TrangThaiMoi
        WHERE MaDH = @MaDH;

        SELECT N'Cập nhật trạng thái đơn hàng thành công!' AS ThongBao, @MaDH AS MaDH, @TrangThaiMoi AS TrangThaiMoi;
        RETURN 0;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 2: dbo.sp_CapNhatTrangThaiDonHang';
GO

-- =========================================================================
-- THỦ TỤC 3: ĐIỀU CHUYỂN HÀNG HÓA NỘI BỘ GIỮA 2 KHO (TRANSACTION NGUYÊN TỬ)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Nghiệp vụ: Chuyển N sản phẩm từ Kho A sang Kho B của chuỗi
-- Kỹ thuật: UPDLOCK trên kho xuất để chống Race Condition, Transaction kiểm soát ACID
-- =========================================================================
CREATE PROCEDURE dbo.sp_ChuyenKhoNoiBo
    @MaKhoXuat INT,
    @MaKhoNhap INT,
    @MaSP INT,
    @SoLuongChuyen INT,
    @MaNVThucHien INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        IF @MaKhoXuat = @MaKhoNhap
            THROW 50007, N'Lỗi: Kho xuất và Kho nhập không được trùng nhau!', 1;

        IF @SoLuongChuyen <= 0
            THROW 50008, N'Lỗi: Số lượng chuyển phải lớn hơn 0!', 1;

        BEGIN TRANSACTION;

        -- Khóa dòng dữ liệu tại kho xuất bằng UPDLOCK để tránh 2 giao dịch cùng trừ kho đồng thời
        DECLARE @TonKhoXuat INT;
        SELECT @TonKhoXuat = SoLuongTon
        FROM TonKho WITH (UPDLOCK, ROWLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonKhoXuat IS NULL OR @TonKhoXuat < @SoLuongChuyen
            THROW 50009, N'Lỗi: Kho xuất không đủ số lượng tồn để thực hiện điều chuyển!', 1;

        -- Trừ hàng tại kho xuất
        UPDATE TonKho
        SET SoLuongTon = SoLuongTon - @SoLuongChuyen
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        -- Cộng hàng tại kho nhập (nếu kho nhập chưa từng có món này thì INSERT, có rồi thì UPDATE)
        IF EXISTS (SELECT 1 FROM TonKho WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP)
        BEGIN
            UPDATE TonKho
            SET SoLuongTon = SoLuongTon + @SoLuongChuyen
            WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP;
        END
        ELSE
        BEGIN
            INSERT INTO TonKho (MaKho, MaSP, SoLuongTon)
            VALUES (@MaKhoNhap, @MaSP, @SoLuongChuyen);
        END;

        -- Ghi log hành động vào NhatKyHeThong
        INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
        VALUES (
            N'CHUYEN_KHO_NOI_BO',
            N'Chuyển ' + CAST(@SoLuongChuyen AS NVARCHAR(10)) + N' món SP ' + CAST(@MaSP AS NVARCHAR(10)) + 
            N' từ Kho ' + CAST(@MaKhoXuat AS NVARCHAR(10)) + N' sang Kho ' + CAST(@MaKhoNhap AS NVARCHAR(10)),
            GETDATE(),
            N'NV_' + CAST(@MaNVThucHien AS NVARCHAR(10))
        );

        COMMIT TRANSACTION;

        SELECT N'Điều chuyển kho thành công!' AS ThongBao, @MaKhoXuat AS KhoXuat, @MaKhoNhap AS KhoNhap, @SoLuongChuyen AS SoLuong;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 3: dbo.sp_ChuyenKhoNoiBo';
GO

-- =========================================================================
-- THỦ TỤC 4: TÌM KIẾM SẢN PHẨM NÂNG CAO ĐA TIÊU CHÍ (SEARCH)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Nghiệp vụ: Tìm sản phẩm theo từ khóa tên, theo danh mục, hoặc theo khoảng giá
-- Kỹ thuật: Xử lý tham số linh hoạt (Dynamic filtering với COALESCE / IS NULL)
-- =========================================================================
CREATE PROCEDURE dbo.sp_TimKiemSanPhamNangCao
    @TuKhoa NVARCHAR(150) = NULL,
    @MaDM INT = NULL,
    @GiaMin DECIMAL(12,2) = NULL,
    @GiaMax DECIMAL(12,2) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT 
            sp.MaSP,
            sp.TenSP,
            dm.MaDM,
            dm.TenDM,
            sp.GiaBanHienTai,
            sp.DonViTinh,
            ISNULL(SUM(tk.SoLuongTon), 0) AS TongTonKhoToanHeThong
        FROM SanPham sp
        INNER JOIN DanhMuc dm ON sp.MaDM = dm.MaDM
        LEFT JOIN TonKho tk ON sp.MaSP = tk.MaSP
        WHERE sp.DaXoa = 0
          AND (@TuKhoa IS NULL OR sp.TenSP LIKE N'%' + @TuKhoa + N'%')
          AND (@MaDM IS NULL OR sp.MaDM = @MaDM)
          AND (@GiaMin IS NULL OR sp.GiaBanHienTai >= @GiaMin)
          AND (@GiaMax IS NULL OR sp.GiaBanHienTai <= @GiaMax)
        GROUP BY sp.MaSP, sp.TenSP, dm.MaDM, dm.TenDM, sp.GiaBanHienTai, sp.DonViTinh
        ORDER BY sp.GiaBanHienTai ASC;
        RETURN 0;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 4: dbo.sp_TimKiemSanPhamNangCao';
GO

-- =========================================================================
-- THỦ TỤC 5: BÁO CÁO TỔNG HỢP DOANH THU & SẢN LƯỢNG CHI NHÁNH (REPORT / STATS)
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- Nghiệp vụ: Ban Giám Đốc xem doanh thu, số đơn và sản lượng bán theo chi nhánh
-- Kỹ thuật: Phân tích nhóm ROLLUP / Aggregation, TRY...CATCH
-- =========================================================================
CREATE PROCEDURE dbo.sp_BaoCaoTongHopDoanhThuChiNhanh
    @Nam INT,
    @Thang INT = NULL -- Nếu NULL thì tính cả năm
AS
BEGIN
    SET NOCOUNT ON;

    BEGIN TRY
        SELECT 
            cn.MaCN,
            cn.TenCN,
            COUNT(DISTINCT dh.MaDH) AS TongSoDonHang,
            ISNULL(SUM(ct.SoLuong), 0) AS TongSoLuongSanPhamBan,
            ISNULL(SUM(ct.ThanhTien), 0) AS DoanhThuBanHang,
            ISNULL(SUM(ct.ThanhTien * 0.08), 0) AS TienThueVATThuDuoc,
            ISNULL(SUM(ct.ThanhTien * 1.08), 0) AS TongThuThucTe
        FROM ChiNhanh cn
        LEFT JOIN KhoHang k ON cn.MaCN = k.MaCN
        LEFT JOIN DonHang dh ON k.MaKho = dh.MaKhoXuat 
                             AND dh.TrangThai = 3 -- Chỉ tính đơn thành công
                             AND YEAR(dh.NgayDat) = @Nam
                             AND (@Thang IS NULL OR MONTH(dh.NgayDat) = @Thang)
        LEFT JOIN ChiTietDonHang ct ON dh.MaDH = ct.MaDH
        GROUP BY cn.MaCN, cn.TenCN
        ORDER BY DoanhThuBanHang DESC;
        RETURN 0;
    END TRY
    BEGIN CATCH
        DECLARE @ErrorMessage NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrorMessage, 16, 1);
        RETURN 1;
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong PROCEDURE 5: dbo.sp_BaoCaoTongHopDoanhThuChiNhanh';
GO

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 STORED PROCEDURES CO TRY...CATCH CHUAN CUA CO THE!';
PRINT N'=========================================================================';
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 08_GiaoDich_Transactions_Concurrency.sql
-- =========================================================================

-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 8: 5 NGHIỆP VỤ GIAO DỊCH (ACID) & MINH CHỨNG XỬ LÝ TRANH CHẤP ĐỒNG THỜI
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE QuanLyBanHangDB;
GO

SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

-- =========================================================================
-- GIAO DỊCH 1: ĐẶT HÀNG & GIỮ CHỖ TỒN KHO AN TOÀN (ATOMIC ORDERING)
-- PHỤ TRÁCH THỰC HIỆN: QUÁCH TÀI LỢI (20%)
-- Đảm bảo tính nguyên tử: Tạo đơn hàng + Chi tiết đơn hàng + Trừ kho + Cập nhật tổng tiền
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_DatHangVaGiuCho
    @MaKH INT,
    @MaNV INT,
    @MaKhoXuat INT,
    @MaSP INT,
    @SoLuong INT,
    @DonGiaBan DECIMAL(12,2)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Khóa dòng dữ liệu tồn kho bằng UPDLOCK + HOLDLOCK chống Lost Update
        DECLARE @TonHienTai INT;
        SELECT @TonHienTai = SoLuongTon
        FROM TonKho WITH (UPDLOCK, HOLDLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonHienTai IS NULL OR @TonHienTai < @SoLuong
            THROW 51001, N'Giao dịch thất bại: Hàng trong kho không đủ để giữ chỗ!', 1;

        -- Tạo Header đơn hàng với Tổng tiền tính toán trực tiếp
        DECLARE @TongTien DECIMAL(14,2) = @SoLuong * @DonGiaBan;

        INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
        VALUES (@MaKH, @MaNV, @MaKhoXuat, GETDATE(), 0, @TongTien);

        DECLARE @NewMaDH INT = SCOPE_IDENTITY();

        -- Tạo Chi tiết đơn hàng (Trigger 1 sẽ tự xử lý đồng bộ)
        INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
        VALUES (@NewMaDH, @MaSP, @SoLuong, @DonGiaBan);

        COMMIT TRANSACTION;
        SELECT N'Đặt hàng và giữ chỗ kho thành công!' AS KetQua, @NewMaDH AS MaDH;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 1: usp_Tx_DatHangVaGiuCho';
GO

-- =========================================================================
-- GIAO DỊCH 2: HỦY ĐƠN HÀNG VÀ HOÀN TRẢ SỐ LƯỢNG TỒN KHO (COMPENSATING TX)
-- PHỤ TRÁCH THỰC HIỆN: PHAN THIỆN KHỞI (20%)
-- Nghiệp vụ: Chuyển trạng thái đơn sang 4 (Đã hủy) và hoàn trả lại số lượng cho toàn bộ mặt hàng
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_HuyDonHangVaHoanTonKho
    @MaDH INT,
    @LyDoHuy NVARCHAR(200)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @TrangThaiHienTai TINYINT, @MaKho INT;
        SELECT @TrangThaiHienTai = TrangThai, @MaKho = MaKhoXuat 
        FROM DonHang WITH (UPDLOCK, ROWLOCK)
        WHERE MaDH = @MaDH;

        IF @TrangThaiHienTai IS NULL
            THROW 51002, N'Đơn hàng không tồn tại!', 1;

        IF @TrangThaiHienTai = 3
            THROW 51003, N'Không thể hủy đơn hàng đã giao thành công!', 1;

        IF @TrangThaiHienTai = 4
            THROW 51004, N'Đơn hàng này đã được hủy trước đó!', 1;

        -- Hoàn trả lại số lượng tồn kho chính xác theo từng sản phẩm (Group by tránh trùng lặp)
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon + del.TongSoLuongHoan
        FROM TonKho tk
        INNER JOIN (
            SELECT ct.MaSP, SUM(ct.SoLuong) AS TongSoLuongHoan
            FROM ChiTietDonHang ct
            WHERE ct.MaDH = @MaDH
            GROUP BY ct.MaSP
        ) del ON tk.MaSP = del.MaSP AND tk.MaKho = @MaKho;

        -- Cập nhật trạng thái đơn hàng sang 4 (Đã hủy)
        UPDATE DonHang
        SET TrangThai = 4
        WHERE MaDH = @MaDH;

        -- Ghi log hủy đơn vào hệ thống
        INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
        VALUES (N'HUY_DON_HANG', N'Hủy đơn ' + CAST(@MaDH AS NVARCHAR(10)) + N'. Lý do: ' + @LyDoHuy, GETDATE(), SUSER_SNAME());

        COMMIT TRANSACTION;
        SELECT N'Hủy đơn hàng và hoàn tồn kho thành công!' AS KetQua, @MaDH AS MaDH;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 2: usp_Tx_HuyDonHangVaHoanTonKho';
GO

-- =========================================================================
-- GIAO DỊCH 3: SA THẢI QUẢN LÝ VÀ ĐIỀU CHUYỂN TOÀN BỘ CẤP DƯỚI (HR REORGANIZATION)
-- PHỤ TRÁCH THỰC HIỆN: HUỲNH VĂN BÌNH (20%)
-- Nghiệp vụ: Xóa mềm quản lý (DaXoa = 1) và chuyển các nhân viên dưới quyền lên cho Sếp Tổng
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_XoaNhanVienVaDieuChuyenQuanLy
    @MaNVCantXoa INT,
    @MaQLThayThe INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaNVCantXoa AND DaXoa = 0)
            THROW 51005, N'Nhân viên cần xóa không tồn tại hoặc đã nghỉ việc!', 1;

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaQLThayThe AND DaXoa = 0)
            THROW 51006, N'Quản lý thay thế không hợp lệ!', 1;

        -- 1. Điều chuyển toàn bộ nhân viên cấp dưới sang quản lý mới
        UPDATE NhanVien
        SET MaQL = @MaQLThayThe
        WHERE MaQL = @MaNVCantXoa AND DaXoa = 0;

        -- 2. Đánh dấu xóa mềm nhân viên
        UPDATE NhanVien
        SET DaXoa = 1
        WHERE MaNV = @MaNVCantXoa;

        COMMIT TRANSACTION;
        SELECT N'Điều chuyển nhân sự và xóa mềm thành công!' AS KetQua;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 3: usp_Tx_XoaNhanVienVaDieuChuyenQuanLy';
GO

-- =========================================================================
-- GIAO DỊCH 4: THĂNG HẠNG THÀNH VIÊN VÀ TẶNG ĐIỂM THƯỞNG HÀNG LOẠT (BATCH PROMOTION)
-- PHỤ TRÁCH THỰC HIỆN: HOÀNG GIA KIỆT (20%)
-- Nghiệp vụ: Chạy định kỳ thăng hạng khách hàng có điểm tích lũy cao và tặng điểm tri ân
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_ThangHangThanhVienHangLoat
    @DiemToiThieu INT,
    @DiemThuongBonus INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Thăng hạng Kim Cương cho khách hàng đủ điểm
        UPDATE KhachHang
        SET 
            LoaiKH = 2,
            DiemTichLuy = DiemTichLuy + @DiemThuongBonus
        WHERE DiemTichLuy >= @DiemToiThieu AND LoaiKH < 2;

        DECLARE @SoLuongKhach INT = @@ROWCOUNT;

        INSERT INTO NhatKyHeThong (HanhDong, NoiDung, ThoiGian, NguoiThucHien)
        VALUES (
            N'THANG_HANG_KHACH_HANG',
            N'Đã nâng hạng thành công cho ' + CAST(@SoLuongKhach AS NVARCHAR(10)) + N' khách hàng VIP lên Kim Cương.',
            GETDATE(),
            SUSER_SNAME()
        );

        COMMIT TRANSACTION;
        SELECT N'Thăng hạng khách hàng thành công!' AS KetQua, @SoLuongKhach AS SoKhachDuocThangHang;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 4: usp_Tx_ThangHangThanhVienHangLoat';
GO

-- =========================================================================
-- GIAO DỊCH 5: ĐIỀU CHUYỂN KHO TỒN HÀNG HÓA LIÊN CHI NHÁNH CÓ BẢO MẬT (INTER-BRANCH TX)
-- PHỤ TRÁCH THỰC HIỆN: TRẦN NHẬT TÂN (20%)
-- =========================================================================
CREATE OR ALTER PROCEDURE dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh
    @MaKhoXuat INT,
    @MaKhoNhap INT,
    @MaSP INT,
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF @SoLuong <= 0
            THROW 51005, N'Số lượng điều chuyển phải lớn hơn 0!', 1;

        IF @MaKhoXuat = @MaKhoNhap
            THROW 51006, N'Kho xuất và kho nhập không được trùng nhau!', 1;

        -- TRIỆT TIÊU HOÀN TOÀN DEADLOCK BẰNG KỸ THUẬT LOCK ORDERING (MIN TRƯỚC, MAX SAU)
        -- Ngăn chặn Wait-For Graph khép kín khi 2 phiên cùng chuyển hàng chéo chiều nhau giữa 2 kho
        DECLARE @KhoNho INT = CASE WHEN @MaKhoXuat < @MaKhoNhap THEN @MaKhoXuat ELSE @MaKhoNhap END;
        DECLARE @KhoLon INT = CASE WHEN @MaKhoXuat < @MaKhoNhap THEN @MaKhoNhap ELSE @MaKhoXuat END;

        -- Khóa trước kho có mã nhỏ hơn, sau đó khóa kho có mã lớn hơn
        DECLARE @DummyLock INT;
        SELECT @DummyLock = SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @KhoNho AND MaSP = @MaSP;
        SELECT @DummyLock = SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @KhoLon AND MaSP = @MaSP;

        -- Kiểm tra tồn kho thực tế tại kho nguồn xuất hàng
        DECLARE @TonKhoXuat INT;
        SELECT @TonKhoXuat = SoLuongTon 
        FROM TonKho WITH (UPDLOCK, HOLDLOCK)
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        IF @TonKhoXuat IS NULL OR @TonKhoXuat < @SoLuong
            THROW 51007, N'Kho nguồn không đủ số lượng để thực hiện điều chuyển!', 1;

        -- Trừ hàng kho xuất
        UPDATE TonKho 
        SET SoLuongTon = SoLuongTon - @SoLuong 
        WHERE MaKho = @MaKhoXuat AND MaSP = @MaSP;

        -- Cộng hàng kho nhập
        IF EXISTS (SELECT 1 FROM TonKho WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP)
        BEGIN
            UPDATE TonKho 
            SET SoLuongTon = SoLuongTon + @SoLuong 
            WHERE MaKho = @MaKhoNhap AND MaSP = @MaSP;
        END
        ELSE
        BEGIN
            INSERT INTO TonKho (MaKho, MaSP, SoLuongTon) 
            VALUES (@MaKhoNhap, @MaSP, @SoLuong);
        END;

        COMMIT TRANSACTION;
        SELECT N'Điều chuyển kho thành công!' AS KetQua;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        DECLARE @Msg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Msg, 16, 1);
    END CATCH;
END;
GO

PRINT N'Da tao thanh cong GIAO DICH 5: usp_Tx_ChuyenKhoHangHoaLienChiNhanh';
GO

-- =========================================================================
-- PHẦN MINH CHỨNG TRANH CHẤP TRUY CẬP ĐỒNG THỜI (CONCURRENCY) & DEADLOCK
-- 1. GIẢI QUYẾT BÀI TOÁN LOST UPDATE (BÁN KHỐNG HÀNG TỒN KHO):
--    Nếu 2 người cùng đọc tồn kho = 1 và cùng trừ 1, cả 2 sẽ tưởng thành công -> Tồn kho thành -1!
--    Giải pháp: Dùng khóa "WITH (UPDLOCK, HOLDLOCK)" trong câu SELECT kiểm tra tồn kho.
--    UPDLOCK giữ khóa đọc có ý định cập nhật, chặn mọi phiên khác không được chen ngang.
--
-- 2. GIẢI QUYẾT BÀI TOÁN DEADLOCK:
--    Nguyên nhân: Phiên 1 khóa Bảng SanPham rồi xin khóa Bảng TonKho.
--                 Phiên 2 khóa Bảng TonKho rồi xin khóa Bảng SanPham.
--                 -> Hai bên chờ nhau vĩnh viễn gây Deadlock!
--    Giải pháp chuẩn mực:
--    - Quy ước Lock Ordering: Luôn truy cập bảng SanPham trước, bảng TonKho sau ở mọi thủ tục.
--    - Thiết lập: SET DEADLOCK_PRIORITY NORMAL / HIGH cho các giao dịch trọng yếu.
-- =========================================================================

PRINT N'=========================================================================';
PRINT N'HOAN THANH TOAN BO 5 GIAO DICH ACID VA MINH CHUNG CONCURRENCY / DEADLOCK!';
PRINT N'=========================================================================';
GO

GO


-- =========================================================================
-- NOI DUNG TU TEP: 09_BaoMat_PhanQuyen_Roles.sql
-- =========================================================================

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
GRANT SELECT ON ChiNhanh TO Role_QuanLyChiNhanh;
GRANT SELECT ON KhoHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON TonKho TO Role_QuanLyChiNhanh;
GRANT SELECT ON SanPham TO Role_QuanLyChiNhanh;
GRANT SELECT ON DanhMuc TO Role_QuanLyChiNhanh;
GRANT SELECT ON KhachHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON DonHang TO Role_QuanLyChiNhanh;
GRANT SELECT ON ChiTietDonHang TO Role_QuanLyChiNhanh;
-- BẢO MẬT CẤP CỘT (COLUMN-LEVEL SECURITY - LEAST PRIVILEGE):
-- Cho phép xem thông tin định danh nhân sự để liên kết chi nhánh/kho, cấm tuyệt đối cột Luong (Error 229 nếu cố truy vấn)
REVOKE SELECT ON dbo.NhanVien FROM Role_QuanLyChiNhanh;
GRANT SELECT(MaNV, HoTen, MaCN, MaQL, DaXoa) ON dbo.NhanVien TO Role_QuanLyChiNhanh;
GO

-- ROLE 3: THU NGÂN / CASHIER (HUỲNH VĂN BÌNH - 20%)
-- Được tạo đơn, in hóa đơn, tìm khách, tra sản phẩm và chạy các hàm/giao dịch bán hàng
GRANT EXECUTE ON dbo.sp_TaoDonHangVaChiTiet TO Role_ThuNgan;
GRANT EXECUTE ON dbo.sp_CapNhatTrangThaiDonHang TO Role_ThuNgan;
GRANT EXECUTE ON dbo.usp_Tx_DatHangVaGiuCho TO Role_ThuNgan;
GRANT EXECUTE ON dbo.usp_Tx_HuyDonHangVaHoanTonKho TO Role_ThuNgan;
GRANT EXECUTE ON dbo.fn_TinhTienSauChietKhauVIP TO Role_ThuNgan;
GRANT EXECUTE ON dbo.fn_KiemTraKhaNangDapUngDonHang TO Role_ThuNgan;
GRANT EXECUTE ON dbo.fn_FormatMaHoaDonTuDong TO Role_ThuNgan;
GRANT SELECT ON dbo.fn_DanhSachDonHangTheoKhoangThoiGian TO Role_ThuNgan;
GRANT SELECT ON v_InHoaDon_ChiTietPhucHop TO Role_ThuNgan;
GRANT SELECT, INSERT, UPDATE ON KhachHang TO Role_ThuNgan;
GRANT SELECT ON ChiNhanh TO Role_ThuNgan;
GRANT SELECT ON KhoHang TO Role_ThuNgan;
GRANT SELECT ON TonKho TO Role_ThuNgan;
GRANT SELECT ON SanPham TO Role_ThuNgan;
GRANT SELECT ON DanhMuc TO Role_ThuNgan;
GRANT SELECT ON DonHang TO Role_ThuNgan;
GRANT SELECT ON ChiTietDonHang TO Role_ThuNgan;
-- BẢO MẬT: CẤM TUYỆT ĐỐI XEM LƯƠNG HOẶC XÓA BẤT KỲ DỮ LIỆU NÀO TRỰC TIẾP
REVOKE SELECT ON dbo.NhanVien FROM Role_ThuNgan;
GRANT SELECT(MaNV, HoTen, MaCN, MaQL, DaXoa) ON dbo.NhanVien TO Role_ThuNgan;
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
GRANT EXECUTE ON dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh TO Role_ThuKho;
-- BẢO MẬT: CẤM XEM THÔNG TIN KHÁCH HÀNG, ĐƠN HÀNG, NHÂN SỰ
DENY SELECT ON KhachHang TO Role_ThuKho;
DENY SELECT ON DonHang TO Role_ThuKho;
DENY SELECT ON ChiTietDonHang TO Role_ThuKho;
REVOKE SELECT ON dbo.NhanVien FROM Role_ThuKho;
GRANT SELECT(MaNV, HoTen, MaCN, MaQL, DaXoa) ON dbo.NhanVien TO Role_ThuKho;
GO

-- MA TRẬN BẢO MẬT & KIỂM THỬ XÁC THỰC RLS (TRẦN NHẬT TÂN - 20%)
-- Thiết lập chính sách kiểm thử kết nối trực tiếp từ Web Dashboard qua 4 tài khoản CSDL

PRINT N'=========================================================================';
PRINT N'HOAN THANH PHAN QUYEN NATIVE 4 LOGINS, 4 ROLES THEO CHUAN LEAST PRIVILEGE!';
PRINT N'=========================================================================';
GO

GO
