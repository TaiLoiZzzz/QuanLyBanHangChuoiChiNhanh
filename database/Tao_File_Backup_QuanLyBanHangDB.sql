-- Unique COPY_ONLY backup: preserve the normal backup chain and never overwrite a prior file.
USE master;
SET NOCOUNT ON;
DECLARE @Db SYSNAME=N'QuanLyBanHangDB';
IF DB_ID(@Db) IS NULL THROW 51410,N'CSDL không tồn tại.',1;
DECLARE @Dir NVARCHAR(1000)=CONVERT(NVARCHAR(1000),SERVERPROPERTY('InstanceDefaultBackupPath'));
IF @Dir IS NULL SET @Dir=N'/var/opt/mssql/data/';
IF RIGHT(@Dir,1) NOT IN('/','\') SET @Dir+=CASE WHEN @@VERSION LIKE '%Linux%' THEN '/' ELSE '\' END;
DECLARE @File NVARCHAR(1200)=@Dir+@Db+N'_'+REPLACE(REPLACE(CONVERT(NVARCHAR(30),SYSUTCDATETIME(),126),':',''),'.','')+N'_'+CONVERT(NVARCHAR(36),NEWID())+N'.bak';
BACKUP DATABASE @Db TO DISK=@File WITH COPY_ONLY,CHECKSUM,STATS=10;
RESTORE VERIFYONLY FROM DISK=@File WITH CHECKSUM;
SELECT @File AS BackupFile;
