class IInventoryRepository {
  async getRankedStockReport(userRoleContext) {
    throw new Error('Method getRankedStockReport must be implemented');
  }

  async transferStock({ maKhoXuat, maKhoNhap, maSP, soLuong, maNV }, userRoleContext) {
    throw new Error('Method transferStock must be implemented');
  }
}

module.exports = IInventoryRepository;
