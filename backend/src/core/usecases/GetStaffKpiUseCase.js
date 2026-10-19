class GetStaffKpiUseCase {
  constructor(reportRepository) {
    this.reportRepository = reportRepository;
  }

  async execute(year, userRoleContext) {
    const targetYear = year || new Date().getFullYear();
    return await this.reportRepository.getStaffKpiReport(targetYear, userRoleContext);
  }
}

module.exports = GetStaffKpiUseCase;
