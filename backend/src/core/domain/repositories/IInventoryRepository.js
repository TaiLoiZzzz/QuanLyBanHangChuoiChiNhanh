class IInventoryRepository {
  // Gọi View 1: v_BaoCaoTonKho_XepHang
  async getRankedStockReport(userRoleContext) {
    throw new Error('Method getRankedStockReport must be implemented');
  }

  // Gọi Thủ tục 3: sp_ChuyenKhoNoiBo
  async transferStock({ maKhoXuat, maKhoNhap, maSP, soLuong, maNV }, userRoleContext) {
    throw new Error('Method transferStock must be implemented');
  }

  // Gọi Giao dịch ACID 5: usp_Tx_ChuyenKhoHangHoaLienChiNhanh
  async transferInterBranchStockTx({ maKhoXuat, maKhoNhap, maSP, soLuong }, userRoleContext) {
    throw new Error('Method transferInterBranchStockTx must be implemented');
  }
}

module.exports = IInventoryRepository;
