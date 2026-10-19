class ReportController {
  constructor(getStaffKpiUseCase, getBranchRevenueUseCase, reportRepository) {
    this.getStaffKpiUseCase = getStaffKpiUseCase;
    this.getBranchRevenueUseCase = getBranchRevenueUseCase;
    this.reportRepository = reportRepository;
  }

  async getStaffKpi(req, res, next) {
    try {
      const { year } = req.query;
      const userContext = req.userContext;
      const report = await this.getStaffKpiUseCase.execute(year ? Number(year) : null, userContext);
      res.json({
        success: true,
        year: year || new Date().getFullYear(),
        report
      });
    } catch (err) {
      next(err);
    }
  }

  async getBranchRevenue(req, res, next) {
    try {
      const { year, month } = req.query;
      const userContext = req.userContext;
      const report = await this.getBranchRevenueUseCase.execute(
        { year: year ? Number(year) : null, month: month ? Number(month) : null },
        userContext
      );
      res.json({
        success: true,
        report
      });
    } catch (err) {
      next(err);
    }
  }

  async getIndexedSales(req, res, next) {
    try {
      const userContext = req.userContext;
      const sales = await this.reportRepository.getIndexedProductSales(userContext);
      res.json({
        success: true,
        sales
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
