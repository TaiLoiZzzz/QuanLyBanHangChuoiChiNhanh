# HƯỚNG DẪN THỰC HIỆN CHI TIẾT TỪNG BƯỚC PROJECT DBMS (CHUẨN GU CÔ THỂ)
**Học phần:** Hệ quản trị Cơ sở dữ liệu (DBMS330284) – Khoa CNTT, HCMUTE  
**Giảng viên:** TS. Phan Thị Thể  
**Đề tài:** Hệ thống Quản lý Bán hàng & Chuỗi Tồn kho Đa Chi nhánh trên Microsoft SQL Server  
**Phân bổ nhân sự:** Quách Tài Lợi (70% - Chủ trì kiến trúc & kỹ thuật lõi), Phan Thiện Khởi (7.5%), Huỳnh Văn Bình (7.5%), Hoàng Gia Kiệt (7.5%), Trần Nhật Tân (7.5%).

---

## TỔNG QUAN TIẾN ĐỘ & CẤU TRÚC THƯ MỤC NỘP BÀI

Toàn bộ đồ án được tổ chức theo quy chuẩn đóng gói kỹ thuật chuyên nghiệp:

```text
NhomXX_QuanLyBanHangChuoiChiNhanh/
├── database/                               <-- TOÀN BỘ MÃ NGUỒN SQL THEO THỨ TỰ THỰC THI
│   ├── 01_TaoCSDL_Bang_RangBuoc.sql        <-- Lợi (70%) & Khởi (7.5%)
│   ├── 02_DuLieuMau_Testing.sql            <-- Khởi & Kiệt (7.5%)
│   ├── 03_KhungNhin_Views.sql              <-- Khởi (7.5%)
│   ├── 04_Ham_Functions.sql                <-- Bình (7.5%)
│   ├── 05_Triggers_ToanDien.sql            <-- Lợi (70%) & Bình (7.5%)
│   ├── 06_StoredProcedures_Transaction.sql <-- Lợi (70%)
│   ├── 07_ToiUuIndex_ExecutionPlan.sql     <-- Lợi (70%) & Kiệt (7.5%)
│   ├── 08_PhucHoiSuCo_Recovery.sql         <-- Lợi (70%)
│   └── 09_BaoMat_PhanQuyenRole.sql         <-- Tân (7.5%) & Lợi (70%)
├── backup/                                 <-- Chứa file backup CSDL (.bak)
│   └── QuanLyBanHang_Full.bak
├── src/                                    <-- MÃ NGUỒN NODE.JS (SQL THUẦN QUA MSSQL)
│   ├── config/
│   │   └── db.js                           <-- Singleton Connection Pool (Lợi)
│   ├── controllers/                        <-- Xử lý request API
│   ├── services/                           <-- Tầng gọi Stored Procedure / Function
│   │   ├── orderService.js
│   │   └── productService.js
│   └── public/                             <-- Giao diện Web (Tân)
├── docs/                                   <-- BÁO CÁO & SLIDE
│   ├── Báo_Cáo_Project_DBMS_NhomXX.docx    <-- 70 trang chuẩn Times New Roman 13, 1.5
│   └── Slide_Thuyet_Trinh_NhomXX.pptx      <-- Đúng 15 slide chuẩn
├── .env.example
├── package.json
└── README.md                               <-- Hướng dẫn cài đặt & lịch sử Git commit
```

---

## BƯỚC 1: XÂY DỰNG CSDL, BẢNG & RÀNG BUỘC TOÀN VẸN (`01_TaoCSDL_Bang_RangBuoc.sql`)
**Người phụ trách chính:** Quách Tài Lợi (70%) – Hỗ trợ: Phan Thiện Khởi (7.5%)

### 1.1. Khởi tạo CSDL với Recovery Model = FULL
> [!NOTE]
> Bắt buộc cấu hình `RECOVERY FULL` ngay từ đầu để phục vụ kịch bản **Point-in-Time Recovery** ở Bước 7.

```sql
CREATE DATABASE QuanLyBanHangDB;
GO

USE QuanLyBanHangDB;
GO

-- Bắt buộc thiết lập chế độ phục hồi FULL
ALTER DATABASE QuanLyBanHangDB SET RECOVERY FULL;
GO
```

### 1.2. Tạo 11 Bảng với Kiểu dữ liệu tối ưu bộ nhớ
*(Thứ tự tạo: Tạo các bảng danh mục cha trước, bảng giao dịch con sau)*

