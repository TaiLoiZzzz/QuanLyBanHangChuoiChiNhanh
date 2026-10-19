-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN HƯỚNG DẪN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- KỊCH BẢN TẠO FILE BACKUP (.BAK) CHO CƠ SỞ DỮ LIỆU QuanLyBanHangDB
-- NHÓM SINH VIÊN: Lợi (20%), Khởi (20%), Bình (20%), Kiệt (20%), Tân (20%)
-- =========================================================================

USE master;
GO

-- 1. ĐẢM BẢO DATABASE Ở CHẾ ĐỘ RECOVERY FULL
ALTER DATABASE QuanLyBanHangDB SET RECOVERY FULL;
GO

-- 2. THỰC HIỆN FULL BACKUP VÀO FILE .BAK (CÓ NÉN COMPRESSION & KIỂM TRA CHECKSUM)
-- Lưu ý đường dẫn:
-- + Nếu chạy trên Docker Container: '/var/opt/mssql/data/QuanLyBanHangDB.bak'
-- + Nếu chạy trực tiếp trên Windows SQL Server: 'C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\Backup\QuanLyBanHangDB.bak'
--   hoặc thư mục ổ đĩa tùy chọn: 'D:\QuanLyBanHangDB.bak'

DECLARE @BackupPath NVARCHAR(500);

-- Tự động phát hiện môi trường Docker Linux hay Windows
IF @@VERSION LIKE '%Linux%'
    SET @BackupPath = N'/var/opt/mssql/data/QuanLyBanHangDB.bak';
ELSE
    SET @BackupPath = N'C:\Backup\QuanLyBanHangDB.bak';

PRINT N'Dang thuc hien sao luu CSDL vao duong dan: ' + @BackupPath;

BACKUP DATABASE QuanLyBanHangDB 
TO DISK = @BackupPath
WITH 
    FORMAT,                             -- Ghi đè file nếu đã tồn tại
    INIT,                               -- Khởi tạo media set mới
    NAME = N'QuanLyBanHangDB-Full Database Backup',
    DESCRIPTION = N'Ban sao luu toan phan do an DBMS330284 - TS. Phan Thi The',
    COMPRESSION,                        -- Nen du lieu giam dung luong toi da
    CHECKSUM,                           -- Kiem tra toan ven block du lieu
    STATS = 10;                         -- Hien thi tien do moi 10%
GO

PRINT N'=========================================================================';
PRINT N'DA TAO THANH CONG FILE BACKUP (.BAK) CHO QuanLyBanHangDB!';
PRINT N'=========================================================================';
GO
