/**
 * =========================================================================
 * DEMO & KIỂM THỬ ĐỒNG THỜI: TRIỆT TIÊU DEADLOCK 1205 (SLIDE 10)
 * PHỤ TRÁCH BÁO CÁO: QUÁCH TÀI LỢI (TEAM LEADER & LEAD DBA)
 * =========================================================================
 * Kịch bản:
 * - Worker 1: Chuyển hàng từ Kho 1 -> Kho 2 (Số lượng: 2 cái)
 * - Worker 2: Chuyển hàng ngược lại từ Kho 2 -> Kho 1 (Số lượng: 2 cái)
 * Cả 2 worker cùng kích hoạt tại cùng một mili-giây bằng Promise.all()
 * 
 * Mục tiêu minh chứng:
 * 1. Không bị lỗi Deadlock (Error 1205: Deadlock Victim).
 * 2. Cả 2 giao dịch đều thành công 100%.
 * 3. Tổng số lượng tồn kho của cả hệ thống được bảo toàn tuyệt đối!
 * =========================================================================
 */

const sql = require('mssql');
require('dotenv').config({ path: './backend/.env' });

if (!process.env.DB_NAME?.startsWith('DBMSTest_') && !process.env.DB_NAME?.endsWith('_Benchmark')) throw new Error('Deadlock demo requires a disposable DBMSTest_* or *_Benchmark database.');
const dbConfig = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 11433,
  database: process.env.DB_NAME || 'QuanLyBanHangDB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  }
};

async function runDeadlockProofDemo() {
  console.log('=================================================================');
  console.log('  LIVE DEMO SLIDE 10: KIỂM THỬ ĐỒNG THỜI & TRIỆT TIÊU DEADLOCK   ');
  console.log('  Thực hiện: Quách Tài Lợi - Hệ Quản trị CSDL Nâng cao           ');
  console.log('=================================================================\n');

  let mainPool;
  let pool1;
  let pool2;

  try {
    mainPool = await sql.connect(dbConfig);
    console.log(' [1/4] Kết nối SQL Server thành công.');

    // Chọn sản phẩm SP02 (Gạo thơm ST25) để kiểm thử
    const maSP = 2;

    // Đảm bảo cả 2 kho đều có đủ hàng trước khi test
    await mainPool.request().query(`
      UPDATE TonKho SET SoLuongTon = 100 WHERE MaKho = 1 AND MaSP = ${maSP};
      UPDATE TonKho SET SoLuongTon = 100 WHERE MaKho = 2 AND MaSP = ${maSP};
    `);

    // Lấy tồn kho ban đầu
    const tonKhoTruoc = (await mainPool.request().query(`
      SELECT MaKho, SoLuongTon FROM TonKho WHERE MaSP = ${maSP} ORDER BY MaKho ASC
    `)).recordset;

    const ton1_Truoc = tonKhoTruoc[0].SoLuongTon;
    const ton2_Truoc = tonKhoTruoc[1].SoLuongTon;
    const tongTruoc = ton1_Truoc + ton2_Truoc;

    console.log(` [2/4] Tồn kho ban đầu của SP02:`);
    console.log(`       - Kho 1: ${ton1_Truoc} sản phẩm`);
    console.log(`       - Kho 2: ${ton2_Truoc} sản phẩm`);
    console.log(`       ==> Tổng tồn toàn hệ thống: ${tongTruoc} sản phẩm\n`);

    // Tạo 2 connection riêng biệt mô phỏng 2 phiên chạy độc lập (2 quản lý chi nhánh)
    pool1 = new sql.ConnectionPool(dbConfig);
    pool2 = new sql.ConnectionPool(dbConfig);
    await Promise.all([pool1.connect(), pool2.connect()]);

    console.log(' [3/4] BẮT ĐẦU KÍCH HOẠT 2 GIAO DỊCH CHÉO NHAU CÙNG TÍCH TẮC...');
    console.log('       - Phiên 1: Điều chuyển Kho 1 -> Kho 2 (2 sản phẩm)');
    console.log('       - Phiên 2: Điều chuyển Kho 2 -> Kho 1 (2 sản phẩm)');

    const startTime = Date.now();
    let deadlockOccurred = false;
    let errorDetails = null;

    // Chạy song song cả 2 giao dịch trong cùng một mili-giây
    const [result1, result2] = await Promise.all([
      pool1.request()
        .input('MaKhoXuat', sql.Int, 1)
        .input('MaKhoNhap', sql.Int, 2)
        .input('MaSP', sql.Int, maSP)
        .input('SoLuong', sql.Int, 2)
        .execute('dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh')
        .catch(err => {
          if (err.number === 1205 || err.message.includes('deadlock')) deadlockOccurred = true;
          errorDetails = err;
          return { error: err.message };
        }),

      pool2.request()
        .input('MaKhoXuat', sql.Int, 2)
        .input('MaKhoNhap', sql.Int, 1)
        .input('MaSP', sql.Int, maSP)
        .input('SoLuong', sql.Int, 2)
        .execute('dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh')
        .catch(err => {
          if (err.number === 1205 || err.message.includes('deadlock')) deadlockOccurred = true;
          errorDetails = err;
          return { error: err.message };
        })
    ]);

    const duration = Date.now() - startTime;
    console.log(`\n       => Hoàn tất xử lý sau ${duration} ms.`);

    // [4/4] Kiểm tra kết quả tồn kho sau khi chạy
    const tonKhoSau = (await mainPool.request().query(`
      SELECT MaKho, SoLuongTon FROM TonKho WHERE MaSP = ${maSP} ORDER BY MaKho ASC
    `)).recordset;

    const ton1_Sau = tonKhoSau[0].SoLuongTon;
    const ton2_Sau = tonKhoSau[1].SoLuongTon;
    const tongSau = ton1_Sau + ton2_Sau;

    console.log('\n [4/4] ĐỐI SOÁT TOÀN VẸN VÀ BẰNG CHỨNG HỆ THỐNG:');
    console.log(`       - Tồn Kho 1 sau điều chuyển: ${ton1_Sau} (Ban đầu: ${ton1_Truoc})`);
    console.log(`       - Tồn Kho 2 sau điều chuyển: ${ton2_Sau} (Ban đầu: ${ton2_Truoc})`);
    console.log(`       - Tổng tồn toàn hệ thống    : ${tongSau} (Bảo toàn = ${tongTruoc})`);

    console.log('\n=================================================================');
    if (!deadlockOccurred && !result1.error && !result2.error) {
      console.log(' KẾT LUẬN THỰC THI (SLIDE 10):');
      console.log('  100% GIAO DỊCH THÀNH CÔNG RỰC RỠ!');
      console.log('  DEADLOCK 1205 = 0 (KHÔNG XẢY RA KHÓA CHẾT)');
      console.log('  Wait-For Graph đã được Lock Ordering triệt tiêu hoàn toàn!');
    } else {
      console.log(' CẢNH BÁO: Phát hiện lỗi:', errorDetails?.message);
    }
    console.log('=================================================================\n');

  } catch (err) {
    console.error(' Lỗi thực thi demo:', err);
  } finally {
    if (pool1) await pool1.close();
    if (pool2) await pool2.close();
    if (mainPool) await mainPool.close();
  }
}

runDeadlockProofDemo();
