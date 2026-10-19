// API Client kết nối với Backend Express (Port 5000)

const BASE_URL = '/api';

export function getAuthHeaders() {
  const savedUser = localStorage.getItem('dbms_user');
  if (savedUser) {
    try {
      const parsed = JSON.parse(savedUser);
      if (parsed.username && parsed.password) {
        return {
          'x-db-user': parsed.username,
          'x-db-password': parsed.password,
          'Content-Type': 'application/json'
        };
      }
    } catch (e) {
      console.error('Error parsing stored user auth', e);
    }
  }
  return {
    'Content-Type': 'application/json'
  };
}

export const api = {
  // Auth
  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return res.json();
  },

  // Products
  getProducts: async () => {
    const res = await fetch(`${BASE_URL}/products`, { headers: getAuthHeaders() });
    return res.json();
  },

  searchProducts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.tuKhoa) query.append('tuKhoa', params.tuKhoa);
    if (params.maDM) query.append('maDM', params.maDM);
    if (params.giaMin) query.append('giaMin', params.giaMin);
    if (params.giaMax) query.append('giaMax', params.giaMax);

    const res = await fetch(`${BASE_URL}/products/search?${query.toString()}`, { headers: getAuthHeaders() });
    return res.json();
  },

  createProduct: async (data) => {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateProduct: async (id, data) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  deleteProduct: async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Master Data (Chi nhánh, Kho, Danh mục, Khách hàng, Nhân sự)
  getBranches: async () => {
    const res = await fetch(`${BASE_URL}/branches`, { headers: getAuthHeaders() });
    return res.json();
  },

  createBranch: async (data) => {
    const res = await fetch(`${BASE_URL}/branches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getWarehouses: async () => {
    const res = await fetch(`${BASE_URL}/warehouses`, { headers: getAuthHeaders() });
    return res.json();
  },

  getCategories: async () => {
    const res = await fetch(`${BASE_URL}/categories`, { headers: getAuthHeaders() });
    return res.json();
  },

  getCustomers: async () => {
    const res = await fetch(`${BASE_URL}/customers`, { headers: getAuthHeaders() });
    return res.json();
  },

  createCustomer: async (data) => {
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getEmployees: async () => {
    const res = await fetch(`${BASE_URL}/employees`, { headers: getAuthHeaders() });
    return res.json();
  },

  createEmployee: async (data) => {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  // Orders
  getOrders: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.tuNgay) query.append('tuNgay', params.tuNgay);
    if (params.denNgay) query.append('denNgay', params.denNgay);
    if (params.maCN) query.append('maCN', params.maCN);

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`, { headers: getAuthHeaders() });
    return res.json();
  },

  getInvoiceDetail: async (orderId) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/invoice`, { headers: getAuthHeaders() });
    return res.json();
  },

  createOrder: async (data) => {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  createOrderAtomic: async (data) => {
    const res = await fetch(`${BASE_URL}/orders/atomic-reserve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  updateOrderStatus: async (orderId, trangThai) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ trangThai })
    });
    return res.json();
  },

  cancelOrder: async (orderId, lyDoHuy) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel-refund`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lyDoHuy })
    });
    return res.json();
  },

  checkStock: async (maKho, maSP, soLuong) => {
    const res = await fetch(`${BASE_URL}/orders/check-stock?maKho=${maKho}&maSP=${maSP}&soLuong=${soLuong}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  calculateVipDiscount: async (maKH, tongTienGoc) => {
    const res = await fetch(`${BASE_URL}/orders/vip-discount?maKH=${maKH}&tongTienGoc=${tongTienGoc}`, {
      headers: getAuthHeaders()
    });
    return res.json();
  },

  // Inventory & Reports
  getRankedInventoryReport: async () => {
    const res = await fetch(`${BASE_URL}/inventory/ranked-report`, { headers: getAuthHeaders() });
    return res.json();
  },

  transferStockInternal: async (data) => {
    const res = await fetch(`${BASE_URL}/inventory/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  transferStockInterBranch: async (data) => {
    const res = await fetch(`${BASE_URL}/inventory/inter-branch-transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return res.json();
  },

  getBranchRevenue: async (year, month) => {
    const query = new URLSearchParams();
    if (year) query.append('year', year);
    if (month) query.append('month', month);
    const res = await fetch(`${BASE_URL}/reports/branch-revenue?${query.toString()}`, { headers: getAuthHeaders() });
    return res.json();
  },

  getStaffKpi: async (year) => {
    const query = new URLSearchParams();
    if (year) query.append('year', year);
    const res = await fetch(`${BASE_URL}/reports/staff-kpi?${query.toString()}`, { headers: getAuthHeaders() });
    return res.json();
  },

  getIndexedSales: async () => {
    const res = await fetch(`${BASE_URL}/reports/indexed-sales`, { headers: getAuthHeaders() });
    return res.json();
  },

  getStaffHierarchy: async () => {
    const res = await fetch(`${BASE_URL}/reports/staff-hierarchy`, { headers: getAuthHeaders() });
    return res.json();
  },

  getBranch1Staff: async () => {
    const res = await fetch(`${BASE_URL}/reports/branch1-staff`, { headers: getAuthHeaders() });
    return res.json();
  },

  reorganizeStaff: async (maNVCantXoa, maQLThayThe) => {
    const res = await fetch(`${BASE_URL}/staff/reorganize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ maNVCantXoa, maQLThayThe })
    });
    return res.json();
  },

  batchPromoteCustomers: async (diemToiThieu, diemThuongBonus) => {
    const res = await fetch(`${BASE_URL}/customers/batch-promote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ diemToiThieu, diemThuongBonus })
    });
    return res.json();
  },

  getAuditLogs: async () => {
    const res = await fetch(`${BASE_URL}/audit-logs`, { headers: getAuthHeaders() });
    return res.json();
  }
};
