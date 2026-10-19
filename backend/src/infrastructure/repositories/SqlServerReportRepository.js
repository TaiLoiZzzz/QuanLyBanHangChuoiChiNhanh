const sql = require('mssql');
const IReportRepository = require('../../core/domain/repositories/IReportRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerReportRepository extends IReportRepository {
  async getStaffKpiReport(year, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('Nam', sql.Int, year);

    // Gọi MULTI-STATEMENT TABLE-VALUED FUNCTION fn_BaoCaoDoanhThuNhanVienChiTiet
    const query = `
      SELECT MaNV, HoTen, TenChiNhanh, SoDonHangDaChot, TongDoanhSo, DanhGiaKPI
      FROM dbo.fn_BaoCaoDoanhThuNhanVienChiTiet(@Nam)
      ORDER BY TongDoanhSo DESC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  async getBranchRevenueSummary(year, month, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('Nam', sql.Int, year);
    request.input('Thang', sql.Int, month || null);

    const result = await request.execute('dbo.sp_BaoCaoTongHopDoanhThuChiNhanh');
    return result.recordset;
  }

  async getIndexedProductSales(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    // Gọi INDEXED VIEW với hint WITH (NOEXPAND) để đọc thẳng từ Clustered Index trên đĩa
    const query = `
      SELECT v.MaSP, sp.TenSP, v.SoLanXuatHienTrongDon, v.TongSoLuongBan, v.TongDoanhThuThuVe
      FROM v_TongHopDoanhThuSanPham v WITH (NOEXPAND)
      INNER JOIN SanPham sp ON v.MaSP = sp.MaSP
      ORDER BY v.TongDoanhThuThuVe DESC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }
}

module.exports = SqlServerReportRepository;
