/**
 * =========================================================================
 * BỘ KIỂM SOÁT PHÂN QUYỀN TRUY CẬP FRONTEND (RBAC PERMISSION ENGINE)
 * KHỚP 100% VỚI CHÍNH SÁCH LEAST PRIVILEGE 4 ROLES TRONG SQL SERVER 2022
 * =========================================================================
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CASHIER: 'CASHIER',
  STOCK: 'STOCK',
  GUEST: 'GUEST'
};

export function getUserRole(currentUser) {
  if (!currentUser) return ROLES.GUEST;
  const username = (currentUser.username || '').toLowerCase();
  const roleName = (currentUser.role || '').toLowerCase();

  if (username === 'sa' || roleName === 'sysadmin' || roleName.includes('role_admin') || username.includes('admin')) {
    return ROLES.ADMIN;
  }
  if (username.includes('quanly') || roleName.includes('quanly') || roleName.includes('manager')) {
    return ROLES.MANAGER;
  }
  if (username.includes('thungan') || roleName.includes('thungan') || roleName.includes('cashier')) {
    return ROLES.CASHIER;
  }
  if (username.includes('thukho') || roleName.includes('thukho') || roleName.includes('stock')) {
    return ROLES.STOCK;
  }

  return ROLES.GUEST;
}

/**
 * Kiểm tra xem Role hiện tại có quyền truy cập màn hình chính nào
 */
export function canAccessScreen(role, screenId) {
  switch (screenId) {
    case 'products':
      // Tất cả vai trò đều được xem và tra cứu danh mục sản phẩm / giá bán / tồn kho
      return true;

    case 'orders':
      // Thu ngân (chính), Quản lý, Admin.
      // Thủ kho BỊ CẤM (DENY SELECT ON DonHang, ChiTietDonHang trong SQL Server)
      return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.CASHIER;

    case 'organization':
      // Quản lý và Admin được xem cơ cấu chi nhánh, khách hàng và phân cấp nhân sự.
      // Thu ngân và Thủ kho BỊ CẤM (DENY SELECT ON NhanVien)
      return role === ROLES.ADMIN || role === ROLES.MANAGER;

    case 'reports':
      // Admin, Quản lý (xem toàn bộ báo cáo, KPI, doanh thu)
      // Thủ kho (được xem Báo cáo tồn kho xếp hạng View 1 & Điều chuyển kho)
      // Thu ngân BỊ CẤM (Thu ngân không quản lý kho hay tài chính)
      return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.STOCK;

    default:
      return true;
  }
}

/**
 * Kiểm tra quyền hạn của các nút bấm / tính năng nghiệp vụ cụ thể
 */
export function canPerformAction(role, action) {
  switch (action) {
    // Quản lý sản phẩm
    case 'ADD_PRODUCT':
    case 'EDIT_PRODUCT':
    case 'DELETE_PRODUCT':
      return role === ROLES.ADMIN || role === ROLES.MANAGER;

    // Quản lý nhân sự & chi nhánh
    case 'ADD_BRANCH':
    case 'ADD_EMPLOYEE':
    case 'REORGANIZE_STAFF': // Tx 3
    case 'BATCH_PROMOTE_VIP': // Tx 4
      return role === ROLES.ADMIN || role === ROLES.MANAGER;

    case 'VIEW_RAW_SALARY':
      // Chỉ Admin / sa mới được xem trực tiếp bảng lương thô NhanVien
      // Quản lý chi nhánh bị DENY SELECT ON NhanVien (phải xem qua View không lộ lương)
      return role === ROLES.ADMIN;

    // Kho hàng
    case 'TRANSFER_STOCK': // SP 3 & Tx 5
      return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.STOCK;

    // Bán hàng & Đơn hàng
    case 'CREATE_ORDER': // SP 1 & Tx 1
    case 'CANCEL_ORDER': // Tx 2
    case 'PRINT_INVOICE':
      return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.CASHIER;

    // Báo cáo tài chính & Nhật ký
    case 'VIEW_FINANCIAL_REPORTS': // SP 5, mTVF 4, View 2
    case 'VIEW_AUDIT_LOGS':
      return role === ROLES.ADMIN || role === ROLES.MANAGER;

    case 'VIEW_INVENTORY_REPORT': // View 1
      return role === ROLES.ADMIN || role === ROLES.MANAGER || role === ROLES.STOCK;

    default:
      return false;
  }
}