```sql
-- 1. BẢNG CHI NHÁNH
CREATE TABLE ChiNhanh (
    MaCN INT IDENTITY(1,1) PRIMARY KEY,
    TenCN NVARCHAR(100) NOT NULL,
    DiaChi NVARCHAR(200) NULL,
    SoDT CHAR(10) NOT NULL CONSTRAINT UQ_ChiNhanh_SoDT UNIQUE
);
GO

-- 2. BẢNG NHÂN VIÊN (Có tự tham chiếu MaQL và cờ xóa mềm DaXoa)
CREATE TABLE NhanVien (
    MaNV INT IDENTITY(1,1) PRIMARY KEY,
    HoTen NVARCHAR(100) NOT NULL,
    Luong DECIMAL(12,2) NOT NULL CONSTRAINT CK_NhanVien_Luong CHECK (Luong > 0),
    MaCN INT NOT NULL CONSTRAINT FK_NhanVien_ChiNhanh REFERENCES ChiNhanh(MaCN),
    MaQL INT NULL CONSTRAINT FK_NhanVien_QuanLy REFERENCES NhanVien(MaNV),
    DaXoa BIT NOT NULL CONSTRAINT DF_NhanVien_DaXoa DEFAULT 0
);
GO

-- 3. BẢNG KHÁCH HÀNG (LoaiKH: 0: Thường, 1: VIP, 2: Kim Cương)
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

-- 4. BẢNG DANH MỤC SẢN PHẨM
CREATE TABLE DanhMuc (
    MaDM INT IDENTITY(1,1) PRIMARY KEY,
    TenDM NVARCHAR(100) NOT NULL CONSTRAINT UQ_DanhMuc_TenDM UNIQUE
);
GO

-- 5. BẢNG SẢN PHẨM (Có cờ xóa mềm)
CREATE TABLE SanPham (
    MaSP INT IDENTITY(1,1) PRIMARY KEY,
    TenSP NVARCHAR(150) NOT NULL,
    MaDM INT NOT NULL CONSTRAINT FK_SanPham_DanhMuc REFERENCES DanhMuc(MaDM),
    GiaBanHienTai DECIMAL(12,2) NOT NULL CONSTRAINT CK_SanPham_Gia CHECK (GiaBanHienTai > 0),
    DonViTinh NVARCHAR(20) NOT NULL,
    DaXoa BIT NOT NULL CONSTRAINT DF_SanPham_DaXoa DEFAULT 0
);
GO

-- 6. BẢNG KHO HÀNG
CREATE TABLE KhoHang (
    MaKho INT IDENTITY(1,1) PRIMARY KEY,
    TenKho NVARCHAR(100) NOT NULL,
    MaCN INT NOT NULL CONSTRAINT FK_KhoHang_ChiNhanh REFERENCES ChiNhanh(MaCN)
);
GO

-- 7. BẢNG TỒN KHO (Khóa chính kép: MaKho + MaSP)
CREATE TABLE TonKho (
    MaKho INT NOT NULL CONSTRAINT FK_TonKho_KhoHang REFERENCES KhoHang(MaKho),
    MaSP INT NOT NULL CONSTRAINT FK_TonKho_SanPham REFERENCES SanPham(MaSP),
    SoLuongTon INT NOT NULL CONSTRAINT DF_TonKho_SoLuong DEFAULT 0,
    CONSTRAINT PK_TonKho PRIMARY KEY (MaKho, MaSP),
    CONSTRAINT CK_TonKho_KhongAm CHECK (SoLuongTon >= 0)
);
GO

-- 8. BẢNG ĐƠN HÀNG (TrangThai: 0: Mới, 1: Đã xác nhận, 2: Đang giao, 3: Đã giao, 4: Đã hủy)
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

-- 9. BẢNG CHI TIẾT ĐƠN HÀNG (Khóa chính kép: MaDH + MaSP)
CREATE TABLE ChiTietDonHang (
    MaDH INT NOT NULL CONSTRAINT FK_ChiTiet_DonHang REFERENCES DonHang(MaDH),
    MaSP INT NOT NULL CONSTRAINT FK_ChiTiet_SanPham REFERENCES SanPham(MaSP),
    SoLuong INT NOT NULL CONSTRAINT CK_ChiTiet_SoLuong CHECK (SoLuong > 0),
    DonGiaBan DECIMAL(12,2) NOT NULL CONSTRAINT CK_ChiTiet_DonGia CHECK (DonGiaBan > 0),
    ThanhTien AS (SoLuong * DonGiaBan) PERSISTED,
    CONSTRAINT PK_ChiTietDonHang PRIMARY KEY (MaDH, MaSP)
);
GO

-- 10. BẢNG LỊCH SỬ THAY ĐỔI GIÁ (Audit Log)
CREATE TABLE LichSuGia (
    MaLS INT IDENTITY(1,1) PRIMARY KEY,
    MaSP INT NOT NULL CONSTRAINT FK_LichSuGia_SanPham REFERENCES SanPham(MaSP),
    GiaCu DECIMAL(12,2) NOT NULL,
    GiaMoi DECIMAL(12,2) NOT NULL,
    NgayThayDoi DATETIME NOT NULL CONSTRAINT DF_LichSuGia_Ngay DEFAULT GETDATE(),
    NguoiThayDoi NVARCHAR(100) NOT NULL
);
GO

-- 11. BẢNG NHẬT KÝ HỆ THỐNG (System Audit Log)
CREATE TABLE NhatKyHeThong (
    MaLog INT IDENTITY(1,1) PRIMARY KEY,
    HanhDong NVARCHAR(100) NOT NULL,
    NoiDung NVARCHAR(MAX) NULL,
    ThoiGian DATETIME NOT NULL CONSTRAINT DF_NhatKy_ThoiGian DEFAULT GETDATE(),
    NguoiThucHien NVARCHAR(100) NOT NULL
);
GO
```

---

## BƯỚC 2: TẠO DỮ LIỆU MẪU KIỂM THỬ (`02_DuLieuMau_Testing.sql`)
**Người phụ trách:** Phan Thiện Khởi & Hoàng Gia Kiệt (7.5%)

