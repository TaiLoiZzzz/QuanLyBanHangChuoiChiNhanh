const sql = require('mssql');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerMasterRepository {
  // 1. CHI NHÁNH
  async getBranches(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    try {
      const query = `
        SELECT cn.MaCN, cn.TenCN, cn.DiaChi, cn.SoDT,
               COUNT(DISTINCT k.MaKho) AS SoKhoHang,
               COUNT(DISTINCT nv.MaNV) AS SoNhanVien
        FROM ChiNhanh cn
        LEFT JOIN KhoHang k ON cn.MaCN = k.MaCN
        LEFT JOIN dbo.v_NhanVien_BanHang nv ON cn.MaCN = nv.MaCN
        GROUP BY cn.MaCN, cn.TenCN, cn.DiaChi, cn.SoDT
        ORDER BY cn.MaCN ASC;
      `;
      const result = await request.query(query);
      return result.recordset;
    } catch (err) {
      // Fallback nếu tài khoản không có quyền truy cập bảng NhanVien (Chính sách Least Privilege)
      if (err.number === 229 || err.message?.includes('permission was denied')) {
        const fbQuery = `
          SELECT cn.MaCN, cn.TenCN, cn.DiaChi, cn.SoDT,
                 COUNT(DISTINCT k.MaKho) AS SoKhoHang,
                 CAST(NULL AS INT) AS SoNhanVien
          FROM ChiNhanh cn
          LEFT JOIN KhoHang k ON cn.MaCN = k.MaCN
          GROUP BY cn.MaCN, cn.TenCN, cn.DiaChi, cn.SoDT
          ORDER BY cn.MaCN ASC;
        `;
        const fbResult = await pool.request().query(fbQuery);
        return fbResult.recordset;
      }
      throw err;
    }
  }

  async createBranch({ tenCN, diaChi, soDT }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('TenCN', sql.NVarChar(100), tenCN);
    request.input('DiaChi', sql.NVarChar(200), diaChi || null);
    request.input('SoDT', sql.Char(10), soDT);

    const result = await request.execute('dbo.usp_ThemChiNhanh');
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
               WHEN 1 THEN N'VIP (Giảm 10%)'
               WHEN 2 THEN N'Kim Cương (Giảm 15%)'
               ELSE N'Khác'
             END AS TenHangThanhVien,
             COUNT(dh.MaDH) AS TongSoDonHang,
             ISNULL(SUM(net.TienThuan), 0) AS TongChiTieu
      FROM KhachHang kh
      LEFT JOIN DonHang dh ON kh.MaKH = dh.MaKH AND dh.TrangThai=3
      OUTER APPLY (SELECT SUM(v.TienSauChietKhau) AS TienThuan FROM dbo.v_InHoaDon_ChiTietPhucHop v WHERE v.MaDH=dh.MaDH) net
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

    const result = await request.execute('dbo.usp_ThemKhachHang');
    return result.recordset[0];
  }

  // 5. NHÂN VIÊN
  async getEmployees(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const admin = userContext?.role === 'Role_Admin';
    const query = admin ? `SELECT nv.MaNV,nv.HoTen,nv.Luong,nv.MaCN,cn.TenCN,nv.MaQL,ql.HoTen AS TenNguoiQuanLy,nv.DaXoa
      FROM NhanVien nv JOIN ChiNhanh cn ON cn.MaCN=nv.MaCN LEFT JOIN NhanVien ql ON ql.MaNV=nv.MaQL WHERE nv.DaXoa=0`
      : `SELECT MaNV,HoTen,CAST(NULL AS DECIMAL(12,2)) AS Luong,MaCN,TenCN,MaQL,TenNguoiQuanLy,DaXoa FROM dbo.v_NhanVien_BanHang`;
    return (await pool.request().query(query)).recordset;
  }

  async createEmployee({ hoTen, luong, maCN, maQL }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();
    request.input('HoTen', sql.NVarChar(100), hoTen);
    request.input('Luong', sql.Decimal(12, 2), luong);
    request.input('MaCN', sql.Int, maCN);
    request.input('MaQL', sql.Int, maQL || null);

    const result = await request.execute('dbo.usp_ThemNhanVien');
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
