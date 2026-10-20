import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { 
  Building2, Users, UserCheck, Plus, RefreshCw, AlertCircle, 
  CheckCircle2, Phone, MapPin, Award, GitBranch, ArrowRightLeft,
  DollarSign, ShieldAlert, Sparkles, UserPlus, CreditCard
} from 'lucide-react';
import { getUserRole, canPerformAction, ROLES } from '../utils/permissions';

export default function OrganizationScreen({ currentUser }) {
  const userRole = getUserRole(currentUser);
  const canAddBranch = canPerformAction(userRole, 'ADD_BRANCH');
  const canAddEmployee = canPerformAction(userRole, 'ADD_EMPLOYEE');
  const canReorganize = canPerformAction(userRole, 'REORGANIZE_EMPLOYEES');
  const canBatchPromote = canPerformAction(userRole, 'BATCH_PROMOTE_CUSTOMERS');
  const canAddCustomer = canPerformAction(userRole, 'ADD_CUSTOMER');

  const [activeTab, setActiveTab] = useState(userRole === ROLES.CASHIER ? 'customers' : 'branches'); // 'branches' | 'employees' | 'customers'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Data states
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [branch1Staff, setBranch1Staff] = useState([]);

  // Fallback danh sách nhân sự từ View nếu bảng thô NhanVien bị ẩn lương
  const staffList = employees.length > 0 
    ? employees 
    : hierarchy.map((h) => ({ MaNV: h.MaNV, HoTen: h.TenNhanVien, TenCN: h.ChiNhanhLamViec }));

  // Modals
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [branchForm, setBranchForm] = useState({ tenCN: '', diaChi: '', soDT: '' });

  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [empForm, setEmpForm] = useState({ hoTen: '', luong: '', maCN: '', maQL: '' });

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({ hoTen: '', soDT: '', loaiKH: 0, diemTichLuy: 0 });

  // Reorganize Staff Modal (ACID Tx 3)
  const [isReorganizeModalOpen, setIsReorganizeModalOpen] = useState(false);
  const [reorganizeForm, setReorganizeForm] = useState({ maNVCantXoa: '', maQLThayThe: '' });

  // Batch Promote Modal (ACID Tx 4)
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteForm, setPromoteForm] = useState({ diemToiThieu: 1000, diemThuongBonus: 100 });

  // VIP Calculator Modal (Scalar UDF 1)
  const [vipCheck, setVipCheck] = useState({ maKH: '', tongTien: 1000000, result: null });

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        userRole === ROLES.CASHIER ? Promise.resolve(null) : api.getBranches(),
        userRole === ROLES.CASHIER ? Promise.resolve(null) : api.getEmployees(),
        api.getCustomers(),
        userRole === ROLES.CASHIER ? Promise.resolve(null) : api.getStaffHierarchy(),
        userRole === ROLES.CASHIER ? Promise.resolve(null) : api.getBranch1Staff()
      ]);

      const [bRes, eRes, cRes, hRes, b1Res] = results;

      if (bRes.status === 'fulfilled' && bRes.value?.success) setBranches(bRes.value.branches || []);
      if (eRes.status === 'fulfilled' && eRes.value?.success) setEmployees(eRes.value.employees || []);
      if (cRes.status === 'fulfilled' && cRes.value?.success) setCustomers(cRes.value.customers || []);
      if (hRes.status === 'fulfilled' && hRes.value?.success) setHierarchy(hRes.value.hierarchy || []);
      if (b1Res.status === 'fulfilled' && b1Res.value?.success) setBranch1Staff(b1Res.value.staffList || []);
    } catch (err) {
      setError(err.message || 'Lỗi tải dữ liệu cơ cấu tổ chức.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Handlers for Branch
  const handleCreateBranch = async (e) => {
    e.preventDefault();
    if (!branchForm.tenCN.trim() || !branchForm.soDT.trim()) {
      setError('Vui lòng điền tên chi nhánh và số điện thoại 10 số.');
      return;
    }
    try {
      const res = await api.createBranch(branchForm);
      if (res.success) {
        setSuccess('Thêm chi nhánh mới thành công!');
        setIsBranchModalOpen(false);
        setBranchForm({ tenCN: '', diaChi: '', soDT: '' });
        fetchAll();
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm chi nhánh.');
    }
  };

  // Handlers for Employee
  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!empForm.hoTen.trim() || !empForm.luong || !empForm.maCN) {
      setError('Vui lòng điền họ tên, mức lương và chọn chi nhánh.');
      return;
    }
    try {
      const res = await api.createEmployee({
        hoTen: empForm.hoTen.trim(),
        luong: Number(empForm.luong),
        maCN: Number(empForm.maCN),
        maQL: empForm.maQL ? Number(empForm.maQL) : null
      });
      if (res.success) {
        setSuccess('Thêm nhân viên mới thành công! (Trigger trg_NhanVien_AuditLog đã tự động ghi nhật ký hệ thống).');
        setIsEmpModalOpen(false);
        setEmpForm({ hoTen: '', luong: '', maCN: '', maQL: '' });
        fetchAll();
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm nhân sự.');
    }
  };

  // Handlers for Customer
  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    if (!customerForm.hoTen.trim() || !customerForm.soDT.trim()) {
      setError('Vui lòng nhập họ tên và số điện thoại khách hàng.');
      return;
    }
    try {
      const res = await api.createCustomer({
        hoTen: customerForm.hoTen.trim(),
        soDT: customerForm.soDT.trim(),
        loaiKH: Number(customerForm.loaiKH),
        diemTichLuy: Number(customerForm.diemTichLuy)
      });
      if (res.success) {
        setSuccess('Thêm khách hàng thành công!');
        setIsCustomerModalOpen(false);
        setCustomerForm({ hoTen: '', soDT: '', loaiKH: 0, diemTichLuy: 0 });
        fetchAll();
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi thêm khách hàng.');
    }
  };

  // Acid Tx 3: Reorganize Staff
  const handleReorganizeStaff = async (e) => {
    e.preventDefault();
    try {
      const res = await api.reorganizeStaff(Number(reorganizeForm.maNVCantXoa), Number(reorganizeForm.maQLThayThe));
      setSuccess(res.ThongBao || res.message || 'Đã điều chuyển quyền quản lý và xóa nhân viên thành công qua giao dịch ACID!');
      setIsReorganizeModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.message || 'Lỗi khi thực hiện giao dịch điều chuyển nhân sự.');
    }
  };

  // Acid Tx 4: Batch Promote Customers
  const handleBatchPromote = async (e) => {
    e.preventDefault();
    try {
      const res = await api.batchPromoteCustomers(Number(promoteForm.diemToiThieu), Number(promoteForm.diemThuongBonus));
      setSuccess(res.ThongBao || res.message || 'Thăng hạng khách hàng VIP và tặng điểm thưởng hàng loạt thành công!');
      setIsPromoteModalOpen(false);
      fetchAll();
    } catch (err) {
      setError(err.message || 'Lỗi khi thăng hạng khách hàng.');
    }
  };

  // Scalar UDF 1: VIP Discount calculation
  const handleCalculateVipDiscount = async (e) => {
    e.preventDefault();
    if (!vipCheck.maKH) return;
    try {
      const res = await api.calculateVipDiscount(vipCheck.maKH, vipCheck.tongTien);
      setVipCheck({ ...vipCheck, result: res.tienSauGiam });
    } catch (err) {
      setError(err.message || 'Lỗi tính chiết khấu VIP.');
    }
  };

  return (
    <div className="content-body">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-heading">Quản Trị Tổ Chức & Khách Hàng</h1>
          <p className="page-subheading">
            Quản lý Chi nhánh chuỗi, Nhân sự (Cây phân cấp <code>v_PhanCapNhanSu_ToanDien</code>) và Khách hàng VIP
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchAll}>
            <RefreshCw size={16} /> Làm mới
          </button>
          {activeTab === 'branches' && canAddBranch && (
            <button className="btn btn-primary" onClick={() => setIsBranchModalOpen(true)}>
              <Plus size={16} /> Thêm chi nhánh
            </button>
          )}
          {activeTab === 'employees' && (
            <>
              {canReorganize && (
                <button className="btn btn-secondary" onClick={() => setIsReorganizeModalOpen(true)}>
                  <ArrowRightLeft size={16} /> Điều chuyển quản lý (Tx 3)
                </button>
              )}
              {canAddEmployee && (
                <button className="btn btn-primary" onClick={() => setIsEmpModalOpen(true)}>
                  <UserPlus size={16} /> Thêm Nhân Viên
                </button>
              )}
            </>
          )}
          {activeTab === 'customers' && (
            <>
              {canBatchPromote && (
                <button className="btn btn-secondary" onClick={() => setIsPromoteModalOpen(true)}>
                  <Sparkles size={16} /> Thăng hạng VIP hàng loạt (Tx 4)
                </button>
              )}
              {canAddCustomer && (
                <button className="btn btn-primary" onClick={() => setIsCustomerModalOpen(true)}>
                  <Plus size={16} /> Thêm Khách Hàng
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <div>{error}</div>
        </div>
      )}
      {success && (
        <div className="alert alert-success">
          <CheckCircle2 size={18} />
          <div>{success}</div>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Tổng Chi Nhánh</span>
            <span className="stat-value">{branches.length}</span>
            <span className="stat-desc">Đang hoạt động trên cả nước</span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>
            <Building2 size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Tổng Nhân Sự</span>
            <span className="stat-value">{employees.length > 0 ? employees.length : hierarchy.length}</span>
            <span className="stat-desc">Nhân viên & cấp quản lý</span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
            <Users size={24} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <span className="stat-label">Tổng Khách Hàng</span>
            <span className="stat-value">{customers.length}</span>
            <span className="stat-desc">
              {customers.filter((c) => c.LoaiKH > 0).length} Khách hàng VIP / Kim cương
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <Award size={24} />
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="card" style={{ padding: 0 }}>
        <div className="tabs-container">
          {userRole !== ROLES.CASHIER && <button
            className={`tab-btn ${activeTab === 'branches' ? 'active' : ''}`}
            onClick={() => setActiveTab('branches')}
          >
            <Building2 size={18} /> Chi Nhánh Hệ Thống ({branches.length})
          </button>}
          {userRole !== ROLES.CASHIER && <button
            className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`}
            onClick={() => setActiveTab('employees')}
          >
            <Users size={18} /> Nhân Sự & Cây Phân Cấp ({employees.length > 0 ? employees.length : hierarchy.length})
          </button>}
          <button
            className={`tab-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
          >
            <UserCheck size={18} /> Khách Hàng & Hạng Thành Viên ({customers.length})
          </button>
        </div>

        {/* TAB 1: CHI NHÁNH */}
        {activeTab === 'branches' && (
          loading ? (
            <div className="loading-state" style={{ padding: '60px', textAlign: 'center' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '12px', color: 'var(--text-muted)' }}>Đang tải danh sách chi nhánh...</p>
            </div>
          ) : branches.length === 0 ? (
            <div className="empty-state" style={{ padding: '60px', textAlign: 'center' }}>
              <Building2 size={48} color="var(--text-muted)" style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Chưa có chi nhánh nào hoặc chưa có dữ liệu phản hồi.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Mã CN</th>
                    <th>Tên Chi Nhánh</th>
                    <th>Địa Chỉ Trụ Sở</th>
                    <th>Số Điện Thoại</th>
                    <th style={{ textAlign: 'center' }}>Số Kho Trực Thuộc</th>
                    <th style={{ textAlign: 'center' }}>Quy Mô Nhân Sự</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.MaCN}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>CN{b.MaCN}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '14px' }}>
                        {b.TenCN}
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <MapPin size={14} /> {b.DiaChi || 'Chưa cập nhật'}
                        </span>
                      </td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={14} color="var(--primary)" /> {b.SoDT}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-primary">{b.SoKhoHang} Kho</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-secondary">{b.SoNhanVien} Nhân viên</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* TAB 2: NHÂN VIÊN */}
        {activeTab === 'employees' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px' }}>
            {/* View 2: Cây phân cấp nhân sự Self-Join */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <GitBranch size={18} color="var(--primary)" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Khung Nhìn 2: Cây Phân Cấp Nhân Sự Toàn Diện (<code>v_PhanCapNhanSu_ToanDien</code>)
                </h3>
              </div>
              <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ Tên Nhân Viên</th>
                      <th>Chi Nhánh Làm Việc</th>
                      <th>Người Quản Lý Trực Tiếp</th>
                      <th style={{ textAlign: 'center' }}>Số NV Dưới Quyền</th>
                      <th style={{ textAlign: 'center' }}>Tổng Nhân Sự CN</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchy.map((h) => (
                      <tr key={h.MaNV}>
                        <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>NV{h.MaNV}</td>
                        <td style={{ fontWeight: 600 }}>{h.TenNhanVien}</td>
                        <td>{h.ChiNhanhLamViec}</td>
                        <td>
                          {h.NguoiQuanLyTrucTiep ? (
                            <span className="badge badge-secondary">{h.NguoiQuanLyTrucTiep}</span>
                          ) : (
                            <span className="badge badge-primary">⭐ Lãnh đạo cấp cao (Root)</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>
                          {h.SoNhanVienDuoiQuyen > 0 ? (
                            <span className="badge badge-success">{h.SoNhanVienDuoiQuyen} người</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>0</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>{h.TongNhanSuChiNhanh} người</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* View 3: Kiểm soát nhân viên Chi nhánh 1 WITH CHECK OPTION */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <ShieldAlert size={18} color="#D97706" />
                <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Khung Nhìn 3: Nhân Sự Chi Nhánh 1 (<code>v_NhanVien_ChiNhanh1_KiemSoat WITH CHECK OPTION</code>)
                </h3>
              </div>
              <div className="table-responsive" style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Mã NV</th>
                      <th>Họ Tên</th>
                      <th>Mã Chi Nhánh</th>
                      <th>Mã Quản Lý</th>
                      <th>Trạng Thái Xóa Mềm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branch1Staff.map((s) => (
                      <tr key={s.MaNV}>
                        <td style={{ fontWeight: 700 }}>NV{s.MaNV}</td>
                        <td style={{ fontWeight: 600 }}>{s.HoTen}</td>
                        <td>
                          <span className="badge badge-primary">Chi Nhánh 1 (Q1)</span>
                        </td>
                        <td>{s.MaQL ? `NV${s.MaQL}` : 'Không có'}</td>
                        <td>
                          <span className={`badge ${s.DaXoa ? 'badge-danger' : 'badge-success'}`}>
                            {s.DaXoa ? 'Đã xóa mềm' : 'Đang hoạt động'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KHÁCH HÀNG */}
        {activeTab === 'customers' && (
          <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* VIP Calculator Widget (Scalar UDF 1) */}
            <div style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <CreditCard size={18} color="var(--primary)" />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Tra cứu chiết khấu khách hàng VIP (Scalar Function: <code>fn_TinhTienSauChietKhauVIP</code>)
                </h4>
              </div>
              <form onSubmit={handleCalculateVipDiscount} style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: '220px' }}>
                  <label className="form-label">Chọn Khách Hàng</label>
                  <select
                    className="form-select"
                    value={vipCheck.maKH}
                    onChange={(e) => setVipCheck({ ...vipCheck, maKH: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn khách hàng --</option>
                    {customers.map((c) => (
                      <option key={c.MaKH} value={c.MaKH}>
                        {c.HoTen} ({c.TenHangThanhVien} - {c.DiemTichLuy} điểm)
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ minWidth: '180px' }}>
                  <label className="form-label">Tổng Tiền Gốc (VNĐ)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={vipCheck.tongTien}
                    onChange={(e) => setVipCheck({ ...vipCheck, tongTien: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  Tính Chiết Khấu VIP
                </button>
                {vipCheck.result !== null && (
                  <div style={{
                    padding: '8px 16px',
                    backgroundColor: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: 'var(--radius-sm)',
                    color: '#065F46',
                    fontWeight: 700
                  }}>
                    Số tiền sau chiết khấu: {Number(vipCheck.result).toLocaleString('vi-VN')} đ
                  </div>
                )}
              </form>
            </div>

            {/* Customers Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Mã KH</th>
                    <th>Họ Tên Khách Hàng</th>
                    <th>Số Điện Thoại</th>
                    <th>Hạng Thành Viên</th>
                    <th style={{ textAlign: 'center' }}>Điểm Tích Lũy</th>
                    <th style={{ textAlign: 'center' }}>Tổng Đơn Mua</th>
                    <th style={{ textAlign: 'right' }}>Tổng Chi Tiêu</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.MaKH}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>KH{c.MaKH}</td>
                      <td style={{ fontWeight: 700 }}>{c.HoTen}</td>
                      <td>{c.SoDT}</td>
                      <td>
                        <span className={`badge ${c.LoaiKH === 2 ? 'badge-primary' : c.LoaiKH === 1 ? 'badge-warning' : 'badge-secondary'}`}>
                          {c.TenHangThanhVien}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: 'var(--primary)' }}>
                        {c.DiemTichLuy} pts
                      </td>
                      <td style={{ textAlign: 'center' }}>{c.TongSoDonHang} đơn</td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {Number(c.TongChiTieu).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Thêm Chi Nhánh */}
      {isBranchModalOpen && (
        <div className="modal-overlay" onClick={() => setIsBranchModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm Chi Nhánh Mới</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsBranchModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBranch}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Tên chi nhánh *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Chi nhánh Bình Thạnh"
                    value={branchForm.tenCN}
                    onChange={(e) => setBranchForm({ ...branchForm, tenCN: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Địa chỉ trụ sở</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: 456 Xô Viết Nghệ Tĩnh, Q. Bình Thạnh"
                    value={branchForm.diaChi}
                    onChange={(e) => setBranchForm({ ...branchForm, diaChi: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại liên hệ (10 chữ số) *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="0911223344"
                    maxLength={10}
                    value={branchForm.soDT}
                    onChange={(e) => setBranchForm({ ...branchForm, soDT: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsBranchModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo Chi Nhánh</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Nhân Viên */}
      {isEmpModalOpen && (
        <div className="modal-overlay" onClick={() => setIsEmpModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm Nhân Sự Mới</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsEmpModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateEmployee}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px' }}>
                  <span>Trigger <code>trg_NhanVien_AuditLog</code> sẽ tự động ghi vết hành động thêm nhân viên mới vào bảng <code>NhatKyHeThong</code>.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Họ và tên nhân viên *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Nguyễn Văn A"
                    value={empForm.hoTen}
                    onChange={(e) => setEmpForm({ ...empForm, hoTen: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Mức lương cơ bản (VNĐ) *</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="10000000"
                    min="1000000"
                    value={empForm.luong}
                    onChange={(e) => setEmpForm({ ...empForm, luong: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Chi nhánh làm việc *</label>
                    <select
                      className="form-select"
                      value={empForm.maCN}
                      onChange={(e) => setEmpForm({ ...empForm, maCN: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn chi nhánh --</option>
                      {branches.map((b) => (
                        <option key={b.MaCN} value={b.MaCN}>{b.TenCN}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cấp trên quản lý trực tiếp</label>
                    <select
                      className="form-select"
                      value={empForm.maQL}
                      onChange={(e) => setEmpForm({ ...empForm, maQL: e.target.value })}
                    >
                      <option value="">-- Không có (Cấp lãnh đạo) --</option>
                      {staffList.map((e) => (
                        <option key={e.MaNV} value={e.MaNV}>{e.HoTen} (NV{e.MaNV})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEmpModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Thêm Nhân Sự</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Khách Hàng */}
      {isCustomerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCustomerModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Thêm Khách Hàng Mới</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsCustomerModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateCustomer}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="form-group">
                  <label className="form-label">Họ và tên khách hàng *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Trần Thị B"
                    value={customerForm.hoTen}
                    onChange={(e) => setCustomerForm({ ...customerForm, hoTen: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Số điện thoại (10 chữ số) *</label>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="0988776655"
                    maxLength={10}
                    value={customerForm.soDT}
                    onChange={(e) => setCustomerForm({ ...customerForm, soDT: e.target.value })}
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Hạng thành viên ban đầu</label>
                    <select
                      className="form-select"
                      disabled={userRole === ROLES.CASHIER} value={customerForm.loaiKH}
                      onChange={(e) => setCustomerForm({ ...customerForm, loaiKH: e.target.value })}
                    >
                      <option value="0">Thường (0%)</option>
                      <option value="1">VIP (Giảm 10%)</option>
                      <option value="2">Kim Cương (Giảm 15%)</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Điểm tích lũy ban đầu</label>
                    <input
                      type="number"
                      className="form-input"
                      disabled={userRole === ROLES.CASHIER} value={customerForm.diemTichLuy}
                      onChange={(e) => setCustomerForm({ ...customerForm, diemTichLuy: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCustomerModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Tạo Khách Hàng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Điều Chuyển Quản Lý (ACID Tx 3) */}
      {isReorganizeModalOpen && (
        <div className="modal-overlay" onClick={() => setIsReorganizeModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Giao dịch ACID Tx 3: Điều Chuyển Quản Lý & Xóa Nhân Viên</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsReorganizeModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleReorganizeStaff}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px' }}>
                  <span>
                    Thủ tục <code>usp_Tx_XoaNhanVienVaDieuChuyenQuanLy</code> đảm bảo chuyển toàn bộ nhân viên dưới quyền của người bị xóa sang người quản lý mới trong 1 Transaction nguyên tử (Atomic).
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Nhân viên cần xóa / cho nghỉ việc *</label>
                  <select
                    className="form-select"
                    value={reorganizeForm.maNVCantXoa}
                    onChange={(e) => setReorganizeForm({ ...reorganizeForm, maNVCantXoa: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn nhân viên cần xóa --</option>
                    {staffList.map((e) => (
                      <option key={e.MaNV} value={e.MaNV}>
                        NV{e.MaNV} - {e.HoTen} ({e.TenCN})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Người quản lý mới thay thế nhận bàn giao *</label>
                  <select
                    className="form-select"
                    value={reorganizeForm.maQLThayThe}
                    onChange={(e) => setReorganizeForm({ ...reorganizeForm, maQLThayThe: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn người quản lý mới --</option>
                    {staffList.filter((e) => String(e.MaNV) !== String(reorganizeForm.maNVCantXoa)).map((e) => (
                      <option key={e.MaNV} value={e.MaNV}>
                        NV{e.MaNV} - {e.HoTen} ({e.TenCN})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsReorganizeModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Thực Hiện Giao Dịch ACID</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thăng Hạng Hàng Loạt (ACID Tx 4) */}
      {isPromoteModalOpen && (
        <div className="modal-overlay" onClick={() => setIsPromoteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Giao dịch ACID Tx 4: Thăng Hạng Thành Viên Hàng Loạt</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsPromoteModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleBatchPromote}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px' }}>
                  <span>
                    Thủ tục <code>usp_Tx_ThangHangThanhVienHangLoat</code> quét toàn bộ khách hàng đạt ngưỡng điểm để nâng hạng VIP và tặng điểm thưởng tri ân.
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Ngưỡng điểm tích lũy tối thiểu để thăng hạng VIP</label>
                  <input
                    type="number"
                    className="form-input"
                    value={promoteForm.diemToiThieu}
                    onChange={(e) => setPromoteForm({ ...promoteForm, diemToiThieu: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Điểm thưởng bonus tặng thêm</label>
                  <input
                    type="number"
                    className="form-input"
                    value={promoteForm.diemThuongBonus}
                    onChange={(e) => setPromoteForm({ ...promoteForm, diemThuongBonus: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsPromoteModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Chạy Giao Dịch Thăng Hạng</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
