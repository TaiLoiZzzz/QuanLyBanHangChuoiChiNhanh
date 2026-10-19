class OrderController {
  constructor(createOrderUseCase, getInvoiceDetailUseCase, orderRepository) {
    this.createOrderUseCase = createOrderUseCase;
    this.getInvoiceDetailUseCase = getInvoiceDetailUseCase;
    this.orderRepository = orderRepository;
  }

  async create(req, res, next) {
    try {
      const { maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan } = req.body;
      const userContext = req.userContext;
      const result = await this.createOrderUseCase.execute(
        { maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan },
        userContext
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async getInvoice(req, res, next) {
    try {
      const { id } = req.params;
      const userContext = req.userContext;
      const items = await this.getInvoiceDetailUseCase.execute(id, userContext);
      res.json({
        success: true,
        maDH: id,
        count: items.length,
        items
      });
    } catch (err) {
      next(err);
    }
  }

  async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { trangThai } = req.body;
      const userContext = req.userContext;
      const result = await this.orderRepository.updateOrderStatus(id, trangThai, userContext);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async getOrders(req, res, next) {
    try {
      const { tuNgay, denNgay, maCN } = req.query;
      const userContext = req.userContext;
      const orders = await this.orderRepository.getOrdersByDateRange(tuNgay, denNgay, maCN, userContext);
      res.json({
        success: true,
        count: orders.length,
        orders
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OrderController;
