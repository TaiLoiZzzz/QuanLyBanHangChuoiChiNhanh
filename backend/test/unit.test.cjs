const test=require('node:test');
const assert=require('node:assert/strict');
const validate=require('../src/presentation/middlewares/validateInput');
const sessions=require('../src/presentation/middlewares/sessionStore');
test('multi-line invoice sums every line, including tax and discount',async()=>{
 const {sumInvoice}=await import('../../frontend/src/utils/invoice.js');
 assert.deepEqual(sumInvoice([{TienGoc:300000,TienSauChietKhau:300000,ThueVAT8Pct:24000,TongThanhToanCuoiCung:324000},{TienGoc:'350000',TienSauChietKhau:350000,ThueVAT8Pct:28000,TongThanhToanCuoiCung:378000}]),{TienGoc:650000,TienChietKhau:0,TienSauChietKhau:650000,ThueVAT8Pct:52000,TongThanhToanCuoiCung:702000});
});
test('role is never inferred from a username containing admin',async()=>{
 const {getUserRole,ROLES}=await import('../../frontend/src/utils/permissions.js');
 assert.equal(getUserRole({username:'fake_admin'}),ROLES.GUEST);
 assert.equal(getUserRole({username:'anything',role:'Role_ThuNgan'}),ROLES.CASHIER);
});
test('cookies are HttpOnly; logout invalidates the server session',()=>{
 const headers={};const req={headers:{}};const res={setHeader(k,v){headers[k]=v;}};
 sessions.create(req,res,{username:'test',role:'Role_ThuNgan'},'private');
 assert.match(headers['Set-Cookie'],/HttpOnly; SameSite=Strict/);
 req.headers.cookie=headers['Set-Cookie'].split(';')[0];assert.equal(sessions.get(req).user,'test');
 sessions.clear(req,res);assert.equal(sessions.get(req),null);
});
for(const [name,path,body] of [['blank name','/products',{tenSP:' ',maDM:1,giaBanHienTai:1,donViTinh:'Cai'}],['negative points','/customers',{hoTen:'Test',soDT:'0900000000',diemTichLuy:-1}],['long phone','/customers',{hoTen:'Test',soDT:'090000000000'}],['fractional quantity','/orders',{soLuong:1.5}]])
 test('validation rejects '+name,()=>{let error;validate({method:'POST',params:{},path,body},{},e=>{error=e;});assert.equal(error.status,422);});
test('generated SQL is current',()=>{require('node:child_process').execFileSync(process.execPath,[require('node:path').join(__dirname,'../../scripts/build-sql.cjs'),'--check']);});

test('database tools refuse system databases and SQL identifiers',()=>{
 const {prepare}=require('../../scripts/database.cjs');
 for(const name of ['master','tempdb','model','msdb','test]; DROP DATABASE x;--']) assert.throws(()=>prepare('SELECT 1',name));
});
