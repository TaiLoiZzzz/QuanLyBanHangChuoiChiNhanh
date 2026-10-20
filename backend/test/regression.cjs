// Disposable integration suite. Never runs writes against the configured application database.
const assert=require('node:assert/strict');const crypto=require('node:crypto');
const {run,config}=require('../../scripts/database.cjs');
const sql=require('mssql');
const suffix=Date.now()+'_'+crypto.randomBytes(3).toString('hex');
const db='DBMSTest_Retail_'+suffix;const recovery=db+'_RecoveryDemo';
const prefix='Test_'+suffix+'_';
const roles={Admin:'Admin',Manager:'QuanLyChiNhanh',Cashier:'ThuNgan',Stock:'ThuKho'};
process.env.DB_NAME=db;process.env.LOGIN_PREFIX=prefix;
for(const name of ['ADMIN','MANAGER','CASHIER','STOCK'])process.env['DB_'+name+'_PASSWORD']='Test_'+crypto.randomBytes(20).toString('hex')+'!';
let pool,server,factory;let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS',name);}
async function main(){
 await run('init',db);
 pool=await new sql.ConnectionPool({...config(),database:db,pool:{max:5,min:0}}).connect();
 const app=require('../src/app');factory=require('../src/infrastructure/database/SqlServerConnectionFactory');
 server=app.listen(0,'127.0.0.1');await new Promise(r=>server.on('listening',r));
 const base='http://127.0.0.1:'+server.address().port;
 const cookies={};
 async function http(path,method='GET',body,role){const headers={'Content-Type':'application/json'};if(role)headers.Cookie=cookies[role];const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});const data=await res.json();return {status:res.status,data,res};}
 const q=s=>pool.request().query(s);const value=async s=>(await q(s)).recordset[0].v;
 const stock=()=>value('SELECT SoLuongTon AS v FROM TonKho WHERE MaKho=1 AND MaSP=1');
 let id;
 await check('fresh install has 11 domain tables',async()=>assert.equal(await value('SELECT COUNT(*) AS v FROM sys.tables'),11));
 await check('anonymous read and write rejected',async()=>{assert.equal((await http('/api/customers')).status,401);assert.equal((await http('/api/branches','POST',{tenCN:'Forbidden',soDT:'0999999999'})).status,401);});
 for(const [role,name]of Object.entries(roles))await check('login '+role,async()=>{
  const r=await http('/api/auth/login','POST',{username:prefix+'Login_'+name,password:process.env['DB_'+role.toUpperCase()+'_PASSWORD']});assert.equal(r.status,200,JSON.stringify(r.data));assert.ok(!r.data.password);cookies[role]=r.res.headers.get('set-cookie').split(';')[0];
 });
 await check('wrong password after warmed pool is rejected',async()=>{assert.equal((await http('/api/products',undefined,undefined,'Admin')).status,200);assert.equal((await http('/api/auth/login','POST',{username:prefix+'Login_Admin',password:'wrong'})).status,401);});
 await check('cashier sees POS staff with no salary',async()=>{const r=await http('/api/employees','GET',undefined,'Cashier');assert.equal(r.status,200);assert.equal(r.data.employees.length,3);assert.ok(r.data.employees.every(n=>n.Luong===null));});
 await check('stock cannot read customers or financial reports',async()=>{assert.equal((await http('/api/customers','GET',undefined,'Stock')).status,403);assert.equal((await http('/api/reports/indexed-sales','GET',undefined,'Stock')).status,403);});
 await check('manager can create/update/delete product atomically',async()=>{
  let r=await http('/api/products','POST',{tenSP:'Regression',maDM:1,giaBanHienTai:120000,donViTinh:'Cai'},'Manager');assert.equal(r.status,201,JSON.stringify(r.data));const sp=r.data.product.MaSP;
  assert.equal(await value(`SELECT COUNT(*) AS v FROM TonKho WHERE MaSP=${sp}`),2);
  r=await http('/api/products/'+sp,'PUT',{tenSP:'Regression2',maDM:1,giaBanHienTai:150000,donViTinh:'Cai'},'Manager');assert.equal(r.status,200,JSON.stringify(r.data));
  assert.equal(await value(`SELECT COUNT(*) AS v FROM LichSuGia WHERE MaSP=${sp}`),1);
  assert.equal((await http('/api/products/'+sp,'DELETE',undefined,'Manager')).status,200);
 });
 await check('manager creates branch and employee through limited procedures',async()=>{
  const b=await http('/api/branches','POST',{tenCN:'Test branch',soDT:'0999999901'},'Manager');assert.equal(b.status,201,JSON.stringify(b.data));
  const n=await http('/api/employees','POST',{hoTen:'Test employee',luong:10000000,maCN:b.data.branch.MaCN},'Manager');assert.equal(n.status,201,JSON.stringify(n.data));
 });
 await check('404 and input validation',async()=>{
  assert.equal((await http('/api/products/999999','PUT',{tenSP:'X',maDM:1,giaBanHienTai:1,donViTinh:'Cai'},'Admin')).status,404);
  assert.equal((await http('/api/products/999999','DELETE',undefined,'Admin')).status,404);
  assert.equal((await http('/api/customers','POST',{hoTen:'X',soDT:'0999999902',diemTichLuy:-1},'Admin')).status,422);
 });
 await check('cashier creates order; stock and total synchronize',async()=>{
  const before=await stock();const r=await http('/api/orders/atomic-reserve','POST',{maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:2,donGiaBan:150000},'Cashier');assert.equal(r.status,201,JSON.stringify(r.data));id=r.data.MaDH;assert.ok(id);assert.equal(await stock(),before-2);assert.equal(await value(`SELECT TongTien AS v FROM DonHang WHERE MaDH=${id}`),300000);
 });
 await check('both cancellation endpoints refund exactly once',async()=>{
  const before=await stock();assert.equal((await http('/api/orders/'+id+'/status','PATCH',{trangThai:4},'Cashier')).status,200);assert.equal(await stock(),before+2);
  assert.equal((await http('/api/orders/'+id+'/cancel-refund','POST',{lyDoHuy:'retry'},'Cashier')).status,422);
  await q(`DELETE FROM DonHang WHERE MaDH=${id}`);assert.equal(await stock(),before+2);
 });
 await check('normal cancellation then deletion never refunds twice',async()=>{
  const before=await stock();const r=await http('/api/orders','POST',{maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:2,donGiaBan:150000},'Cashier');assert.equal(r.status,201,JSON.stringify(r.data));const order=r.data.maDH;
  assert.equal((await http('/api/orders/'+order+'/cancel-refund','POST',{lyDoHuy:'test'},'Cashier')).status,200);
  await q(`DELETE FROM DonHang WHERE MaDH=${order}`);assert.equal(await stock(),before);
 });
 await check('invoice has all lines, frozen discount, and aligned aliases',async()=>{
  const inv=await http('/api/orders/1/invoice','GET',undefined,'Cashier');assert.equal(inv.data.items.length,2);assert.equal(inv.data.items.reduce((sum,n)=>sum+Number(n.TongThanhToanCuoiCung),0),702000);
  await q('UPDATE KhachHang SET LoaiKH=2 WHERE MaKH=1');
  const next=await http('/api/orders/1/invoice','GET',undefined,'Cashier');assert.deepEqual(next.data.items,inv.data.items);
  const list=await http('/api/orders','GET',undefined,'Cashier');assert.ok(list.data.orders[0].TenNhanVien);assert.ok(list.data.orders[0].TenKho);
 });
 await check('completed line changes and status reversal blocked',async()=>{await assert.rejects(q('UPDATE ChiTietDonHang SET SoLuong=3 WHERE MaDH=1 AND MaSP=1'));assert.equal((await http('/api/orders/1/status','PATCH',{trangThai:0},'Admin')).status,422);});
 await check('missing stock and changed line keys are rejected',async()=>{
  await q('INSERT DonHang(MaKH,MaNV,MaKhoXuat) VALUES(1,2,2)');const order=await value('SELECT MAX(MaDH) AS v FROM DonHang');
  await q('DELETE TonKho WHERE MaKho=2 AND MaSP=4');await assert.rejects(q(`INSERT ChiTietDonHang(MaDH,MaSP,SoLuong,DonGiaBan) VALUES(${order},4,1,100000)`));
  await q('INSERT TonKho VALUES(2,4,5)');
  const r=await http('/api/orders','POST',{maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:1,donGiaBan:150000},'Admin');
  await assert.rejects(q(`UPDATE ChiTietDonHang SET MaSP=3 WHERE MaDH=${r.data.maDH}`));
 });
 await check('atomic checkout rejects retired staff and discontinued products',async()=>{
  await q('UPDATE NhanVien SET DaXoa=1 WHERE MaNV=2');const body={maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:1,donGiaBan:150000};
  assert.equal((await http('/api/orders/atomic-reserve','POST',body,'Admin')).status,422);await q('UPDATE NhanVien SET DaXoa=0 WHERE MaNV=2; UPDATE SanPham SET DaXoa=1 WHERE MaSP=1');assert.equal((await http('/api/orders/atomic-reserve','POST',body,'Admin')).status,422);await q('UPDATE SanPham SET DaXoa=0 WHERE MaSP=1');
 });
 await check('HR self/descendant replacement rejected',async()=>{await assert.rejects(q('EXEC usp_Tx_XoaNhanVienVaDieuChuyenQuanLy 1,2'));});
 await check('canceled/new orders never increase completed indexed revenue',async()=>{
  const before=await value('SELECT SUM(TongDoanhThuThuVe) AS v FROM v_TongHopDoanhThuSanPham WITH(NOEXPAND)');
  const r=await http('/api/orders','POST',{maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:1,donGiaBan:150000},'Admin');
  await http('/api/orders/'+r.data.maDH+'/cancel-refund','POST',{lyDoHuy:'test'},'Admin');assert.equal(await value('SELECT SUM(TongDoanhThuThuVe) AS v FROM v_TongHopDoanhThuSanPham WITH(NOEXPAND)'),before);
 });
 await check('concurrent last-item sale permits one winner',async()=>{
  await q('UPDATE TonKho SET SoLuongTon=1 WHERE MaKho=1 AND MaSP=1');const body={maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:1,donGiaBan:150000};
  const results=await Promise.all([http('/api/orders','POST',body,'Cashier'),http('/api/orders/atomic-reserve','POST',body,'Cashier')]);assert.deepEqual(results.map(r=>r.status).sort(),[201,422]);assert.equal(await stock(),0);
 });
 await check('stock receipt replenishes new products; negative transfer rejected',async()=>{
  assert.equal((await http('/api/inventory/receipts','POST',{maKho:1,maSP:1,soLuong:10},'Stock')).status,201);assert.equal(await stock(),10);
  assert.equal((await http('/api/inventory/inter-branch-transfer','POST',{maKhoXuat:1,maKhoNhap:2,maSP:1,soLuong:-1},'Stock')).status,422);
 });
 await check('completion racing cancellation has one terminal outcome',async()=>{
  const before=await stock();const r=await http('/api/orders','POST',{maKH:1,maNV:2,maKhoXuat:1,maSP:1,soLuong:2,donGiaBan:150000},'Cashier');const order=r.data.maDH;assert.ok(order);
  await http('/api/orders/'+order+'/status','PATCH',{trangThai:1},'Cashier');await http('/api/orders/'+order+'/status','PATCH',{trangThai:2},'Cashier');
  const results=await Promise.all([http('/api/orders/'+order+'/status','PATCH',{trangThai:3},'Cashier'),http('/api/orders/'+order+'/cancel-refund','POST',{lyDoHuy:'race'},'Cashier')]);
  assert.deepEqual(results.map(r=>r.status).sort(),[200,422]);const state=await value('SELECT TrangThai AS v FROM DonHang WHERE MaDH='+order);assert.ok([3,4].includes(state));assert.equal(await stock(),state===4?before:before-2);
 });
 await check('both transfer APIs share ordering and preserve total stock',async()=>{
  const before=await value('SELECT SUM(SoLuongTon) AS v FROM TonKho WHERE MaSP=1');
  const results=await Promise.all([
   http('/api/inventory/transfer','POST',{maKhoXuat:1,maKhoNhap:2,maSP:1,soLuong:1,maNV:2},'Stock'),
   http('/api/inventory/inter-branch-transfer','POST',{maKhoXuat:2,maKhoNhap:1,maSP:1,soLuong:1},'Stock')]);
  assert.ok(results.every(r=>r.status===200),JSON.stringify(results));assert.equal(await value('SELECT SUM(SoLuongTon) AS v FROM TonKho WHERE MaSP=1'),before);
 });
 await check('failed stock initialization rolls back product creation',async()=>{
  await q("CREATE TRIGGER dbo.TestStockFailure ON dbo.TonKho AFTER INSERT AS BEGIN IF EXISTS(SELECT 1 FROM inserted i JOIN dbo.SanPham sp ON sp.MaSP=i.MaSP WHERE sp.TenSP=N'Abort Regression') THROW 51999,N'Injected test failure',1; END");
  try {assert.equal((await http('/api/products','POST',{tenSP:'Abort Regression',maDM:1,giaBanHienTai:1000,donViTinh:'Cai'},'Manager')).status,422);assert.equal(await value("SELECT COUNT(*) AS v FROM SanPham WHERE TenSP=N'Abort Regression'"),0);}finally{await q('DROP TRIGGER dbo.TestStockFailure');}
 });
 await check('POS and report read contracts for allowed roles',async()=>{
  for(const role of ['Admin','Manager','Cashier'])for(const path of ['/api/products','/api/branches','/api/customers','/api/employees','/api/warehouses','/api/categories']){
   const r=await http(path,'GET',undefined,role);assert.equal(r.status,200,role+' '+path+': '+JSON.stringify(r.data));
  }
  for(const path of ['/api/reports/staff-kpi?year=2026','/api/reports/branch-revenue?year=2026','/api/reports/indexed-sales','/api/reports/staff-hierarchy','/api/reports/branch1-staff','/api/audit-logs'])assert.equal((await http(path,'GET',undefined,'Manager')).status,200,path);
 });
 await check('5000 fixture orders retain triggers and valid totals',async()=>{
  const before=await value('SELECT COUNT(*) AS v FROM DonHang');await pool.request().execute('dbo.sp_SinhDuLieuMau_TestTai');
  assert.equal(await value('SELECT COUNT(*) AS v FROM DonHang'),before+5000);assert.equal(await value('SELECT COUNT(*) AS v FROM TonKho WHERE SoLuongTon<0'),0);
  assert.equal(await value('SELECT COUNT(*) AS v FROM DonHang dh OUTER APPLY(SELECT SUM(ThanhTien) AS total FROM ChiTietDonHang ct WHERE ct.MaDH=dh.MaDH) x WHERE dh.TongTien<>ISNULL(x.total,0)'),0);
 });
 await check('logout invalidates cookie',async()=>{assert.equal((await http('/api/auth/logout','POST',{},'Cashier')).status,200);assert.equal((await http('/api/orders','GET',undefined,'Cashier')).status,401);});
 await check('reset without explicit opt-in refuses existing data',async()=>{await assert.rejects(run('init',db));});
 await check('migration refuses inconsistent legacy order totals',async()=>{
  await q('INSERT DonHang(MaKH,MaNV,MaKhoXuat,TongTien) VALUES(1,2,1,123)');const bad=await value('SELECT MAX(MaDH) AS v FROM DonHang');
  await assert.rejects(run('migrate',db));assert.equal(await value('SELECT TongTien AS v FROM DonHang WHERE MaDH='+bad),123);
  await q('DELETE FROM DonHang WHERE MaDH='+bad);
 });
 await check('legacy snapshot migration preserves rows and is repeatable',async()=>{
  await factory.closeAll();
  await q(`DROP VIEW v_TongHopDoanhThuSanPham; DROP VIEW v_InHoaDon_ChiTietPhucHop; DROP TRIGGER trg_DonHang_CapNhatDiemTichLuyKhachHang;
    ALTER TABLE DonHang DROP CONSTRAINT CK_DonHang_ChietKhau,CK_DonHang_VAT,DF_DonHang_ChietKhau,DF_DonHang_VAT;
    ALTER TABLE DonHang DROP COLUMN TiLeChietKhau,TiLeVAT;`);
  const count=await value('SELECT COUNT(*) AS v FROM DonHang');
  await run('migrate',db);await run('migrate',db);assert.equal(await value('SELECT COUNT(*) AS v FROM DonHang'),count);assert.equal(await value('SELECT COUNT(*) AS v FROM SchemaMigrations'),1);
 });
 await check('migration failure rolls back instead of rewriting bad data',async()=>{
  await q("ALTER TABLE KhachHang DROP CONSTRAINT CK_KhachHang_Diem; INSERT KhachHang(HoTen,SoDT,DiemTichLuy) VALUES(N'Invalid legacy','0999999903',-1)");
  await assert.rejects(run('migrate',db));assert.equal(await value("SELECT DiemTichLuy AS v FROM KhachHang WHERE SoDT='0999999903'"),-1);
  await q("DELETE KhachHang WHERE SoDT='0999999903'");await run('migrate',db);
 });
 await check('recovery restores both legitimate transactions and verifies totals',async()=>{await run('init',recovery);await run('recovery',recovery);const p=await new sql.ConnectionPool({...config(),database:recovery}).connect();try{assert.equal((await p.request().query('SELECT COUNT(*) AS v FROM ChiTietDonHang')).recordset[0].v,4);}finally{await p.close();}});
 await check('full backup/restore requires explicit replacement and returns online',async()=>{
  const backup=await run('backup',recovery);process.env.RESTORE_FILE=backup.BackupFile;
  await assert.rejects(run('restore',recovery));await run('restore',recovery,{replace:true});
 });
 console.log('Integration checks passed:',passed);
}
async function cleanup(){
 if(factory)await factory.closeAll();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}if(pool)await pool.close();
 const master=await new sql.ConnectionPool(config()).connect();try{for(const name of [db,recovery])await master.request().batch(`IF DB_ID('${name}') IS NOT NULL BEGIN ALTER DATABASE [${name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [${name}]; END;`);for(const name of Object.values(roles))await master.request().batch(`IF SUSER_ID('${prefix}Login_${name}') IS NOT NULL DROP LOGIN [${prefix}Login_${name}];`);}finally{await master.close();}
}
main().catch(err=>{console.error(err);process.exitCode=1;}).finally(()=>cleanup().catch(err=>{console.error('Cleanup failed:',err.message);process.exitCode=1;}));
