class ReportController {
  constructor(getStaffKpiUseCase, getBranchRevenueUseCase, reportRepository) {
    this.getStaffKpiUseCase = getStaffKpiUseCase;
    this.getBranchRevenueUseCase = getBranchRevenueUseCase;
    this.reportRepository = reportRepository;
  }

  // 1. Hàm 4 (mTVF): fn_BaoCaoDoanhThuNhanVienChiTiet
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

  // 2. Thủ tục 5: sp_BaoCaoTongHopDoanhThuChiNhanh
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

  // 3. Khung nhìn 5 (Indexed View): v_TongHopDoanhThuSanPham WITH (NOEXPAND)
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

  // 4. Khung nhìn 2: v_PhanCapNhanSu_ToanDien (Self-Join Hierarchy)
  async getStaffHierarchy(req, res, next) {
    try {
      const userContext = req.userContext;
      const hierarchy = await this.reportRepository.getStaffHierarchyReport(userContext);
      res.json({
        success: true,
        count: hierarchy.length,
        hierarchy
      });
    } catch (err) {
      next(err);
    }
  }

  // 5. Khung nhìn 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)
  async getBranch1Staff(req, res, next) {
    try {
      const userContext = req.userContext;
      const staffList = await this.reportRepository.getBranch1StaffControlReport(userContext);
      res.json({
        success: true,
        count: staffList.length,
        staffList
      });
    } catch (err) {
      next(err);
    }
  }

  // 6. Giao dịch ACID Tx 3: usp_Tx_XoaNhanVienVaDieuChuyenQuanLy
  async reorganizeStaff(req, res, next) {
    try {
      const { maNVCantXoa, maQLThayThe } = req.body;
      const userContext = req.userContext;
      const result = await this.reportRepository.reorganizeStaffTx(
        { maNVCantXoa, maQLThayThe },
        userContext
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }

  // 7. Giao dịch ACID Tx 4: usp_Tx_ThangHangThanhVienHangLoat
  async batchPromote(req, res, next) {
    try {
      const { diemToiThieu, diemThuongBonus } = req.body;
      const userContext = req.userContext;
      const result = await this.reportRepository.batchPromoteCustomersTx(
        { diemToiThieu, diemThuongBonus },
        userContext
      );
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ReportController;