```sql
USE QuanLyBanHangDB;
GO

-- Chi nhánh
INSERT INTO ChiNhanh (TenCN, DiaChi, SoDT) VALUES 
(N'Chi nhánh Quận 1', N'123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM', '0901234567'),
(N'Chi nhánh Thủ Đức', N'01 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', '0908765432');

-- Kho hàng
INSERT INTO KhoHang (TenKho, MaCN) VALUES 
(N'Kho Trung Tâm Quận 1', 1),
(N'Kho Chi Nhánh Thủ Đức', 2);

-- Danh mục & Sản phẩm
INSERT INTO DanhMuc (TenDM) VALUES (N'Áo Nam'), (N'Quần Nam'), (N'Phụ Kiện');
INSERT INTO SanPham (TenSP, MaDM, GiaBanHienTai, DonViTinh) VALUES 
(N'Áo Thun Cotton Basic', 1, 150000, N'Cái'),
(N'Áo Sơ Mi Oxford', 1, 350000, N'Cái'),
(N'Quần Jean Slimfit', 2, 450000, N'Cái'),
(N'Ví Da Nam Cầm Tay', 3, 250000, N'Cái');

-- Nhân viên (Có cấp quản lý)
INSERT INTO NhanVien (HoTen, Luong, MaCN, MaQL) VALUES 
(N'Nguyễn Văn Quản Lý', 20000000, 1, NULL); -- Trưởng chi nhánh Q1
INSERT INTO NhanVien (HoTen, Luong, MaCN, MaQL) VALUES 
(N'Trần Thị Thu Ngân', 8000000, 1, 1),
(N'Lê Văn Thủ Kho', 9000000, 1, 1);

-- Khách hàng
INSERT INTO KhachHang (HoTen, SoDT, LoaiKH, DiemTichLuy) VALUES 
(N'Phạm Hoàng Khách', '0912345678', 0, 50),
(N'Vũ Thị VIP', '0987654321', 1, 1200);

-- Tồn kho ban đầu
INSERT INTO TonKho (MaKho, MaSP, SoLuongTon) VALUES 
(1, 1, 100), (1, 2, 50), (1, 3, 30), (1, 4, 10),
(2, 1, 80),  (2, 2, 20), (2, 3, 15), (2, 4, 5);
GO
```

---

## BƯỚC 3: LẬP TRÌNH KHUNG NHÌN VIEW & HÀM FUNCTION (`03_Views_Functions.sql`)
**Người phụ trách:** Phan Thiện Khởi (Views) & Huỳnh Văn Bình (Functions)

### 3.1. 5 Khung nhìn (Views)
```sql
-- 1. View Doanh thu chi nhánh theo tháng
CREATE VIEW vw_BaoCaoDoanhThuTheoChiNhanh AS
SELECT 
    cn.MaCN, cn.TenCN, 
    YEAR(dh.NgayDat) AS Nam, MONTH(dh.NgayDat) AS Thang,
    COUNT(dh.MaDH) AS TongSoDonHang,
    SUM(dh.TongTien) AS TongDoanhThu
FROM DonHang dh
INNER JOIN KhoHang kh ON dh.MaKhoXuat = kh.MaKho
INNER JOIN ChiNhanh cn ON kh.MaCN = cn.MaCN
WHERE dh.TrangThai IN (1, 2, 3) -- Đã xác nhận / Đang giao / Thành công
GROUP BY cn.MaCN, cn.TenCN, YEAR(dh.NgayDat), MONTH(dh.NgayDat);
GO

-- 2. View Cảnh báo tồn kho an toàn (< 10 sản phẩm)
CREATE VIEW vw_CanhBaoTonKhoAnToan AS
SELECT kh.TenKho, sp.MaSP, sp.TenSP, tk.SoLuongTon
FROM TonKho tk
INNER JOIN KhoHang kh ON tk.MaKho = kh.MaKho
INNER JOIN SanPham sp ON tk.MaSP = sp.MaSP
WHERE tk.SoLuongTon < 10 AND sp.DaXoa = 0;
GO

-- 3. View Chi tiết đơn hàng in hóa đơn
CREATE VIEW vw_ThongTinDonHangChiTiet AS
SELECT 
    dh.MaDH, dh.NgayDat, dh.TrangThai,
    kh.HoTen AS TenKhachHang, kh.SoDT AS SDTKhach,
    nv.HoTen AS NhanVienLapDon,
    sp.TenSP, ct.SoLuong, ct.DonGiaBan, ct.ThanhTien
FROM DonHang dh
INNER JOIN KhachHang kh ON dh.MaKH = kh.MaKH
INNER JOIN NhanVien nv ON dh.MaNV = nv.MaNV
INNER JOIN ChiTietDonHang ct ON dh.MaDH = ct.MaDH
INNER JOIN SanPham sp ON ct.MaSP = sp.MaSP;
GO

-- 4. View Top khách hàng VIP chi tiêu cao
CREATE VIEW vw_TopKhachHangVIP AS
SELECT TOP 100
    kh.MaKH, kh.HoTen, kh.SoDT, kh.LoaiKH,
    COUNT(dh.MaDH) AS SoDonDaMua,
    ISNULL(SUM(dh.TongTien), 0) AS TongTienChiTieu
FROM KhachHang kh
LEFT JOIN DonHang dh ON kh.MaKH = dh.MaKH AND dh.TrangThai = 3
GROUP BY kh.MaKH, kh.HoTen, kh.SoDT, kh.LoaiKH
ORDER BY TongTienChiTieu DESC;
GO

-- 5. View Sơ đồ tổ chức nhân sự (Self-Join)
CREATE VIEW vw_SoDoToChucNhanSu AS
SELECT 
    nv.MaNV, nv.HoTen AS TenNhanVien, nv.Luong, cn.TenCN,
    ISNULL(ql.HoTen, N'Không có (Cấp cao nhất)') AS NguoiQuanLyTrucTiep
FROM NhanVien nv
INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
LEFT JOIN NhanVien ql ON nv.MaQL = ql.MaNV
WHERE nv.DaXoa = 0;
GO
```

