const sql = require('mssql');
const IOrderRepository = require('../../core/domain/repositories/IOrderRepository');
const connectionFactory = require('../database/SqlServerConnectionFactory');

class SqlServerOrderRepository extends IOrderRepository {
  // 1. THỦ TỤC 1: sp_TaoDonHangVaChiTiet
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

  // 2. KHUNG NHÌN 4 (v_InHoaDon_ChiTietPhucHop) + HÀM 5 (fn_FormatMaHoaDonTuDong)
  async getInvoiceDetail(maDH, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaDH', sql.Int, maDH);

    const query = `
      SELECT 
        v.MaDH,
        dbo.fn_FormatMaHoaDonTuDong(v.MaDH, v.NgayDat) AS MaHoaDonFormat,
        v.NgayDat,
        v.TenTrangThai,
        v.MaKH,
        v.TenKhachHang,
        v.SoDTKhachHang,
        v.HangThanhVien,
        v.NhanVienLapDon,
        v.KhoXuatHang,
        v.MaSP,
        v.TenSP,
        v.DonViTinh,
        v.SoLuong,
        v.DonGiaBan,
        v.TienGoc,
        v.TienChietKhau,
        v.TienSauChietKhau,
        v.ThueVAT8Pct,
        v.TongThanhToanCuoiCung
      FROM v_InHoaDon_ChiTietPhucHop v
      WHERE v.MaDH = @MaDH;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  // 3. THỦ TỤC 2: sp_CapNhatTrangThaiDonHang
  async updateOrderStatus(maDH, trangThaiMoi, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaDH', sql.Int, maDH);
    request.input('TrangThaiMoi', sql.TinyInt, trangThaiMoi);

    const result = await request.execute('dbo.sp_CapNhatTrangThaiDonHang');
    return result.recordset?.[0] || { success: true };
  }

  // 4. HÀM 3 (iTVF): fn_DanhSachDonHangTheoKhoangThoiGian
  async getOrdersByDateRange(tuNgay, denNgay, maCN, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('TuNgay', sql.DateTime, tuNgay || '2020-01-01');
    request.input('DenNgay', sql.DateTime, denNgay || '2030-12-31');
    request.input('MaCN', sql.Int, maCN || null);

    const query = `
      SELECT * 
      FROM dbo.fn_DanhSachDonHangTheoKhoangThoiGian(@TuNgay, @DenNgay, @MaCN)
      ORDER BY NgayDat DESC;
    `;

    const result = await request.query(query);
    return result.recordset;
  }

  // 5. HÀM 1 (Scalar): fn_TinhTienSauChietKhauVIP
  async calculateVipDiscount(maKH, tongTienGoc, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaKH', sql.Int, maKH);
    request.input('TongTienGoc', sql.Decimal(14, 2), tongTienGoc);

    const query = `
      SELECT dbo.fn_TinhTienSauChietKhauVIP(@MaKH, @TongTienGoc) AS TienSauChietKhau;
    `;

    const result = await request.query(query);
    return result.recordset?.[0]?.TienSauChietKhau || 0;
  }

  // 6. HÀM 2 (Scalar): fn_KiemTraKhaNangDapUngDonHang
  async checkStockAvailability(maKho, maSP, soLuong, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaKho', sql.Int, maKho);
    request.input('MaSP', sql.Int, maSP);
    request.input('SoLuong', sql.Int, soLuong);

    const query = `
      SELECT dbo.fn_KiemTraKhaNangDapUngDonHang(@MaKho, @MaSP, @SoLuong) AS DuHangDapUng;
    `;

    const result = await request.query(query);
    return Boolean(result.recordset?.[0]?.DuHangDapUng);
  }

  // 7. GIAO DỊCH 1 (ACID Tx 1): usp_Tx_DatHangVaGiuCho (UPDLOCK + HOLDLOCK)
  async createAtomicOrderWithHoldlock({ maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan }, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaKH', sql.Int, maKH);
    request.input('MaNV', sql.Int, maNV);
    request.input('MaKhoXuat', sql.Int, maKhoXuat);
    request.input('MaSP', sql.Int, maSP);
    request.input('SoLuong', sql.Int, soLuong);
    request.input('DonGiaBan', sql.Decimal(12, 2), donGiaBan);

    const result = await request.execute('dbo.usp_Tx_DatHangVaGiuCho');
    return result.recordset?.[0] || { success: true };
  }

  // 8. GIAO DỊCH 2 (ACID Tx 2): usp_Tx_HuyDonHangVaHoanTonKho (Bù trừ hoàn kho)
  async cancelOrderWithStockRefund(maDH, lyDoHuy, userContext) {
    const pool = await connectionFactory.getPool(userContext?.user, userContext?.password);
    const request = pool.request();

    request.input('MaDH', sql.Int, maDH);
    request.input('LyDoHuy', sql.NVarChar(200), lyDoHuy || 'Khách đổi ý');

    const result = await request.execute('dbo.usp_Tx_HuyDonHangVaHoanTonKho');
    return result.recordset?.[0] || { success: true };
  }
}

module.exports = SqlServerOrderRepository;
