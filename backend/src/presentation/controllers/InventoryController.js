class InventoryController {
  constructor(getInventoryReportUseCase, transferStockUseCase) {
    this.getInventoryReportUseCase = getInventoryReportUseCase;
    this.transferStockUseCase = transferStockUseCase;
  }

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
}

module.exports = InventoryController;
