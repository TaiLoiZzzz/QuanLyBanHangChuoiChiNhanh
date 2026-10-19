const sql = require('mssql');
const IInventoryRepository = require('../../core/domain/repositories/IInventoryRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerInventoryRepository extends IInventoryRepository {
  // 1. KHUNG NHÌN 1: v_BaoCaoTonKho_XepHang
  async getRankedStockReport(userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

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

  // 2. THỦ TỤC 3: sp_ChuyenKhoNoiBo
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

  // 3. GIAO DỊCH 5 (ACID Tx 5): usp_Tx_ChuyenKhoHangHoaLienChiNhanh
  async transferInterBranchStockTx({ maKhoXuat, maKhoNhap, maSP, soLuong }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaKhoXuat', sql.Int, maKhoXuat);
    request.input('MaKhoNhap', sql.Int, maKhoNhap);
    request.input('MaSP', sql.Int, maSP);
    request.input('SoLuong', sql.Int, soLuong);

    const result = await request.execute('dbo.usp_Tx_ChuyenKhoHangHoaLienChiNhanh');
    return result.recordset?.[0] || { success: true };
  }
}

module.exports = SqlServerInventoryRepository;
