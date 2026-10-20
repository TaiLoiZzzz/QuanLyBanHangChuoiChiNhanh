import React, { useState, useEffect } from 'react';
import { sumInvoice } from '../utils/invoice';
import { api } from '../api/apiClient';
import { 
  ShoppingCart, Plus, RefreshCw, AlertCircle, CheckCircle2, 
  FileText, Calendar, Filter, Clock, Check, X, ShieldCheck, Printer,
  Building, User, AlertTriangle
} from 'lucide-react';
import { getUserRole, canPerformAction, ROLES } from '../utils/permissions';

export default function OrderScreen({ currentUser }) {
  const userRole = getUserRole(currentUser);
  const canCreateOrder = canPerformAction(userRole, 'CREATE_ORDER');
  const canCancelOrder = canPerformAction(userRole, 'CANCEL_ORDER');

  const [orders, setOrders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filters (iTVF fn_DanhSachDonHangTheoKhoangThoiGian)
  const [tuNgay, setTuNgay] = useState('2020-01-01');
  const [denNgay, setDenNgay] = useState('2030-12-31');
  const [maCN, setMaCN] = useState('');

  // Modals
  const [saving, setSaving] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [orderForm, setOrderForm] = useState({
    maKH: '',
    maNV: '',
    maKhoXuat: '',
    maSP: '',
    soLuong: 1,
    donGiaBan: '',
    useHoldlock: true // Checkbox cho Giao dịch ACID Tx 1
  });
  const [stockCheckResult, setStockCheckResult] = useState(null);

  // Invoice Modal (View 4 + fn_FormatMaHoaDonTuDong)
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState([]);
  const [currentOrder, setCurrentOrder] = useState(null);

  // Cancel Modal (ACID Tx 2)
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const [cancelReason, setCancelReason] = useState('Khách yêu cầu hủy đơn');

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getOrders({
        tuNgay: tuNgay ? `${tuNgay} 00:00:00` : null,
        denNgay: denNgay ? `${denNgay} 23:59:59.997` : null,
        maCN: maCN ? Number(maCN) : null
      });
      if (res.success) setOrders(res.orders || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải danh sách đơn hàng.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMasterData = async () => {
    try {
      const results = await Promise.allSettled([
        api.getBranches(),
        api.getCustomers(),
        api.getEmployees(),
        api.getWarehouses(),
        api.getProducts()
      ]);
      const [bRes, cRes, eRes, wRes, pRes] = results;
      if (bRes.status === 'fulfilled' && bRes.value?.success) setBranches(bRes.value.branches || []);
      if (cRes.status === 'fulfilled' && cRes.value?.success) setCustomers(cRes.value.customers || []);
      if (eRes.status === 'fulfilled' && eRes.value?.success) setEmployees(eRes.value.employees || []);
      if (wRes.status === 'fulfilled' && wRes.value?.success) setWarehouses(wRes.value.warehouses || []);
      if (pRes.status === 'fulfilled' && pRes.value?.success) setProducts(pRes.value.products || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchMasterData();
  }, []);

  // Real-time stock check with Scalar UDF 2
  const checkStockRealtime = async (khoId, spId, qty) => {
    if (!khoId || !spId || !qty) return;
    try {
      const res = await api.checkStock(khoId, spId, qty);
      setStockCheckResult(res.duHangDapUng);
    } catch (e) {
      setStockCheckResult(null);
    }
  };

  const handleProductSelect = (spId) => {
    const selected = products.find((p) => String(p.MaSP) === String(spId));
    setOrderForm((prev) => {
      const updated = {
        ...prev,
        maSP: spId,
        donGiaBan: selected ? selected.GiaBanHienTai : prev.donGiaBan
      };
      if (prev.maKhoXuat) {
        checkStockRealtime(prev.maKhoXuat, spId, prev.soLuong);
      }
      return updated;
    });
  };

  const handleWarehouseSelect = (khoId) => {
    setOrderForm((prev) => {
      const updated = { ...prev, maKhoXuat: khoId };
      if (prev.maSP) {
        checkStockRealtime(khoId, prev.maSP, prev.soLuong);
      }
      return updated;
    });
  };

  const handleQtyChange = (qty) => {
    setOrderForm((prev) => {
      const updated = { ...prev, soLuong: qty };
      if (prev.maKhoXuat && prev.maSP) {
        checkStockRealtime(prev.maKhoXuat, prev.maSP, qty);
      }
      return updated;
    });
  };

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    if(saving) return;
    if (!orderForm.maKH || !orderForm.maNV || !orderForm.maKhoXuat || !orderForm.maSP || !orderForm.soLuong) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }

    setSaving(true);
    try {
      let res;
      if (orderForm.useHoldlock) {
        // Giao dịch ACID Tx 1: Đặt hàng giữ chỗ (UPDLOCK + HOLDLOCK)
        res = await api.createOrderAtomic({
          maKH: Number(orderForm.maKH),
          maNV: Number(orderForm.maNV),
          maKhoXuat: Number(orderForm.maKhoXuat),
          maSP: Number(orderForm.maSP),
          soLuong: Number(orderForm.soLuong),
          donGiaBan: Number(orderForm.donGiaBan)
        });
        setSuccess(res.ThongBao || 'Đặt hàng và giữ chỗ kho thành công với Transaction ACID (Khóa UPDLOCK + HOLDLOCK)!');
      } else {
        // SP 1 chuẩn
        res = await api.createOrder({
          maKH: Number(orderForm.maKH),
          maNV: Number(orderForm.maNV),
          maKhoXuat: Number(orderForm.maKhoXuat),
          maSP: Number(orderForm.maSP),
          soLuong: Number(orderForm.soLuong),
          donGiaBan: Number(orderForm.donGiaBan)
        });
        setSuccess(`Tạo đơn hàng #${res.maDH} thành công (Trigger 1 đã trừ tồn kho và tính tổng tiền tự động)!`);
      }

      setIsCreateModalOpen(false);
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo đơn hàng.');
    } finally { setSaving(false); }
  };

  // View Invoice Detail (View 4 + fn_FormatMaHoaDonTuDong)
  const handleViewInvoice = async (orderId) => {
    try {
      const res = await api.getInvoiceDetail(orderId);
      if (res.success && res.items.length > 0) {
        setInvoiceData(res.items);
        const totals = sumInvoice(res.items);
        setCurrentOrder({ ...res.items[0], ...totals });
        setIsInvoiceModalOpen(true);
      } else {
        setError('Không tìm thấy chi tiết hóa đơn cho đơn hàng này.');
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tải hóa đơn.');
    }
  };

  // Update Status
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (newStatus === 3) {
        setSuccess(
          'Đơn hàng đã giao thành công! (Trigger trg_DonHang_CapNhatDiemTichLuyKhachHang đã tự động tích điểm nâng hạng VIP).'
        );
      } else {
        setSuccess(res.ThongBao || `Cập nhật trạng thái đơn hàng #${orderId} thành công!`);
      }
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Lỗi cập nhật trạng thái đơn hàng.');
    }
  };

  // Cancel order & Refund stock (ACID Tx 2)
  const handleCancelOrder = async (e) => {
    e.preventDefault();
    try {
      const res = await api.cancelOrder(cancelOrderId, cancelReason);
      setSuccess(
        res.ThongBao || `Đã hủy đơn hàng #${cancelOrderId} và hoàn trả lại số lượng tồn kho qua Transaction ACID!`
      );
      setIsCancelModalOpen(false);
      fetchOrders();
    } catch (err) {
      setError(err.message || 'Lỗi khi hủy đơn hàng.');
    }
  };

  const getStatusBadge = (status) => {
    switch (Number(status)) {
      case 0:
        return <span className="badge badge-secondary"><Clock size={12} /> Mới tạo</span>;
      case 1:
        return <span className="badge badge-primary"><ShieldCheck size={12} /> Đã xác nhận</span>;
      case 2:
        return <span className="badge badge-warning"><Clock size={12} /> Đang giao hàng</span>;
      case 3:
        return <span className="badge badge-success"><Check size={12} /> Đã giao thành công</span>;
      case 4:
        return <span className="badge badge-danger"><X size={12} /> Đã hủy</span>;
      default:
        return <span className="badge badge-secondary">Không rõ</span>;
    }
  };

  return (
    <div className="content-body">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-heading">Quản Lý Đơn Hàng & Hóa Đơn</h1>
          <p className="page-subheading">
            Truy vấn bằng TVF <code>fn_DanhSachDonHangTheoKhoangThoiGian</code>, In hóa đơn với View <code>v_InHoaDon_ChiTietPhucHop</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchOrders}>
            <RefreshCw size={16} /> Làm mới
          </button>
          {canCreateOrder && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setOrderForm({
                  maKH: customers[0]?.MaKH || '',
                  maNV: employees[0]?.MaNV || '',
                  maKhoXuat: warehouses[0]?.MaKho || '',
                  maSP: products[0]?.MaSP || '',
                  soLuong: 1,
                  donGiaBan: products[0]?.GiaBanHienTai || '',
                  useHoldlock: true
                });
                setStockCheckResult(null);
                setIsCreateModalOpen(true);
              }}
            >
              <Plus size={16} /> Tạo Đơn Hàng Mới
            </button>
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

      {/* Date Range Filter (Inline Table-Valued Function fn_DanhSachDonHangTheoKhoangThoiGian) */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Filter size={18} color="var(--primary)" />
            Lọc Đơn Hàng Theo Khoảng Thời Gian (iTVF 3: <code>fn_DanhSachDonHangTheoKhoangThoiGian</code>)
          </span>
          <button className="btn btn-sm btn-primary" onClick={fetchOrders}>
            Áp Dụng Bộ Lọc
          </button>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Từ ngày</label>
              <input
                type="date"
                className="form-input"
                value={tuNgay}
                onChange={(e) => setTuNgay(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Đến ngày</label>
              <input
                type="date"
                className="form-input"
                value={denNgay}
                onChange={(e) => setDenNgay(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Lọc theo Chi nhánh</label>
              <select
                className="form-select"
                value={maCN}
                onChange={(e) => setMaCN(e.target.value)}
              >
                <option value="">-- Tất cả chi nhánh --</option>
                {branches.map((b) => (
                  <option key={b.MaCN} value={b.MaCN}>
                    {b.TenCN}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="card-title">
              <ShoppingCart size={18} color="var(--primary)" />
              Danh Sách Đơn Hàng ({orders.length} đơn)
            </h3>
            <span className="card-subtitle">
              Trigger 1 tự động đồng bộ tồn kho và tính tổng tiền; Trigger 4 nghiêm cấm xóa đơn đã giao
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mã ĐH</th>
                <th>Khách Hàng</th>
                <th>Nhân Viên Lập</th>
                <th>Kho Xuất Hàng</th>
                <th>Ngày Đặt</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Tổng Tiền</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <span>Đang nạp dữ liệu từ hàm iTVF...</span>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="empty-state">
                      <ShoppingCart size={36} className="empty-icon" />
                      <p>Không có đơn hàng nào trong khoảng thời gian đã chọn.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.MaDH}>
                    <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      #{o.MaDH}
                    </td>
                    <td style={{ fontWeight: 600 }}>{o.TenKhachHang}</td>
                    <td>{o.TenNhanVien}</td>
                    <td>{o.TenKho}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                      {new Date(o.NgayDat).toLocaleString('vi-VN')}
                    </td>
                    <td>{getStatusBadge(o.TrangThai)}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--text-main)' }}>
                      {Number(o.TongTien).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {/* View Invoice */}
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleViewInvoice(o.MaDH)}
                          title="Xem & In Hóa Đơn Phức Hợp"
                        >
                          <FileText size={14} /> In HĐ
                        </button>

                        {/* Status Transition dropdown */}
                        {o.TrangThai < 3 && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleUpdateStatus(o.MaDH, Number(o.TrangThai) + 1)}
                            title="Chuyển trạng thái kế tiếp"
                          >
                            Tiếp tục ➔
                          </button>
                        )}

                        {/* Cancel & Refund (ACID Tx 2) */}
                        {canCancelOrder && o.TrangThai !== 3 && o.TrangThai !== 4 && (
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => {
                              setCancelOrderId(o.MaDH);
                              setIsCancelModalOpen(true);
                            }}
                            title="Hủy đơn & Hoàn tồn kho"
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Đơn Hàng Mới */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Lập Đơn Hàng & Xuất Kho</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsCreateModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateOrder}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                {/* Holdlock notice */}
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '16px',
                  fontSize: '13px'
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--primary)' }}>
                    <input
                      type="checkbox"
                      checked={orderForm.useHoldlock}
                      onChange={(e) => setOrderForm({ ...orderForm, useHoldlock: e.target.checked })}
                    />
                    Kích hoạt Giao dịch ACID Tx 1: Đặt hàng & Giữ chỗ (Khóa UPDLOCK + HOLDLOCK)
                  </label>
                  <p style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', marginLeft: '24px' }}>
                    Chống bán âm (Negative Stock) và tranh chấp tài nguyên khi hàng nghìn giao dịch đặt hàng cùng một thời điểm.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Khách hàng đặt hàng *</label>
                    <select
                      className="form-select"
                      value={orderForm.maKH}
                      onChange={(e) => setOrderForm({ ...orderForm, maKH: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn khách hàng --</option>
                      {customers.map((c) => (
                        <option key={c.MaKH} value={c.MaKH}>
                          {c.HoTen} ({c.TenHangThanhVien})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nhân viên tiếp nhận *</label>
                    <select
                      className="form-select"
                      value={orderForm.maNV}
                      onChange={(e) => setOrderForm({ ...orderForm, maNV: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {employees.map((e) => (
                        <option key={e.MaNV} value={e.MaNV}>
                          {e.HoTen} ({e.TenCN})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Kho hàng xuất bán *</label>
                  <select
                    className="form-select"
                    value={orderForm.maKhoXuat}
                    onChange={(e) => handleWarehouseSelect(e.target.value)}
                    required
                  >
                    <option value="">-- Chọn kho xuất --</option>
                    {warehouses.map((w) => (
                      <option key={w.MaKho} value={w.MaKho}>
                        {w.TenKho} ({w.TenCN})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Sản phẩm *</label>
                    <select
                      className="form-select"
                      value={orderForm.maSP}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map((p) => (
                        <option key={p.MaSP} value={p.MaSP}>
                          {p.TenSP} ({Number(p.GiaBanHienTai).toLocaleString('vi-VN')} đ)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số lượng *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={orderForm.soLuong}
                      onChange={(e) => handleQtyChange(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đơn giá bán *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={orderForm.donGiaBan}
                      onChange={(e) => setOrderForm({ ...orderForm, donGiaBan: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Stock Check Live Indicator (Scalar UDF 2: fn_KiemTraKhaNangDapUngDonHang) */}
                {stockCheckResult !== null && (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: stockCheckResult ? '#ECFDF5' : '#FEF2F2',
                    border: `1px solid ${stockCheckResult ? '#A7F3D0' : '#FECACA'}`,
                    color: stockCheckResult ? '#065F46' : '#991B1B',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {stockCheckResult ? (
                      <>
                        <CheckCircle2 size={16} />
                        <strong>Kho đủ hàng đáp ứng:</strong> Hàm <code>fn_KiemTraKhaNangDapUngDonHang</code> trả về TRUE.
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={16} />
                        <strong>CẢNH BÁO TỒN KHO:</strong> Số lượng yêu cầu vượt quá tồn kho thực tế trong kho này!
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Hủy</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? 'Đang lưu…' : 'Xác Nhận Tạo Đơn'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal In Hóa Đơn Phức Hợp (View 4 + fn_FormatMaHoaDonTuDong) */}
      {isInvoiceModalOpen && currentOrder && (
        <div className="modal-overlay" onClick={() => setIsInvoiceModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '800px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="var(--primary)" />
                Chi Tiết Hóa Đơn & Chứng Từ Thanh Toán
              </h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsInvoiceModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ backgroundColor: '#F8FAFC' }}>
              <div className="invoice-sheet">
                <div className="invoice-header">
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)' }}>
                      HỆ THỐNG PHÂN PHỐI BÁN HÀNG
                    </h2>
                    <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      Mã hóa đơn chuẩn: <strong style={{ color: 'var(--primary)', fontFamily: 'monospace' }}>{currentOrder.MaHoaDonFormat}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Ngày lập: {new Date(currentOrder.NgayDat).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span className="badge badge-success" style={{ fontSize: '13px', padding: '6px 14px' }}>
                      {currentOrder.TenTrangThai}
                    </span>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                      Kho xuất: <strong>{currentOrder.KhoXuatHang}</strong>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      NV lập đơn: <strong>{currentOrder.NhanVienLapDon}</strong>
                    </p>
                  </div>
                </div>

                {/* Customer Meta */}
                <div className="invoice-meta-grid">
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Thông Tin Khách Hàng</span>
                    <h4 style={{ fontSize: '14px', fontWeight: 700, marginTop: '4px' }}>{currentOrder.TenKhachHang}</h4>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SĐT: {currentOrder.SoDTKhachHang}</p>
                    <span className="badge badge-primary" style={{ marginTop: '6px' }}>
                      {currentOrder.HangThanhVien}
                    </span>
                  </div>
                  <div style={{ padding: '12px', backgroundColor: '#F8FAFC', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700 }}>Chính Sách Chiết Khấu VIP</span>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Chiết khấu và thuế đã chốt khi lập đơn
                    </p>
                    <p style={{ fontSize: '12px', color: '#16A34A', fontWeight: 600 }}>
                      Thuế suất VAT ưu đãi chuẩn hóa: 8%
                    </p>
                  </div>
                </div>

                {/* Invoice Items Table */}
                <table className="data-table" style={{ marginTop: '16px' }}>
                  <thead>
                    <tr>
                      <th>Tên Sản Phẩm</th>
                      <th style={{ textAlign: 'center' }}>ĐVT</th>
                      <th style={{ textAlign: 'center' }}>Số Lượng</th>
                      <th style={{ textAlign: 'right' }}>Đơn Giá</th>
                      <th style={{ textAlign: 'right' }}>Tiền Gốc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoiceData.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.TenSP}</td>
                        <td style={{ textAlign: 'center' }}>{item.DonViTinh}</td>
                        <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.SoLuong}</td>
                        <td style={{ textAlign: 'right' }}>{Number(item.DonGiaBan).toLocaleString('vi-VN')} đ</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{Number(item.TienGoc).toLocaleString('vi-VN')} đ</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Invoice Totals */}
                <div className="invoice-total-box">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Tổng tiền gốc:</span>
                    <span>{Number(currentOrder.TienGoc).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px', color: '#DC2626' }}>
                    <span>Chiết khấu VIP:</span>
                    <span>- {Number(currentOrder.TienChietKhau).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Thuế GTGT (VAT 8%):</span>
                    <span>+ {Number(currentOrder.ThueVAT8Pct).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: 'var(--primary)',
                    paddingTop: '10px',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '8px'
                  }}>
                    <span>Tổng Thanh Toán:</span>
                    <span>{Number(currentOrder.TongThanhToanCuoiCung).toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => window.print()}
              >
                <Printer size={16} /> In Hóa Đơn
              </button>
              <button className="btn btn-primary" onClick={() => setIsInvoiceModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy Đơn & Hoàn Tồn Kho (ACID Tx 2) */}
      {isCancelModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCancelModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Giao dịch ACID Tx 2: Hủy Đơn Hàng & Hoàn Tồn Kho</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsCancelModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCancelOrder}>
              <div className="modal-body">
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px' }}>
                  <span>
                    Thủ tục <code>usp_Tx_HuyDonHangVaHoanTonKho</code> chuyển trạng thái đơn hàng sang 4 (Đã hủy) và cộng bù chính xác số lượng hàng vào bảng <code>TonKho</code> trong 1 giao dịch nguyên tử.
                  </span>
                </div>
                <div className="form-group">
                  <label className="form-label">Lý do hủy đơn hàng #{cancelOrderId}</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsCancelModalOpen(false)}>Hủy bỏ</button>
                <button type="submit" className="btn btn-outline-danger">Xác Nhận Hủy Đơn & Hoàn Kho</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
