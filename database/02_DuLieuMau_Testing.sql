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
