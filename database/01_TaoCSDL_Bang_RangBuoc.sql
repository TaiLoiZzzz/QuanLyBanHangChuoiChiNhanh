-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 1: TẠO CƠ SỞ DỮ LIỆU, 11 BẢNG CHUẨN HÓA 3NF & RÀNG BUỘC TOÀN VẸN
-- NGƯỜI PHỤ TRÁCH: QUÁCH TÀI LỢI (70%) - HỖ TRỢ: PHAN THIỆN KHỞI (7.5%)
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

-- 3. XÓA BẢNG THEO THỨ TỰ NGƯỢC (TỪ CON ĐẾN CHA) NẾU ĐÃ TỒN TẠI ĐỂ CHẠY LẠI KHÔNG LỖI
IF OBJECT_ID('ChiTietDonHang', 'U') IS NOT NULL DROP TABLE ChiTietDonHang;
IF OBJECT_ID('DonHang', 'U') IS NOT NULL DROP TABLE DonHang;
IF OBJECT_ID('TonKho', 'U') IS NOT NULL DROP TABLE TonKho;
IF OBJECT_ID('LichSuGia', 'U') IS NOT NULL DROP TABLE LichSuGia;
IF OBJECT_ID('SanPham', 'U') IS NOT NULL DROP TABLE SanPham;
IF OBJECT_ID('KhoHang', 'U') IS NOT NULL DROP TABLE KhoHang;
IF OBJECT_ID('DanhMuc', 'U') IS NOT NULL DROP TABLE DanhMuc;
IF OBJECT_ID('KhachHang', 'U') IS NOT NULL DROP TABLE KhachHang;
IF OBJECT_ID('NhanVien', 'U') IS NOT NULL DROP TABLE NhanVien;
IF OBJECT_ID('ChiNhanh', 'U') IS NOT NULL DROP TABLE ChiNhanh;
IF OBJECT_ID('NhatKyHeThong', 'U') IS NOT NULL DROP TABLE NhatKyHeThong;
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
