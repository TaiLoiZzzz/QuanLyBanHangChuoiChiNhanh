class IOrderRepository {
  async createOrder({ maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan }, userRoleContext) {
    throw new Error('Method createOrder must be implemented');
  }

  async getInvoiceDetail(maDH, userRoleContext) {
    throw new Error('Method getInvoiceDetail must be implemented');
  }

  async updateOrderStatus(maDH, trangThaiMoi, userRoleContext) {
    throw new Error('Method updateOrderStatus must be implemented');
  }

  async getOrdersByDateRange(tuNgay, denNgay, maCN, userRoleContext) {
    throw new Error('Method getOrdersByDateRange must be implemented');
  }

  // Gọi Scalar UDF fn_TinhTienSauChietKhauVIP
  async calculateVipDiscount(maKH, tongTienGoc, userRoleContext) {
    throw new Error('Method calculateVipDiscount must be implemented');
  }

  // Gọi Scalar UDF fn_KiemTraKhaNangDapUngDonHang
  async checkStockAvailability(maKho, maSP, soLuong, userRoleContext) {
    throw new Error('Method checkStockAvailability must be implemented');
  }

  // Gọi Giao dịch ACID 1: usp_Tx_DatHangVaGiuCho (UPDLOCK + HOLDLOCK)
  async createAtomicOrderWithHoldlock({ maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan }, userRoleContext) {
    throw new Error('Method createAtomicOrderWithHoldlock must be implemented');
  }

  // Gọi Giao dịch ACID 2: usp_Tx_HuyDonHangVaHoanTonKho (Bù trừ hoàn kho)
  async cancelOrderWithStockRefund(maDH, lyDoHuy, userRoleContext) {
    throw new Error('Method cancelOrderWithStockRefund must be implemented');
  }
}

module.exports = IOrderRepository;
