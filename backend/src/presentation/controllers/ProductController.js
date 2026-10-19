class ProductController {
  constructor(searchProductsUseCase) {
    this.searchProductsUseCase = searchProductsUseCase;
  }

  async search(req, res, next) {
    try {
      const { tuKhoa, maDM, giaMin, giaMax } = req.query;
      const userContext = req.userContext;
      const products = await this.searchProductsUseCase.execute(
        { tuKhoa, maDM, giaMin, giaMax },
        userContext
      );
      res.json({
        success: true,
        count: products.length,
        products
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProductController;
