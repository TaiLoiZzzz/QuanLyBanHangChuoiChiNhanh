class IReportRepository {
  async getStaffKpiReport(year, userRoleContext) {
    throw new Error('Method getStaffKpiReport must be implemented');
  }

  async getBranchRevenueSummary(year, month, userRoleContext) {
    throw new Error('Method getBranchRevenueSummary must be implemented');
  }

  async getIndexedProductSales(userRoleContext) {
    throw new Error('Method getIndexedProductSales must be implemented');
  }
}

module.exports = IReportRepository;
