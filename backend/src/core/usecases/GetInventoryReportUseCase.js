class GetInventoryReportUseCase {
  constructor(inventoryRepository) {
    this.inventoryRepository = inventoryRepository;
  }

  async execute(userRoleContext) {
    return await this.inventoryRepository.getRankedStockReport(userRoleContext);
  }
}

module.exports = GetInventoryReportUseCase;
