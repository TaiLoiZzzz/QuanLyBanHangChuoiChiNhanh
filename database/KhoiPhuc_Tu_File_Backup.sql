-- =========================================================================
-- HỌC PHẦN: HỆ QUẢN TRỊ CƠ SỞ DỮ LIỆU (DBMS330284) - FIT, HCMUTE
-- GIẢNG VIÊN HƯỚNG DẪN: TS. PHAN THỊ THỂ
-- ĐỀ TÀI: QUẢN LÝ BÁN HÀNG & CHUỖI TỒN KHO ĐA CHI NHÁNH
-- KỊCH BẢN PHỤC HỒI (RESTORE) CSDL TỪ FILE BACKUP (.BAK)
-- NHÓM SINH VIÊN: Lợi (20%), Khởi (20%), Bình (20%), Kiệt (20%), Tân (20%)
-- =========================================================================

USE master;
GO

-- 1. NGẮT KẾT NỐI VÀ ĐƯA CSDL VỀ CHẾ ĐỘ SINGLE_USER ĐỂ RESTORE KHÔNG BỊ KHÓA
IF EXISTS (SELECT * FROM sys.databases WHERE name = 'QuanLyBanHangDB')
BEGIN
    ALTER DATABASE QuanLyBanHangDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
END;
GO

-- 2. TỰ ĐỘNG XÁC ĐỊNH ĐƯỜNG DẪN FILE BACKUP THEO MÔI TRƯỜNG
DECLARE @BackupPath NVARCHAR(500);

IF @@VERSION LIKE '%Linux%'
    SET @BackupPath = N'/var/opt/mssql/data/QuanLyBanHangDB.bak';
ELSE
    SET @BackupPath = N'C:\Backup\QuanLyBanHangDB.bak';

PRINT N'Dang thuc hien phuc hoi CSDL tu file: ' + @BackupPath;

-- 3. THỰC HIỆN RESTORE DATABASE VỚI REPLACE VÀ RECOVERY
RESTORE DATABASE QuanLyBanHangDB 
FROM DISK = @BackupPath
WITH 
    REPLACE,                            -- Ghi đè CSDL cũ nếu đã tồn tại
    RECOVERY,                           -- San sang dua CSDL vao su dung ngay
    STATS = 10;                         -- Hien thi tien do moi 10%
GO

-- 4. TRẢ LẠI CHẾ ĐỘ MULTI_USER CHO CƠ SỞ DỮ LIỆU
ALTER DATABASE QuanLyBanHangDB SET MULTI_USER;
GO

PRINT N'=========================================================================';
PRINT N'DA PHUC HOI THANH CONG CSDL QuanLyBanHangDB TU FILE .BAK!';
PRINT N'HE THONG DA SAN SANG DE KET NOI VA TEST UNG DUNG!';
PRINT N'=========================================================================';
GO
