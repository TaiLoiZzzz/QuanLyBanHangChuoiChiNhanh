class SearchProductsUseCase {
  constructor(productRepository) {
    this.productRepository = productRepository;
  }

  async execute(filter, userRoleContext) {
    return await this.productRepository.searchProducts(filter, userRoleContext);
  }
}

module.exports = SearchProductsUseCase;