### 3.2. 5 User-Defined Functions (Functions)
```sql
-- 1. Scalar Function: Tính điểm tích lũy (100.000đ = 1 điểm)
CREATE FUNCTION fn_TinhDiemTichLuy (@TongTien DECIMAL(14,2))
RETURNS INT
AS
BEGIN
    RETURN FLOOR(@TongTien / 100000);
END;
GO

-- 2. Scalar Function: Kiểm tra khả năng cung ứng hàng
CREATE FUNCTION fn_KiemTraKhaNangCungUng (@MaKho INT, @MaSP INT, @SoLuongCan INT)
RETURNS BIT
AS
BEGIN
    DECLARE @TonHienTai INT = 0;
    SELECT @TonHienTai = SoLuongTon FROM TonKho WHERE MaKho = @MaKho AND MaSP = @MaSP;
    IF @TonHienTai >= @SoLuongCan RETURN 1;
    RETURN 0;
END;
GO

-- 3. Scalar Function: Định dạng số điện thoại
CREATE FUNCTION fn_FormatSoDienThoai (@SoDT CHAR(10))
RETURNS VARCHAR(15)
AS
BEGIN
    IF LEN(@SoDT) <> 10 RETURN @SoDT;
    RETURN '(' + SUBSTRING(@SoDT, 1, 3) + ') ' + SUBSTRING(@SoDT, 4, 3) + '-' + SUBSTRING(@SoDT, 7, 4);
END;
GO

-- 4. Inline Table-Valued Function: Lịch sử đơn hàng của khách
CREATE FUNCTION fn_DanhSachDonHangCuaKhach (@MaKH INT)
RETURNS TABLE
AS
RETURN (
    SELECT MaDH, NgayDat, TrangThai, TongTien
    FROM DonHang
    WHERE MaKH = @MaKH
);
GO

-- 5. Multi-Statement Table-Valued Function: Báo cáo tồn kho chi tiết
CREATE FUNCTION fn_BaoCaoTonKhoChiTiet (@MaKho INT)
RETURNS @Result TABLE (
    MaSP INT,
    TenSP NVARCHAR(150),
    SoLuongTon INT,
    GiaTriTonKho DECIMAL(18,2),
    TinhTrang NVARCHAR(50)
)
AS
BEGIN
    INSERT INTO @Result
    SELECT 
        sp.MaSP, sp.TenSP, tk.SoLuongTon,
        (tk.SoLuongTon * sp.GiaBanHienTai) AS GiaTriTonKho,
        CASE 
            WHEN tk.SoLuongTon = 0 THEN N'HẾT HÀNG'
            WHEN tk.SoLuongTon < 10 THEN N'CẦN NHẬP THÊM'
            ELSE N'ĐỦ HÀNG'
        END AS TinhTrang
    FROM TonKho tk
    INNER JOIN SanPham sp ON tk.MaSP = sp.MaSP
    WHERE tk.MaKho = @MaKho AND sp.DaXoa = 0;

    RETURN;
END;
GO
```

---

## BƯỚC 4: LẬP TRÌNH TRIGGER TOÀN DIỆN (`05_Triggers_ToanDien.sql`)
**Người phụ trách chính:** Quách Tài Lợi (Trigger Lõi 70%) – Hỗ trợ: Huỳnh Văn Bình (Trigger phụ 7.5%)

