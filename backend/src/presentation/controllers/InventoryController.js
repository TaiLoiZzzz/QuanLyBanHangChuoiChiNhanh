class InventoryController {
  constructor(getInventoryReportUseCase, transferStockUseCase, inventoryRepository) {
    this.getInventoryReportUseCase = getInventoryReportUseCase;
    this.transferStockUseCase = transferStockUseCase;
    this.inventoryRepository = inventoryRepository;
  }

  // 1. Khung nhìn 1: v_BaoCaoTonKho_XepHang
  async getReport(req, res, next) {
    try {
      const userContext = req.userContext;
      const report = await this.getInventoryReportUseCase.execute(userContext);
      res.json({
        success: true,
        count: report.length,
        report
      });
    } catch (err) {
      next(err);
    }
  }

  // 2. Thủ tục 3: sp_ChuyenKhoNoiBo
  async transfer(req, res, next) {
    try {
      const { maKhoXuat, maKhoNhap, maSP, soLuong, maNV } = req.body;
      const userContext = req.userContext;
      const result = await this.transferStockUseCase.execute(
        { maKhoXuat, maKhoNhap, maSP, soLuong, maNV },
        userContext
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 3. Giao dịch ACID Tx 5: usp_Tx_ChuyenKhoHangHoaLienChiNhanh
  async transferInterBranch(req, res, next) {
    try {
      const { maKhoXuat, maKhoNhap, maSP, soLuong } = req.body;
      const userContext = req.userContext;
      const result = await this.inventoryRepository.transferInterBranchStockTx(
        { maKhoXuat, maKhoNhap, maSP, soLuong },
        userContext
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = InventoryController;
