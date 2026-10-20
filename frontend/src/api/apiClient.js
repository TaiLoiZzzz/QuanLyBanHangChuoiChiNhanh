// API Client kết nối với Backend Express (Port 5000)

const BASE_URL = '/api';
export function getAuthHeaders() { return { 'Content-Type': 'application/json' }; }

async function parseResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { success: false, message: text || `Lỗi phản hồi HTTP: ${res.status}` };
    }
  }

  if (!res.ok && (!data || !data.success)) {
    const msg = data?.message || data?.error || `Lỗi máy chủ (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  receiveStock: async data => parseResponse(await fetch(`${BASE_URL}/inventory/receipts`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(data) })),
  // Cookie is HttpOnly; SQL credentials are never persisted in the browser.
  getSession: async () => parseResponse(await fetch(`${BASE_URL}/auth/me`, { cache: 'no-store' })),
  logout: async () => parseResponse(await fetch(`${BASE_URL}/auth/logout`, { method: 'POST', headers: getAuthHeaders(), body: '{}' })),
  // Auth
  login: async (username, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    return parseResponse(res);
  },

  // Products
  getProducts: async () => {
    const res = await fetch(`${BASE_URL}/products`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  searchProducts: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.tuKhoa) query.append('tuKhoa', params.tuKhoa);
    if (params.maDM) query.append('maDM', params.maDM);
    if (params.giaMin) query.append('giaMin', params.giaMin);
    if (params.giaMax) query.append('giaMax', params.giaMax);

    const res = await fetch(`${BASE_URL}/products/search?${query.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  createProduct: async (data) => {
    const res = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  updateProduct: async (id, data) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  deleteProduct: async (id) => {
    const res = await fetch(`${BASE_URL}/products/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    return parseResponse(res);
  },

  // Master Data (Chi nhánh, Kho, Danh mục, Khách hàng, Nhân sự)
  getBranches: async () => {
    const res = await fetch(`${BASE_URL}/branches`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  createBranch: async (data) => {
    const res = await fetch(`${BASE_URL}/branches`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  getWarehouses: async () => {
    const res = await fetch(`${BASE_URL}/warehouses`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getCategories: async () => {
    const res = await fetch(`${BASE_URL}/categories`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getCustomers: async () => {
    const res = await fetch(`${BASE_URL}/customers`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  createCustomer: async (data) => {
    const res = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  getEmployees: async () => {
    const res = await fetch(`${BASE_URL}/employees`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  createEmployee: async (data) => {
    const res = await fetch(`${BASE_URL}/employees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  // Orders
  getOrders: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.tuNgay) query.append('tuNgay', params.tuNgay);
    if (params.denNgay) query.append('denNgay', params.denNgay);
    if (params.maCN) query.append('maCN', params.maCN);

    const res = await fetch(`${BASE_URL}/orders?${query.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getInvoiceDetail: async (orderId) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/invoice`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  createOrder: async (data) => {
    const res = await fetch(`${BASE_URL}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  createOrderAtomic: async (data) => {
    const res = await fetch(`${BASE_URL}/orders/atomic-reserve`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  updateOrderStatus: async (orderId, trangThai) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ trangThai })
    });
    return parseResponse(res);
  },

  cancelOrder: async (orderId, lyDoHuy) => {
    const res = await fetch(`${BASE_URL}/orders/${orderId}/cancel-refund`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ lyDoHuy })
    });
    return parseResponse(res);
  },

  checkStock: async (maKho, maSP, soLuong) => {
    const res = await fetch(`${BASE_URL}/orders/check-stock?maKho=${maKho}&maSP=${maSP}&soLuong=${soLuong}`, {
      headers: getAuthHeaders()
    });
    return parseResponse(res);
  },

  calculateVipDiscount: async (maKH, tongTienGoc) => {
    const res = await fetch(`${BASE_URL}/orders/vip-discount?maKH=${maKH}&tongTienGoc=${tongTienGoc}`, {
      headers: getAuthHeaders()
    });
    return parseResponse(res);
  },

  // Inventory & Reports
  getRankedInventoryReport: async () => {
    const res = await fetch(`${BASE_URL}/inventory/ranked-report`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  transferStockInternal: async (data) => {
    const res = await fetch(`${BASE_URL}/inventory/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  transferStockInterBranch: async (data) => {
    const res = await fetch(`${BASE_URL}/inventory/inter-branch-transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  getBranchRevenue: async (year, month) => {
    const query = new URLSearchParams();
    if (year) query.append('year', year);
    if (month) query.append('month', month);
    const res = await fetch(`${BASE_URL}/reports/branch-revenue?${query.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getStaffKpi: async (year) => {
    const query = new URLSearchParams();
    if (year) query.append('year', year);
    const res = await fetch(`${BASE_URL}/reports/staff-kpi?${query.toString()}`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getIndexedSales: async () => {
    const res = await fetch(`${BASE_URL}/reports/indexed-sales`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getStaffHierarchy: async () => {
    const res = await fetch(`${BASE_URL}/reports/staff-hierarchy`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  getBranch1Staff: async () => {
    const res = await fetch(`${BASE_URL}/reports/branch1-staff`, { headers: getAuthHeaders() });
    return parseResponse(res);
  },

  reorganizeStaff: async (maNVCantXoa, maQLThayThe) => {
    const res = await fetch(`${BASE_URL}/staff/reorganize`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ maNVCantXoa, maQLThayThe })
    });
    return parseResponse(res);
  },

  batchPromoteCustomers: async (diemToiThieu, diemThuongBonus) => {
    const res = await fetch(`${BASE_URL}/customers/batch-promote`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ diemToiThieu, diemThuongBonus })
    });
    return parseResponse(res);
  },

  getAuditLogs: async () => {
    const res = await fetch(`${BASE_URL}/audit-logs`, { headers: getAuthHeaders() });
    return parseResponse(res);
  }
};