```sql
USE QuanLyBanHangDB;
GO

-- TRIGGER 1 (LÕI - QUÁCH TÀI LỢI): ĐỒNG BỘ TỒN KHO & TỔNG TIỀN (Set-based, INSERT/UPDATE/DELETE)
CREATE TRIGGER trg_ChiTietDonHang_SyncKho_TongTien
ON ChiTietDonHang
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF @@ROWCOUNT = 0 RETURN;

    -- Hoàn lại kho cũ (DELETE / UPDATE)
    IF EXISTS (SELECT 1 FROM deleted)
    BEGIN
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon + del.SoLuong
        FROM TonKho tk
        INNER JOIN deleted del ON tk.MaSP = del.MaSP
        INNER JOIN DonHang dh ON del.MaDH = dh.MaDH AND tk.MaKho = dh.MaKhoXuat;
    END

    -- Trừ kho mới (INSERT / UPDATE)
    IF EXISTS (SELECT 1 FROM inserted)
    BEGIN
        UPDATE tk
        SET tk.SoLuongTon = tk.SoLuongTon - ins.SoLuong
        FROM TonKho tk
        INNER JOIN inserted ins ON tk.MaSP = ins.MaSP
        INNER JOIN DonHang dh ON ins.MaDH = dh.MaDH AND tk.MaKho = dh.MaKhoXuat;
    END

    -- Đồng bộ Tổng tiền vào DonHang (Controlled Denormalization)
    WITH ImpactedOrders AS (
        SELECT MaDH FROM inserted
        UNION
        SELECT MaDH FROM deleted
    )
    UPDATE dh
    SET dh.TongTien = ISNULL(sub.Total, 0)
    FROM DonHang dh
    INNER JOIN ImpactedOrders io ON dh.MaDH = io.MaDH
    OUTER APPLY (
        SELECT SUM(SoLuong * DonGiaBan) AS Total
        FROM ChiTietDonHang ct
        WHERE ct.MaDH = dh.MaDH
    ) sub;
END;
GO

-- TRIGGER 2 (HUỲNH VĂN BÌNH): AUDIT LOG THAY ĐỔI GIÁ BÁN
CREATE TRIGGER trg_SanPham_GhiLogGia
ON SanPham
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF @@ROWCOUNT = 0 RETURN;

    IF UPDATE(GiaBanHienTai)
    BEGIN
        INSERT INTO LichSuGia (MaSP, GiaCu, GiaMoi, NgayThayDoi, NguoiThayDoi)
        SELECT 
            ins.MaSP, del.GiaBanHienTai, ins.GiaBanHienTai, GETDATE(), SUSER_SNAME()
        FROM inserted ins
        INNER JOIN deleted del ON ins.MaSP = del.MaSP
        WHERE ins.GiaBanHienTai <> del.GiaBanHienTai;
    END
END;
GO

-- TRIGGER 3 (HUỲNH VĂN BÌNH): INSTEAD OF TRIGGER XÓA MỀM NHÂN VIÊN
CREATE TRIGGER trg_NhanVien_XoaMem
ON NhanVien
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE NhanVien
    SET DaXoa = 1
    WHERE MaNV IN (SELECT MaNV FROM deleted);
END;
GO

-- TRIGGER 4 (HUỲNH VĂN BÌNH): TỰ ĐỘNG NÂNG HẠNG THÀNH VIÊN VIP
CREATE TRIGGER trg_KhachHang_NangHangVIP
ON KhachHang
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF @@ROWCOUNT = 0 RETURN;

    IF UPDATE(DiemTichLuy)
    BEGIN
        UPDATE kh
        SET LoaiKH = CASE 
            WHEN ins.DiemTichLuy >= 5000 THEN 2 -- Kim Cương
            WHEN ins.DiemTichLuy >= 1000 THEN 1 -- VIP
            ELSE 0 -- Thường
        END
        FROM KhachHang kh
        INNER JOIN inserted ins ON kh.MaKH = ins.MaKH;
    END
END;
GO

-- TRIGGER 5 (QUÁCH TÀI LỢI): CHẶN XÓA KHO KHI CÒN HÀNG TỒN
CREATE TRIGGER trg_KhoHang_ChanXoaKhiConHang
ON KhoHang
INSTEAD OF DELETE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1 FROM TonKho tk
        INNER JOIN deleted del ON tk.MaKho = del.MaKho
        WHERE tk.SoLuongTon > 0
    )
    BEGIN
        RAISERROR(N'Không thể xóa kho hàng vì vẫn còn sản phẩm có số lượng tồn > 0!', 16, 1);
        ROLLBACK TRANSACTION;
        RETURN;
    END

    -- Nếu tồn kho đều = 0, tiến hành xóa bản ghi TonKho rồi xóa KhoHang
    DELETE FROM TonKho WHERE MaKho IN (SELECT MaKho FROM deleted);
    DELETE FROM KhoHang WHERE MaKho IN (SELECT MaKho FROM deleted);
END;
GO
```

---

## BƯỚC 5: STORED PROCEDURE, TRANSACTION & CONCURRENCY (`06_StoredProcedures_Transaction.sql`)
**Người phụ trách chính:** Quách Tài Lợi (70%)

### 5.1. SP Tạo đơn hàng (Có `@OUTPUT` và `RETURN`)
```sql
CREATE PROCEDURE sp_TaoDonHangMoi
    @MaKH INT,
    @MaNV INT,
    @MaKhoXuat INT,
    @MaDHMoi INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        IF NOT EXISTS (SELECT 1 FROM KhachHang WHERE MaKH = @MaKH)
        BEGIN
            RAISERROR(N'Mã khách hàng không tồn tại trên hệ thống!', 16, 1);
            RETURN -1;
        END

        IF NOT EXISTS (SELECT 1 FROM NhanVien WHERE MaNV = @MaNV AND DaXoa = 0)
        BEGIN
            RAISERROR(N'Nhân viên không tồn tại hoặc đã nghỉ việc!', 16, 1);
            RETURN -2;
        END

        INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
        VALUES (@MaKH, @MaNV, @MaKhoXuat, GETDATE(), 0, 0);

        SET @MaDHMoi = SCOPE_IDENTITY();
        RETURN 0; -- Thành công
    END TRY
    BEGIN CATCH
        DECLARE @ErrMsg NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@ErrMsg, 16, 1);
        RETURN -99;
    END CATCH
END;
GO
```

