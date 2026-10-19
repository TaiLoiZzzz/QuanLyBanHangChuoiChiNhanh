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
}

module.exports = IOrderRepository;
