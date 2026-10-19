class CreateOrderUseCase {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async execute({ maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan }, userRoleContext) {
    if (!maKH || !maNV || !maKhoXuat || !maSP) {
      throw new Error('Thiếu thông tin bắt buộc để lập đơn hàng.');
    }
    if (!soLuong || Number(soLuong) <= 0) {
      throw new Error('Số lượng sản phẩm đặt mua phải lớn hơn 0.');
    }
    if (!donGiaBan || Number(donGiaBan) <= 0) {
      throw new Error('Đơn giá bán sản phẩm phải lớn hơn 0.');
    }

    return await this.orderRepository.createOrder(
      { maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan },
      userRoleContext
    );
  }
}

module.exports = CreateOrderUseCase;
