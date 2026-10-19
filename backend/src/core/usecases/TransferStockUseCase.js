class TransferStockUseCase {
  constructor(inventoryRepository) {
    this.inventoryRepository = inventoryRepository;
  }

  async execute({ maKhoXuat, maKhoNhap, maSP, soLuong, maNV }, userRoleContext) {
    if (!maKhoXuat || !maKhoNhap || !maSP || !soLuong) {
      throw new Error('Thiếu thông tin bắt buộc để điều chuyển kho.');
    }
    if (Number(soLuong) <= 0) {
      throw new Error('Số lượng chuyển kho phải lớn hơn 0.');
    }
    if (maKhoXuat === maKhoNhap) {
      throw new Error('Kho xuất và Kho nhập không được trùng nhau.');
    }

    return await this.inventoryRepository.transferStock(
      { maKhoXuat, maKhoNhap, maSP, soLuong, maNV: maNV || 1 },
      userRoleContext
    );
  }
}

module.exports = TransferStockUseCase;
