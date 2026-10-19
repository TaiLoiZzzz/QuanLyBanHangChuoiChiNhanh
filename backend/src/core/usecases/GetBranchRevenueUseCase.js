class GetBranchRevenueUseCase {
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  async execute({ year, month }, userRoleContext) {
    const targetYear = year || new Date().getFullYear();
    return await this.reportRepository.getBranchRevenueSummary(targetYear, month || null, userRoleContext);
  }
}

module.exports = GetBranchRevenueUseCase;