### 5.2. SP Thanh toán an toàn chống Bán âm kho (Bộ ba `UPDLOCK, HOLDLOCK, ROWLOCK`)
```sql
CREATE PROCEDURE sp_ThanhToanDonHang_AnToan
    @MaDH INT,
    @MaKho INT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Khóa độc quyền bản ghi tồn kho đến hết Transaction
        IF EXISTS (
            SELECT 1 
            FROM ChiTietDonHang ct
            INNER JOIN TonKho tk WITH (UPDLOCK, HOLDLOCK, ROWLOCK)
                ON ct.MaSP = tk.MaSP AND tk.MaKho = @MaKho
            WHERE ct.MaDH = @MaDH AND tk.SoLuongTon < ct.SoLuong
        )
        BEGIN
            RAISERROR(N'Thanh toán thất bại: Sản phẩm trong kho không đủ cung ứng!', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN -1;
        END

        -- Chuyển trạng thái đơn hàng sang Đã xác nhận/thanh toán
        UPDATE DonHang SET TrangThai = 1 WHERE MaDH = @MaDH;

        -- Tích điểm cho khách hàng
        DECLARE @MaKH INT, @TongTien DECIMAL(14,2);
        SELECT @MaKH = MaKH, @TongTien = TongTien FROM DonHang WHERE MaDH = @MaDH;
        UPDATE KhachHang SET DiemTichLuy = DiemTichLuy + dbo.fn_TinhDiemTichLuy(@TongTien) WHERE MaKH = @MaKH;

        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        DECLARE @Err NVARCHAR(4000) = ERROR_MESSAGE();
        RAISERROR(@Err, 16, 1);
        RETURN -99;
    END CATCH
END;
GO
```

### 5.3. SP Điều chuyển kho chống Deadlock bằng Lock Ordering
```sql
CREATE PROCEDURE sp_DieuChuyenKho_ChongDeadlock
    @KhoNguon INT,
    @KhoDich INT,
    @MaSP INT,
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRANSACTION;
    BEGIN TRY
        IF @KhoNguon = @KhoDich
        BEGIN
            RAISERROR(N'Kho nguồn và kho đích không được trùng nhau!', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN -1;
        END

        -- NGUYÊN TẮC LOCK ORDERING: LUÔN KHÓA KHO CÓ ID NHỎ TRƯỚC
        DECLARE @Kho1 INT = IIF(@KhoNguon < @KhoDich, @KhoNguon, @KhoDich);
        DECLARE @Kho2 INT = IIF(@KhoNguon < @KhoDich, @KhoDich, @KhoNguon);

        SELECT SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @Kho1 AND MaSP = @MaSP;
        SELECT SoLuongTon FROM TonKho WITH (UPDLOCK, HOLDLOCK) WHERE MaKho = @Kho2 AND MaSP = @MaSP;

        -- Kiểm tra tồn kho nguồn
        DECLARE @TonNguon INT;
        SELECT @TonNguon = SoLuongTon FROM TonKho WHERE MaKho = @KhoNguon AND MaSP = @MaSP;
        IF @TonNguon < @SoLuong
        BEGIN
            RAISERROR(N'Kho nguồn không đủ số lượng để điều chuyển!', 16, 1);
            ROLLBACK TRANSACTION;
            RETURN -2;
        END

        -- Thực hiện chuyển
        UPDATE TonKho SET SoLuongTon = SoLuongTon - @SoLuong WHERE MaKho = @KhoNguon AND MaSP = @MaSP;
        UPDATE TonKho SET SoLuongTon = SoLuongTon + @SoLuong WHERE MaKho = @KhoDich AND MaSP = @MaSP;

        COMMIT TRANSACTION;
        RETURN 0;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
```

---

## BƯỚC 6: TỐI ƯU HÓA INDEX & EXECUTION PLAN (`07_ToiUuIndex_ExecutionPlan.sql`)
**Người phụ trách chính:** Quách Tài Lợi (Thiết kế Index 70%) & Hoàng Gia Kiệt (Đo đạc số liệu 7.5%)

### 6.1. Script sinh 100.000 dòng dữ liệu test tải
```sql
USE QuanLyBanHangDB;
GO

SET NOCOUNT ON;
DECLARE @i INT = 1;
WHILE @i <= 100000
BEGIN
    INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
    VALUES (
        (@i % 2) + 1,
        (@i % 3) + 1,
        (@i % 2) + 1,
        DATEADD(MINUTE, -@i, GETDATE()),
        (@i % 5),
        (@i % 50) * 10000
    );
    SET @i = @i + 1;
END;
GO
```

