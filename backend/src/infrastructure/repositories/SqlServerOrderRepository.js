const sql = require('mssql');
const IOrderRepository = require('../../core/domain/repositories/IOrderRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerOrderRepository extends IOrderRepository {
  async createOrder({ maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaKH', sql.Int, maKH);
    request.input('MaNV', sql.Int, maNV);
    request.input('MaKhoXuat', sql.Int, maKhoXuat);
    request.input('MaSP', sql.Int, maSP);
    request.input('SoLuong', sql.Int, soLuong);
    request.input('DonGiaBan', sql.Decimal(12, 2), donGiaBan);
    request.output('MaDH_Moi', sql.Int);

    const result = await request.execute('dbo.sp_TaoDonHangVaChiTiet');
    const maDH = result.output.MaDH_Moi;

    return {
      success: true,
      message: 'Tạo đơn hàng và trừ tồn kho thành công!',
      maDH
    };
  }

  async getInvoiceDetail(maDH, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaDH', sql.Int, maDH);

    // Gọi trực tiếp VIEW v_InHoaDon_ChiTietPhucHop
    const query = `
      SELECT 
        MaDH,
        NgayDat,
        TenTrangThai,
        MaKH,
        TenKhachHang,
        SoDTKhachHang,
        HangThanhVien,
        NhanVienLapDon,
        KhoXuatHang,
        MaSP,
        TenSP,
        DonViTinh,
        SoLuong,
        DonGiaBan,
        TienGoc,
        TienChietKhau,
        TienSauChietKhau,
        ThueVAT8Pct,
        TongThanhToanCuoiCung
      FROM v_InHoaDon_ChiTietPhucHop
      WHERE MaDH = @MaDH;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  async updateOrderStatus(maDH, trangThaiMoi, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaDH', sql.Int, maDH);
    request.input('TrangThaiMoi', sql.TinyInt, trangThaiMoi);

    const result = await request.execute('dbo.sp_CapNhatTrangThaiDonHang');
    return result.recordset?.[0] || { success: true };
  }

  async getOrdersByDateRange(tuNgay, denNgay, maCN, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('TuNgay', sql.DateTime, tuNgay || '2020-01-01');
    request.input('DenNgay', sql.DateTime, denNgay || '2030-12-31');
    request.input('MaCN', sql.Int, maCN || null);

    // Gọi trực tiếp INLINE TABLE-VALUED FUNCTION fn_DanhSachDonHangTheoKhoangThoiGian
    const query = `
      SELECT * 
      FROM dbo.fn_DanhSachDonHangTheoKhoangThoiGian(@TuNgay, @DenNgay, @MaCN)
      ORDER BY NgayDat DESC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }
}

module.exports = SqlServerOrderRepository;
