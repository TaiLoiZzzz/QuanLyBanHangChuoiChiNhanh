-- Run only against a dedicated disposable copy, supplied by the recovery CLI.
-- Timestamp variables stay in the same session/batch through backup and restore.
USE [$(RECOVERY_DB)];
SET NOCOUNT ON; SET XACT_ABORT ON;
SET ANSI_NULLS ON; SET QUOTED_IDENTIFIER ON; SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON; SET ARITHABORT ON; SET CONCAT_NULL_YIELDS_NULL ON; SET NUMERIC_ROUNDABORT OFF;
DECLARE @Db SYSNAME=DB_NAME();
IF @Db NOT LIKE 'DBMSTest[_]%' AND @Db NOT LIKE '%[_]RecoveryDemo'
 THROW 51303,N'Recovery demo chỉ được chạy trên CSDL DBMSTest_* hoặc *_RecoveryDemo.',1;
DECLARE @Dir NVARCHAR(1000)=CONVERT(NVARCHAR(1000),SERVERPROPERTY('InstanceDefaultBackupPath'));
IF @Dir IS NULL SET @Dir=N'/var/opt/mssql/data/';
IF RIGHT(@Dir,1) NOT IN('/','\') SET @Dir+=CASE WHEN @@VERSION LIKE '%Linux%' THEN '/' ELSE '\' END;
DECLARE @Full NVARCHAR(1200)=@Dir+@Db+N'_Full.bak',@Log NVARCHAR(1200)=@Dir+@Db+N'_Log.trn',@Tail NVARCHAR(1200)=@Dir+@Db+N'_Tail.trn';
ALTER DATABASE [$(RECOVERY_DB)] SET RECOVERY FULL;
BACKUP DATABASE @Db TO DISK=@Full WITH INIT,CHECKSUM;
DECLARE @Id INT;
EXEC dbo.sp_TaoDonHangVaChiTiet 1,2,1,2,1,350000,@Id OUTPUT;
BACKUP LOG @Db TO DISK=@Log WITH INIT,CHECKSUM;
EXEC dbo.sp_TaoDonHangVaChiTiet 2,2,1,3,1,450000,@Id OUTPUT;
-- Allow the preceding commit to be strictly before the datetime STOPAT boundary.
WAITFOR DELAY '00:00:01';
DECLARE @Safe DATETIME=GETDATE(),@Orders INT=(SELECT COUNT(*) FROM dbo.DonHang),@Lines INT=(SELECT COUNT(*) FROM dbo.ChiTietDonHang),@Total DECIMAL(38,2)=(SELECT SUM(TongTien) FROM dbo.DonHang);
WAITFOR DELAY '00:00:02';
DELETE ct FROM dbo.ChiTietDonHang ct JOIN dbo.DonHang dh ON dh.MaDH=ct.MaDH WHERE dh.TrangThai IN(0,1,2);
USE master;
BACKUP LOG @Db TO DISK=@Tail WITH INIT,CHECKSUM,NORECOVERY;
RESTORE DATABASE @Db FROM DISK=@Full WITH REPLACE,NORECOVERY;
-- STOPAT must be applied on every log, including when the target falls in an earlier backup.
RESTORE LOG @Db FROM DISK=@Log WITH NORECOVERY,STOPAT=@Safe;
RESTORE LOG @Db FROM DISK=@Tail WITH RECOVERY,STOPAT=@Safe;
USE [$(RECOVERY_DB)];
IF @Orders<>(SELECT COUNT(*) FROM dbo.DonHang) OR @Lines<>(SELECT COUNT(*) FROM dbo.ChiTietDonHang)
 OR @Total<>(SELECT SUM(TongTien) FROM dbo.DonHang)
 BEGIN
 DECLARE @Error NVARCHAR(2048)=CONCAT(N'Recovery mismatch: expected orders=',@Orders,N', lines=',@Lines,N'; actual orders=',(SELECT COUNT(*) FROM dbo.DonHang),N', lines=',(SELECT COUNT(*) FROM dbo.ChiTietDonHang));
 THROW 51304,@Error,1;
 END;
SELECT DB_NAME() AS RecoveredDatabase,@Safe AS RecoveredTo,@Orders AS OrdersRestored,@Lines AS LinesRestored,@Total AS TotalRestored;
