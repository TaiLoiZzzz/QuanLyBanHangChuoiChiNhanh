class GetInvoiceDetailUseCase {
  constructor(orderRepository) {
    this.orderRepository = orderRepository;
  }

  async execute(maDH, userRoleContext) {
    if (!maDH) {
      throw new Error('Mã đơn hàng không hợp lệ.');
    }
    return await this.orderRepository.getInvoiceDetail(maDH, userRoleContext);
  }
}

module.exports = GetInvoiceDetailUseCase;
