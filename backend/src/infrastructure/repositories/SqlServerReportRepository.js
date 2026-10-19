const sql = require('mssql');
const IReportRepository = require('../../core/domain/repositories/IReportRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerReportRepository extends IReportRepository {
  // 1. HÀM 4 (mTVF): fn_BaoCaoDoanhThuNhanVienChiTiet
  async getStaffKpiReport(year, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('Nam', sql.Int, year);

    const query = `
      SELECT MaNV, HoTen, TenChiNhanh, SoDonHangDaChot, TongDoanhSo, DanhGiaKPI
      FROM dbo.fn_BaoCaoDoanhThuNhanVienChiTiet(@Nam)
      ORDER BY TongDoanhSo DESC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  // 2. THỦ TỤC 5: sp_BaoCaoTongHopDoanhThuChiNhanh
  async getBranchRevenueSummary(year, month, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('Nam', sql.Int, year);
    request.input('Thang', sql.Int, month || null);

    const result = await request.execute('dbo.sp_BaoCaoTongHopDoanhThuChiNhanh');
    return result.recordset;
  }

  // 3. KHUNG NHÌN 5 (INDEXED VIEW): v_TongHopDoanhThuSanPham WITH (NOEXPAND)
  async getIndexedProductSales(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    const query = `
      SELECT v.MaSP, sp.TenSP, v.SoLanXuatHienTrongDon, v.TongSoLuongBan, v.TongDoanhThuThuVe
      FROM v_TongHopDoanhThuSanPham v WITH (NOEXPAND)
      INNER JOIN SanPham sp ON v.MaSP = sp.MaSP
      ORDER BY v.TongDoanhThuThuVe DESC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  // 4. KHUNG NHÌN 2: v_PhanCapNhanSu_ToanDien (Self-Join Hierarchy)
  async getStaffHierarchyReport(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    const query = `
      SELECT 
        MaNV,
        TenNhanVien,
        MaCN,
        ChiNhanhLamViec,
        MaQL,
        NguoiQuanLyTrucTiep,
        SoNhanVienDuoiQuyen,
        TongNhanSuChiNhanh
      FROM v_PhanCapNhanSu_ToanDien
      ORDER BY MaCN, MaNV ASC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  // 5. KHUNG NHÌN 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)
  async getBranch1StaffControlReport(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    const query = `
      SELECT 
        MaNV,
        HoTen,
        MaCN,
        MaQL,
        DaXoa
      FROM v_NhanVien_ChiNhanh1_KiemSoat;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  // 6. GIAO DỊCH 3 (ACID Tx 3): usp_Tx_XoaNhanVienVaDieuChuyenQuanLy
  async reorganizeStaffTx({ maNVCantXoa, maQLThayThe }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaNVCantXoa', sql.Int, maNVCantXoa);
    request.input('MaQLThayThe', sql.Int, maQLThayThe);

    const result = await request.execute('dbo.usp_Tx_XoaNhanVienVaDieuChuyenQuanLy');
    return result.recordset?.[0] || { success: true };
  }

  // 7. GIAO DỊCH 4 (ACID Tx 4): usp_Tx_ThangHangThanhVienHangLoat
  async batchPromoteCustomersTx({ diemToiThieu, diemThuongBonus }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('DiemToiThieu', sql.Int, diemToiThieu || 1000);
    request.input('DiemThuongBonus', sql.Int, diemThuongBonus || 100);

    const result = await request.execute('dbo.usp_Tx_ThangHangThanhVienHangLoat');
    return result.recordset?.[0] || { success: true };
  }
}

module.exports = SqlServerReportRepository;
