const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
require('../backend/node_modules/dotenv').config({ path: path.join(__dirname,'../backend/.env') });
const sql = require('../backend/node_modules/mssql');
const root = path.join(__dirname,'..');
const config = () => ({server:process.env.DB_SERVER||process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT)||11433,database:'master',user:process.env.DB_USER,password:process.env.DB_PASSWORD,options:{encrypt:process.env.DB_ENCRYPT==='true',trustServerCertificate:process.env.DB_TRUST_SERVER_CERTIFICATE==='true'},pool:{max:1,min:0},requestTimeout:180000});
function prepare(source,db) {
 if(!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(db) || ['master','model','msdb','tempdb'].includes(db.toLowerCase())) throw new Error('Invalid DB_NAME');
 const prefix=process.env.LOGIN_PREFIX||'';
 if(prefix && (!db.startsWith('DBMSTest_') || !/^[A-Za-z0-9_]+$/.test(prefix))) throw new Error('LOGIN_PREFIX is only for isolated test databases');
 source=source.replace(/QuanLyBanHangDB/g,db);
 if(prefix) source=source.replace(/\bLogin_(Admin|QuanLyChiNhanh|ThuNgan|ThuKho)\b/g,n=>prefix+n);
 return source.replace(/\$\(([A-Z_]+)\)/g,(_,name)=>{
   const value=name==='RECOVERY_DB'?db:process.env[name];
   if(!value) throw new Error(`Missing ${name}; credentials are never defaulted`);
   return value.replace(/'/g,"''");
 });
}
async function batches(pool,source,tx) {
 let result;
 for(const batch of source.split(/^\s*GO\s*\r?$/mi)) if(batch.trim()) result=await new sql.Request(tx||pool).batch(batch);
 return result;
}
async function run(mode,db=process.env.DB_NAME||'QuanLyBanHangDB',options={}) {
 if(!/^[A-Za-z][A-Za-z0-9_]{0,100}$/.test(db) || ['master','model','msdb','tempdb'].includes(db.toLowerCase())) throw new Error('Refusing system/invalid database target');
 if(!process.env.DB_USER||!process.env.DB_PASSWORD) throw new Error('Set DB_USER and DB_PASSWORD in backend/.env');
 const pool=await new sql.ConnectionPool(config()).connect();
 try {
  let result;
  if(mode==='backup') {
   result=await batches(pool,prepare(fs.readFileSync(path.join(root,'database/Tao_File_Backup_QuanLyBanHangDB.sql'),'utf8'),db));
   console.log('Backup:',result.recordset[0].BackupFile);
  } else if(mode==='restore') {
   if(!options.replace || !process.env.RESTORE_FILE) throw new Error('Restore overwrites DB_NAME: supply RESTORE_FILE and --replace explicitly');
   await pool.request().query("EXEC sys.sp_set_session_context @key=N'AllowDatabaseRestore',@value=1");
   result=await batches(pool,prepare(fs.readFileSync(path.join(root,'database/KhoiPhuc_Tu_File_Backup.sql'),'utf8'),db));
  } else if(mode==='init') {
   if(options.reset) await pool.request().query("EXEC sys.sp_set_session_context @key=N'AllowDatabaseReset',@value=1");
   await batches(pool,prepare(fs.readFileSync(path.join(root,'database/00_KHOITAO_TOANBO_CSDL_RUN_ALL.sql'),'utf8'),db));
  } else if(mode==='migrate') {
   // A server-side full copy-only backup precedes every upgrade; never reuse/overwrite an earlier backup.
   const filename=db+'_before_migration_'+Date.now()+'_'+crypto.randomBytes(4).toString('hex')+'.bak';
   const backup=await pool.request().input('db',sql.NVarChar(128),db).input('name',sql.NVarChar(200),filename).query(`
    DECLARE @dir NVARCHAR(1000)=CONVERT(NVARCHAR(1000),SERVERPROPERTY('InstanceDefaultBackupPath'));
    IF @dir IS NULL SET @dir='/var/opt/mssql/data/';
    IF RIGHT(@dir,1) NOT IN('/','\\') SET @dir+=CASE WHEN @@VERSION LIKE '%Linux%' THEN '/' ELSE '\\' END;
    DECLARE @file NVARCHAR(1200)=@dir+@name;
    BACKUP DATABASE @db TO DISK=@file WITH COPY_ONLY,CHECKSUM;
    RESTORE VERIFYONLY FROM DISK=@file WITH CHECKSUM; SELECT @file AS BackupFile;`);
   console.log('Pre-migration backup:',backup.recordset[0].BackupFile);
   const tx=new sql.Transaction(pool);await tx.begin();
   try {await batches(pool,prepare(fs.readFileSync(path.join(root,'database/migrations/20261020_safe_retail.sql'),'utf8'),db),tx);await tx.commit();}
   catch(err){await tx.rollback().catch(()=>{});throw err;}
  } else if(mode==='recovery') {
   if(!db.startsWith('DBMSTest_')&&!db.endsWith('_RecoveryDemo')) throw new Error('Recovery requires a dedicated disposable DB');
   await batches(pool,prepare(fs.readFileSync(path.join(root,'database/10_KichBan_PhucHoiSuCo_Recovery.sql'),'utf8'),db));
  } else throw new Error('Use init [--reset], migrate, backup, restore --replace, or recovery');
  console.log(`${mode}: ${db} OK`);
  return result?.recordset?.[0];
 } finally {await pool.close();}
}
module.exports={run,prepare,batches,config};
if(require.main===module)run(process.argv[2],undefined,{reset:process.argv.includes('--reset'),replace:process.argv.includes('--replace')}).catch(err=>{console.error(err.message);process.exitCode=1;});