### 6.2. 5 Chỉ mục tối ưu chuẩn Kỹ sư
```sql
-- 1. Covering Index trên DonHang có INCLUDE (Phục vụ truy vấn báo cáo)
CREATE NONCLUSTERED INDEX IX_DonHang_NgayDat_Covering
ON DonHang (NgayDat, TrangThai)
INCLUDE (MaDH, MaKH, TongTien);
GO

-- 2. Filtered Index trên NhanVien (Chỉ đánh trên người chưa xóa)
CREATE NONCLUSTERED INDEX IX_NhanVien_ConLamViec
ON NhanVien (MaNV, HoTen, MaCN)
WHERE DaXoa = 0;
GO

-- 3. Non-Clustered Index trên ChiTietDonHang phục vụ JOIN
CREATE NONCLUSTERED INDEX IX_ChiTietDonHang_MaSP
ON ChiTietDonHang (MaSP);
GO

-- 4. Non-Clustered Index đảo vị trí tìm kiếm trên TonKho
CREATE NONCLUSTERED INDEX IX_TonKho_MaSP_MaKho
ON TonKho (MaSP, MaKho)
INCLUDE (SoLuongTon);
GO

-- 5. Unique Non-Clustered Index trên KhachHang(SoDT)
-- Đã được tạo tự động bởi ràng buộc UQ_KhachHang_SoDT
```

---

## BƯỚC 7: KỊCH BẢN PHỤC HỒI SỰ CỐ DỮ LIỆU (`08_PhucHoiSuCo_Recovery.sql`)
**Người phụ trách chính:** Quách Tài Lợi (70%) – *Vũ khí bí mật ăn trọn điểm Tiêu chí 4*

```sql
USE master;
GO

-- BƯỚC 1: TẠO FULL BACKUP LÚC 08:00 AM
BACKUP DATABASE QuanLyBanHangDB 
TO DISK = 'C:\Backup\QuanLyBanHangDB_Full.bak' 
WITH FORMAT, INIT, NAME = 'Full Backup';
GO

-- BƯỚC 2: GIẢ LẬP GIAO DỊCH VÀ TẠO LOG BACKUP LÚC 10:00 AM
USE QuanLyBanHangDB;
INSERT INTO KhachHang (HoTen, SoDT) VALUES (N'Khách Hàng Mới 1', '0911111111');
GO

BACKUP LOG QuanLyBanHangDB 
TO DISK = 'C:\Backup\QuanLyBanHangDB_Log1.trn' 
WITH FORMAT, INIT, NAME = 'Log Backup 1';
GO

-- BƯỚC 3: GIẢ LẬP SỰ CỐ THẢM HỌA LÚC 10:15:00 AM
-- (Kẻ xấu hoặc nhân viên chạy nhầm lệnh DROP bảng)
-- Giả sử thời điểm xảy ra sự cố là: 2026-10-16 10:15:00
DROP TABLE QuanLyBanHangDB.dbo.ChiTietDonHang;
GO

-- BƯỚC 4: TIẾN HÀNH PHỤC HỒI POINT-IN-TIME VỀ LÚC 10:14:59 AM
-- Sao lưu phần đuôi nhật ký (Tail-log Backup)
USE master;
BACKUP LOG QuanLyBanHangDB 
TO DISK = 'C:\Backup\QuanLyBanHangDB_TailLog.trn' 
WITH NORECOVERY;
GO

-- Restore Full Backup (WITH NORECOVERY)
RESTORE DATABASE QuanLyBanHangDB 
FROM DISK = 'C:\Backup\QuanLyBanHangDB_Full.bak' 
WITH NORECOVERY, REPLACE;
GO

-- Restore Log Backup 1 (WITH NORECOVERY)
RESTORE LOG QuanLyBanHangDB 
FROM DISK = 'C:\Backup\QuanLyBanHangDB_Log1.trn' 
WITH NORECOVERY;
GO

-- Restore Tail-log STOPAT đúng thời điểm trước khi bị Drop (WITH RECOVERY)
RESTORE LOG QuanLyBanHangDB 
FROM DISK = 'C:\Backup\QuanLyBanHangDB_TailLog.trn' 
WITH STOPAT = '2026-10-16 10:14:59', RECOVERY;
GO

-- Kiểm tra lại: Bảng ChiTietDonHang đã được hồi sinh nguyên vẹn!
SELECT * FROM QuanLyBanHangDB.dbo.ChiTietDonHang;
GO
```

---

## BƯỚC 8: BẢO MẬT & PHÂN QUYỀN 4 ROLE LEAST PRIVILEGE (`09_BaoMat_PhanQuyenRole.sql`)
**Người phụ trách:** Trần Nhật Tân (7.5%) & Quách Tài Lợi (70%)

```sql
USE QuanLyBanHangDB;
GO

-- 1. TẠO 4 ROLE HỆ THỐNG
CREATE ROLE Role_QuanTriVien;
CREATE ROLE Role_QuanLyChiNhanh;
CREATE ROLE Role_ThuNgan;
CREATE ROLE Role_ThuKho;
GO

-- 2. PHÂN QUYỀN ROLE THU NGÂN (Nguyên tắc Quyền tối thiểu)
-- Chặn toàn bộ thao tác trực tiếp trên Bảng
DENY SELECT, INSERT, UPDATE, DELETE ON DonHang TO Role_ThuNgan;
DENY SELECT, INSERT, UPDATE, DELETE ON TonKho TO Role_ThuNgan;
DENY SELECT, INSERT, UPDATE, DELETE ON SanPham TO Role_ThuNgan;

-- Mở quyền thực thi qua Stored Procedure và View được kiểm soát
GRANT EXECUTE ON sp_TaoDonHangMoi TO Role_ThuNgan;
GRANT EXECUTE ON sp_ThanhToanDonHang_AnToan TO Role_ThuNgan;
GRANT SELECT ON vw_ThongTinDonHangChiTiet TO Role_ThuNgan;
GO

-- 3. PHÂN QUYỀN ROLE THỦ KHO
GRANT EXECUTE ON sp_DieuChuyenKho_ChongDeadlock TO Role_ThuKho;
GRANT SELECT ON vw_CanhBaoTonKhoAnToan TO Role_ThuKho;
GRANT SELECT, UPDATE ON TonKho TO Role_ThuKho;
GO
```

