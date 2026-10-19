const sql = require('mssql');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerMasterRepository {
  // 1. CHI NHÁNH
  async getBranches(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT cn.MaCN, cn.TenCN, cn.DiaChi, cn.SoDT,
             COUNT(DISTINCT k.MaKho) AS SoKhoHang,
             COUNT(DISTINCT nv.MaNV) AS SoNhanVien
      FROM ChiNhanh cn
      LEFT JOIN KhoHang k ON cn.MaCN = k.MaCN
      LEFT JOIN NhanVien nv ON cn.MaCN = nv.MaCN AND nv.DaXoa = 0
      GROUP BY cn.MaCN, cn.TenCN, cn.DiaChi, cn.SoDT
      ORDER BY cn.MaCN ASC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  async createBranch({ tenCN, diaChi, soDT }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('TenCN', sql.NVarChar(100), tenCN);
    request.input('DiaChi', sql.NVarChar(200), diaChi || null);
    request.input('SoDT', sql.Char(10), soDT);

    const query = `
      INSERT INTO ChiNhanh (TenCN, DiaChi, SoDT)
      OUTPUT INSERTED.MaCN, INSERTED.TenCN, INSERTED.DiaChi, INSERTED.SoDT
      VALUES (@TenCN, @DiaChi, @SoDT);
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  // 2. KHO HÀNG
  async getWarehouses(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT k.MaKho, k.TenKho, k.MaCN, cn.TenCN,
             COUNT(tk.MaSP) AS SoMatHangTon,
             ISNULL(SUM(tk.SoLuongTon), 0) AS TongSoLuongTonKho
      FROM KhoHang k
      INNER JOIN ChiNhanh cn ON k.MaCN = cn.MaCN
      LEFT JOIN TonKho tk ON k.MaKho = tk.MaKho
      GROUP BY k.MaKho, k.TenKho, k.MaCN, cn.TenCN
      ORDER BY k.MaKho ASC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  // 3. DANH MỤC
  async getCategories(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT dm.MaDM, dm.TenDM,
             COUNT(sp.MaSP) AS SoLuongSanPham
      FROM DanhMuc dm
      LEFT JOIN SanPham sp ON dm.MaDM = sp.MaDM AND sp.DaXoa = 0
      GROUP BY dm.MaDM, dm.TenDM
      ORDER BY dm.MaDM ASC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  // 4. KHÁCH HÀNG
  async getCustomers(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT kh.MaKH, kh.HoTen, kh.SoDT, kh.LoaiKH, kh.DiemTichLuy,
             CASE kh.LoaiKH
               WHEN 0 THEN N'Thường'
               WHEN 1 THEN N'VIP (Giảm 5%)'
               WHEN 2 THEN N'Kim Cương (Giảm 10%)'
               ELSE N'Khác'
             END AS TenHangThanhVien,
             COUNT(dh.MaDH) AS TongSoDonHang,
             ISNULL(SUM(dh.TongTien), 0) AS TongChiTieu
      FROM KhachHang kh
      LEFT JOIN DonHang dh ON kh.MaKH = dh.MaKH
      GROUP BY kh.MaKH, kh.HoTen, kh.SoDT, kh.LoaiKH, kh.DiemTichLuy
      ORDER BY kh.DiemTichLuy DESC, kh.MaKH ASC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  async createCustomer({ hoTen, soDT, loaiKH, diemTichLuy }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('HoTen', sql.NVarChar(100), hoTen);
    request.input('SoDT', sql.Char(10), soDT);
    request.input('LoaiKH', sql.TinyInt, loaiKH || 0);
    request.input('DiemTichLuy', sql.Int, diemTichLuy || 0);

    const query = `
      INSERT INTO KhachHang (HoTen, SoDT, LoaiKH, DiemTichLuy)
      OUTPUT INSERTED.MaKH, INSERTED.HoTen, INSERTED.SoDT, INSERTED.LoaiKH, INSERTED.DiemTichLuy
      VALUES (@HoTen, @SoDT, @LoaiKH, @DiemTichLuy);
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  // 5. NHÂN VIÊN
  async getEmployees(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT nv.MaNV, nv.HoTen, nv.Luong, nv.MaCN, cn.TenCN, nv.MaQL, ql.HoTen AS TenNguoiQuanLy, nv.DaXoa
      FROM NhanVien nv
      INNER JOIN ChiNhanh cn ON nv.MaCN = cn.MaCN
      LEFT JOIN NhanVien ql ON nv.MaQL = ql.MaNV
      WHERE nv.DaXoa = 0
      ORDER BY nv.MaCN, nv.MaNV ASC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }

  async createEmployee({ hoTen, luong, maCN, maQL }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('HoTen', sql.NVarChar(100), hoTen);
    request.input('Luong', sql.Decimal(12, 2), luong);
    request.input('MaCN', sql.Int, maCN);
    request.input('MaQL', sql.Int, maQL || null);

    const query = `
      INSERT INTO NhanVien (HoTen, Luong, MaCN, MaQL)
      OUTPUT INSERTED.MaNV, INSERTED.HoTen, INSERTED.Luong, INSERTED.MaCN, INSERTED.MaQL
      VALUES (@HoTen, @Luong, @MaCN, @MaQL);
    `;
    const result = await request.query(query);
    return result.recordset[0];
  }

  // 6. NHẬT KÝ HỆ THỐNG
  async getAuditLogs(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    const query = `
      SELECT TOP 50 MaLog, HanhDong, NoiDung, ThoiGian, NguoiThucHien
      FROM NhatKyHeThong
      ORDER BY ThoiGian DESC;
    `;
    const result = await request.query(query);
    return result.recordset;
  }
}

module.exports = SqlServerMasterRepository;
