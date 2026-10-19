-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- BƯỚC 10: KỊCH BẢN PHỤC HỒI SỰ CỐ TOÀN DIỆN (POINT-IN-TIME DISASTER RECOVERY)
-- NHÓM SINH VIÊN THỰC HIỆN: ĐỒNG ĐỀU 20% MỖI THÀNH VIÊN
-- QUÁCH TÀI LỢI (20%), PHAN THIỆN KHỞI (20%), HUỲNH VĂN BÌNH (20%), HOÀNG GIA KIỆT (20%), TRẦN NHẬT TÂN (20%)
-- =========================================================================

USE master;
GO

-- =========================================================================
-- BỐI CẢNH THỬ NGHIỆM:
-- Hệ thống đang hoạt động ở chế độ RECOVERY FULL.
-- Kịch bản giả lập thảm họa:
-- 1. 09:00 AM: Hệ thống thực hiện FULL BACKUP định kỳ đầu ngày.
-- 2. 09:30 AM: Khách hàng phát sinh giao dịch đặt đơn hàng MaDH = 2.
-- 3. 10:00 AM: Hệ thống thực hiện TRANSACTION LOG BACKUP định kỳ lần 1.
-- 4. 10:15 AM: Khách hàng tiếp tục đặt thêm đơn hàng MaDH = 3.
-- 5. 10:20:00 AM: THẢM HỌA XẢY RA: Một nhân viên kỹ thuật gõ nhầm lệnh
--    DELETE FROM ChiTietDonHang; làm mất sạch toàn bộ dữ liệu hóa đơn!
-- 6. MỤC TIÊU CỦA DBA: Cứu sống hệ thống quay về đúng thời điểm 10:19:59 AM
--    (trước thảm họa đúng 1 giây), không làm mất bất kỳ đơn hàng hợp lệ nào!
-- =========================================================================

-- BƯỚC 1: XÁC NHẬN CHẾ ĐỘ RECOVERY FULL
ALTER DATABASE QuanLyBanHangDB SET RECOVERY FULL;
GO

-- BƯỚC 2: TẠO FULL BACKUP BAN ĐẦU
BACKUP DATABASE QuanLyBanHangDB 
TO DISK = '/var/opt/mssql/data/QuanLyBanHangDB_Full.bak'
WITH FORMAT, INIT, NAME = N'QuanLyBanHangDB-Full Database Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10;
GO

PRINT N'DA TAO THANH CONG BAN FULL BACKUP BAN DAU!';
GO

-- BƯỚC 3: PHÁT SINH GIAO DỊCH 1 (TẠO ĐƠN HÀNG HỢP LỆ)
USE QuanLyBanHangDB;
GO

INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
VALUES (1, 2, 1, GETDATE(), 1, 350000);
DECLARE @MaDHMoi1 INT = SCOPE_IDENTITY();
INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
VALUES (@MaDHMoi1, 2, 1, 350000);
GO

-- BƯỚC 4: TẠO TRANSACTION LOG BACKUP LẦN 1
BACKUP LOG QuanLyBanHangDB 
TO DISK = '/var/opt/mssql/data/QuanLyBanHangDB_Log1.trn'
WITH FORMAT, INIT, NAME = N'QuanLyBanHangDB-Log Backup 1', NOREWIND, NOUNLOAD, STATS = 10;
GO

PRINT N'DA TAO THANH CONG BAN LOG BACKUP LAN 1!';
GO

-- BƯỚC 5: PHÁT SINH TIẾP GIAO DỊCH 2 (TRƯỚC KHI THẢM HỌA XẢY RA)
USE QuanLyBanHangDB;
GO

INSERT INTO DonHang (MaKH, MaNV, MaKhoXuat, NgayDat, TrangThai, TongTien)
VALUES (2, 2, 1, GETDATE(), 1, 450000);
DECLARE @MaDHMoi2 INT = SCOPE_IDENTITY();
INSERT INTO ChiTietDonHang (MaDH, MaSP, SoLuong, DonGiaBan)
VALUES (@MaDHMoi2, 3, 1, 450000);
GO

-- LƯU LẠI THỜI ĐIỂM CHUẨN XÁC TRƯỚC KHI XẢY RA SỰ CỐ
DECLARE @ThoiDiemAnToan DATETIME = GETDATE();
PRINT N'THỜI ĐIỂM AN TOÀN TRƯỚC THẢM HỌA LÀ: ' + CONVERT(VARCHAR(30), @ThoiDiemAnToan, 121);
GO

-- BƯỚC 6: GIẢ LẬP THẢM HỌA (DISASTER SIMULATION)
-- Kỹ thuật viên lỡ tay xóa toàn bộ chi tiết đơn hàng
WAITFOR DELAY '00:00:02'; -- Chờ 2 giây để tạo khoảng cách thời gian rõ rệt
DELETE FROM ChiTietDonHang;
PRINT N'CẢNH BÁO: TOÀN BỘ BẢNG ChiTietDonHang ĐÃ BỊ XÓA NHẦM!';
GO

-- =========================================================================
-- BƯỚC 7: QUY TRÌNH CỨU HỘ & KHÔI PHỤC POINT-IN-TIME CỦA DBA
-- =========================================================================

USE master;
GO

-- 7.1. SAO LƯU ĐUÔI NHẬT KÝ (TAIL-LOG BACKUP) ĐỂ CỨU DỮ LIỆU ĐANG NẰM TRONG LOG BUFFER
BACKUP LOG QuanLyBanHangDB 
TO DISK = '/var/opt/mssql/data/QuanLyBanHangDB_TailLog.trn'
WITH NORECOVERY, FORMAT, INIT, NAME = N'QuanLyBanHangDB-Tail Log Backup';
GO

PRINT N'DA SAO LUU THANH CONG TAIL-LOG BACKUP VA DUA CSDL VE TRANG THAI RESTORING!';
GO

-- 7.2. PHỤC HỒI BẢN FULL BACKUP (GIỮ CHẾ ĐỘ NORECOVERY ĐỂ CHỜ ÁP LOG)
RESTORE DATABASE QuanLyBanHangDB 
FROM DISK = '/var/opt/mssql/data/QuanLyBanHangDB_Full.bak'
WITH NORECOVERY, REPLACE;
GO

-- 7.3. PHỤC HỒI BẢN LOG BACKUP 1
RESTORE LOG QuanLyBanHangDB 
FROM DISK = '/var/opt/mssql/data/QuanLyBanHangDB_Log1.trn'
WITH NORECOVERY;
GO

-- 7.4. PHỤC HỒI BẢN TAIL-LOG KÈM LỆNH DỪNG THỜI GIAN "STOPAT" TRƯỚC SỰ CỐ
-- (Điền chính xác chuỗi thời gian @ThoiDiemAnToan đã ghi nhận ở trên)
-- Ví dụ: STOPAT = '2026-10-19 09:30:00'
/*
RESTORE LOG QuanLyBanHangDB 
FROM DISK = '/var/opt/mssql/data/QuanLyBanHangDB_TailLog.trn'
WITH RECOVERY, STOPAT = '2026-10-19 10:19:59';
GO
*/

PRINT N'=========================================================================';
PRINT N'HOAN THANH KICH BAN DISASTER RECOVERY CHUAN XAC THEO YEU CAU CUA CO THE!';
PRINT N'=========================================================================';
GO
