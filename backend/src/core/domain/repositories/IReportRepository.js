class IReportRepository {
  // Gọi mTVF 4: fn_BaoCaoDoanhThuNhanVienChiTiet
  async getStaffKpiReport(year, userRoleContext) {
    throw new Error('Method getStaffKpiReport must be implemented');
  }

  // Gọi Thủ tục 5: sp_BaoCaoTongHopDoanhThuChiNhanh
  async getBranchRevenueSummary(year, month, userRoleContext) {
    throw new Error('Method getBranchRevenueSummary must be implemented');
  }

  // Gọi View 5 (Indexed View): v_TongHopDoanhThuSanPham WITH (NOEXPAND)
  async getIndexedProductSales(userRoleContext) {
    throw new Error('Method getIndexedProductSales must be implemented');
  }

  // Gọi View 2: v_PhanCapNhanSu_ToanDien
  async getStaffHierarchyReport(userRoleContext) {
    throw new Error('Method getStaffHierarchyReport must be implemented');
  }

  // Gọi View 3: v_NhanVien_ChiNhanh1_KiemSoat (WITH CHECK OPTION)
  async getBranch1StaffControlReport(userRoleContext) {
    throw new Error('Method getBranch1StaffControlReport must be implemented');
  }

  // Gọi Giao dịch ACID 3: usp_Tx_XoaNhanVienVaDieuChuyenQuanLy
  async reorganizeStaffTx({ maNVCantXoa, maQLThayThe }, userRoleContext) {
    throw new Error('Method reorganizeStaffTx must be implemented');
  }

  // Gọi Giao dịch ACID 4: usp_Tx_ThangHangThanhVienHangLoat
  async batchPromoteCustomersTx({ diemToiThieu, diemThuongBonus }, userRoleContext) {
    throw new Error('Method batchPromoteCustomersTx must be implemented');
  }
}

module.exports = IReportRepository;
