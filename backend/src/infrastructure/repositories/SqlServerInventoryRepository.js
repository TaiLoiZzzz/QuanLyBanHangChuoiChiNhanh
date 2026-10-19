const sql = require('mssql');
const IInventoryRepository = require('../../core/domain/repositories/IInventoryRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerInventoryRepository extends IInventoryRepository {
  async getRankedStockReport(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    // Gọi trực tiếp VIEW v_BaoCaoTonKho_XepHang
    const query = `
      SELECT 
        MaCN,
        TenCN,
        MaKho,
        TenKho,
        MaSP,
        TenSP,
        TenDM,
        DonViTinh,
        SoLuongTon,
        GiaBanHienTai,
        TongGiaTriTonKho,
        TyTrongTonKhoPct,
        HangKhanHiemTaiChiNhanh,
        TrangThaiTonKho
      FROM v_BaoCaoTonKho_XepHang
      ORDER BY TenCN, HangKhanHiemTaiChiNhanh ASC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  async transferStock({ maKhoXuat, maKhoNhap, maSP, soLuong, maNV }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaKhoXuat', sql.Int, maKhoXuat);
    request.input('MaKhoNhap', sql.Int, maKhoNhap);
    request.input('MaSP', sql.Int, maSP);
    request.input('SoLuongChuyen', sql.Int, soLuong);
    request.input('MaNVThucHien', sql.Int, maNV || 1);

    const result = await request.execute('dbo.sp_ChuyenKhoNoiBo');
    return result.recordset?.[0] || { success: true };
  }
}

module.exports = SqlServerInventoryRepository;
