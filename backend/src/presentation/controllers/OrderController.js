class OrderController {
  constructor(createOrderUseCase, getInvoiceDetailUseCase, orderRepository) {
    this.createOrderUseCase = createOrderUseCase;
    this.getInvoiceDetailUseCase = getInvoiceDetailUseCase;
    this.orderRepository = orderRepository;
  }

  // 1. Tạo đơn hàng qua SP 1: sp_TaoDonHangVaChiTiet
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

  // 2. In hóa đơn qua View 4 (v_InHoaDon_ChiTietPhucHop) + UDF 5 (fn_FormatMaHoaDonTuDong)
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

  // 3. Cập nhật trạng thái qua SP 2: sp_CapNhatTrangThaiDonHang
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

  // 4. Lọc đơn hàng qua iTVF 3: fn_DanhSachDonHangTheoKhoangThoiGian
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

  // 5. Tính giá chiết khấu VIP qua Scalar UDF 1: fn_TinhTienSauChietKhauVIP
  async calculateDiscount(req, res, next) {
    try {
      const { maKH, tongTienGoc } = req.query;
      const userContext = req.userContext;
      const tienSauGiam = await this.orderRepository.calculateVipDiscount(maKH, tongTienGoc, userContext);
      res.json({
        success: true,
        maKH: Number(maKH),
        tongTienGoc: Number(tongTienGoc),
        tienSauGiam
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Kiểm tra khả năng đáp ứng kho qua Scalar UDF 2: fn_KiemTraKhaNangDapUngDonHang
  async checkStock(req, res, next) {
    try {
      const { maKho, maSP, soLuong } = req.query;
      const userContext = req.userContext;
      const duHang = await this.orderRepository.checkStockAvailability(maKho, maSP, soLuong, userContext);
      res.json({
        success: true,
        maKho: Number(maKho),
        maSP: Number(maSP),
        soLuong: Number(soLuong),
        duHangDapUng: duHang
      });
    } catch (err) {
      next(err);
    }
  }

  // 7. Đặt hàng giữ chỗ qua Giao dịch ACID Tx 1: usp_Tx_DatHangVaGiuCho
  async createAtomic(req, res, next) {
    try {
      const { maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan } = req.body;
      const userContext = req.userContext;
      const result = await this.orderRepository.createAtomicOrderWithHoldlock(
        { maKH, maNV, maKhoXuat, maSP, soLuong, donGiaBan },
        userContext
      );
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  // 8. Hủy đơn và hoàn tồn kho qua Giao dịch ACID Tx 2: usp_Tx_HuyDonHangVaHoanTonKho
  async cancelRefund(req, res, next) {
    try {
      const { id } = req.params;
      const { lyDoHuy } = req.body;
      const userContext = req.userContext;
      const result = await this.orderRepository.cancelOrderWithStockRefund(id, lyDoHuy, userContext);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OrderController;