---

## BƯỚC 9: KẾT NỐI NODE.JS SQL THUẦN QUA `mssql` (BACKEND CỦA LỢI)

### 9.1. Cấu hình Singleton Connection Pool (`src/config/db.js`)
```javascript
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true
    },
    pool: {
        max: 20,                  // Tối đa 20 kết nối đồng thời
        min: 5,                   // Duy trì sẵn 5 kết nối rảnh
        idleTimeoutMillis: 30000  // Đóng kết nối nếu nhàn rỗi quá 30 giây
    }
};

let poolPromise = new sql.ConnectionPool(config)
    .connect()
    .then(pool => {
        console.log('✅ Đã kết nối thành công tới SQL Server qua Connection Pool!');
        return pool;
    })
    .catch(err => {
        console.error('❌ Lỗi kết nối CSDL:', err);
        process.exit(1);
    });

module.exports = { sql, poolPromise };
```

### 9.2. Hàm Service gọi Stored Procedure có `@OUTPUT` (`src/services/orderService.js`)
```javascript
const { sql, poolPromise } = require('../config/db');

async function taoVaThanhToanDonHang(maKH, maNV, maKho) {
    try {
        const pool = await poolPromise;
        const request = pool.request();

        // 1. GỌI SP TẠO ĐƠN HÀNG MỚI (Lấy OUTPUT)
        request.input('MaKH', sql.Int, maKH);
        request.input('MaNV', sql.Int, maNV);
        request.input('MaKhoXuat', sql.Int, maKho);
        request.output('MaDHMoi', sql.Int);

        const resultTaoDon = await request.execute('sp_TaoDonHangMoi');
        const maDHMoi = resultTaoDon.output.MaDHMoi;

        // 2. GỌI SP THANH TOÁN AN TOÀN
        const requestThanhToan = pool.request();
        requestThanhToan.input('MaDH', sql.Int, maDHMoi);
        requestThanhToan.input('MaKho', sql.Int, maKho);

        const resultThanhToan = await requestThanhToan.execute('sp_ThanhToanDonHang_AnToan');

        return {
            success: true,
            maDH: maDHMoi,
            message: 'Đơn hàng đã được thanh toán thành công!'
        };
    } catch (err) {
        // Bắt lỗi RAISERROR từ SQL Server văng lên
        const errorMsg = err.originalError?.info?.message || err.message;
        throw new Error(errorMsg);
    }
}

module.exports = { taoVaThanhToanDonHang };
```

---

## BƯỚC 10: TẬP DƯỢT VẤN ĐÁP & KỊCH BẢN LIVE DEMO 3 BƯỚC

### 10.1. Phân chia trả lời vấn đáp (Bảo vệ 100% điểm cá nhân):
* **Nếu cô hỏi về Concurrency, Deadlock, Recovery, Normalization 3NF, Trigger đa dòng:** Quách Tài Lợi chủ động đứng lên trả lời dõng dạc.
* **Nếu cô hỏi về View & Constraint:** Khởi trả lời về Regex số điện thoại và View doanh thu.
* **Nếu cô hỏi về Function:** Bình trả lời về sự khác nhau giữa Scalar và Table-Valued Function.
* **Nếu cô hỏi về Index:** Kiệt trả lời về lý do dùng Filtered Index trên cột `DaXoa` và chỉ ra số liệu Subtree Cost trong ảnh chụp.
* **Nếu cô hỏi về Role & Web:** Tân trả lời về nguyên tắc Least Privilege (chỉ cấp quyền qua SP).

### 10.2. Kịch bản Live Demo 3 bước của Quách Tài Lợi:
1. **Bước 1 (Bình thường):** Mở Web mua 2 sản phẩm $\rightarrow$ Bấm thanh toán $\rightarrow$ Mở SSMS thấy tồn kho tự trừ 2 sản phẩm và `TongTien` tự nhảy đúng theo Trigger.
2. **Bước 2 (Cố tình phá hoại để chứng minh CSDL tự bảo vệ):** Nhập số lượng mua là 9999 cái $\rightarrow$ Bấm mua $\rightarrow$ SQL Server chặn lại, văng lỗi `RAISERROR` tiếng Việt $\rightarrow$ Web bắt đúng thông báo lỗi hiển thị modal cảnh báo (Khẳng định CSDL là tuyến phòng thủ cuối cùng).
3. **Bước 3 (Bảo mật Role):** Đăng nhập tài khoản Thu Ngân, cố tình bấm xem báo cáo doanh thu $\rightarrow$ Bị SQL Server từ chối lệnh (`Permission Denied`). Đăng nhập tài khoản Quản Lý Chi Nhánh $\rightarrow$ Xem báo cáo bình thường.
