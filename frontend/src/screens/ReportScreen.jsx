import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { 
  BarChart3, TrendingUp, AlertTriangle, ArrowRightLeft, RefreshCw, 
  Layers, Award, Shield, FileText, CheckCircle2, AlertCircle, 
  Package, DollarSign, Calendar, Eye
} from 'lucide-react';

import { getUserRole, canPerformAction, ROLES } from '../utils/permissions';

export default function ReportScreen() {
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'revenue' | 'kpi' | 'indexed' | 'audit'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('dbms_user') || '{}');
  const userRole = getUserRole(currentUser);
  const canViewFinancials = canPerformAction(userRole, 'VIEW_FINANCIAL_REPORTS');
  const canTransferStock = canPerformAction(userRole, 'TRANSFER_STOCK');

  // Data
  const [inventoryReport, setInventoryReport] = useState([]);
  const [branchRevenue, setBranchRevenue] = useState([]);
  const [staffKpi, setStaffKpi] = useState([]);
  const [indexedSales, setIndexedSales] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  // Filters
  const [kpiYear, setKpiYear] = useState(new Date().getFullYear());
  const [revYear, setRevYear] = useState(new Date().getFullYear());
  const [revMonth, setRevMonth] = useState('');

  // Transfer Modals (SP 3 & Tx 5)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({
    maKhoXuat: '',
    maKhoNhap: '',
    maSP: '',
    soLuong: 5,
    isInterBranch: true // Checkbox cho Tx 5
  });

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Chỉ gọi các API mà vai trò hiện tại có quyền truy cập
      const tasks = [
        api.getRankedInventoryReport(),
        api.getWarehouses(),
        api.getProducts()
      ];

      if (canViewFinancials) {
        tasks.push(
          api.getBranchRevenue(revYear, revMonth),
          api.getStaffKpi(kpiYear),
          api.getIndexedSales(),
          api.getAuditLogs()
        );
      }

      const results = await Promise.allSettled(tasks);

      const [inv, w, p, rev, kpi, ind, log] = results;

      if (inv?.status === 'fulfilled' && inv.value?.success) setInventoryReport(inv.value.report || []);
      if (w?.status === 'fulfilled' && w.value?.success) setWarehouses(w.value.warehouses || []);
      if (p?.status === 'fulfilled' && p.value?.success) setProducts(p.value.products || []);

      if (canViewFinancials) {
        if (rev?.status === 'fulfilled' && rev.value?.success) setBranchRevenue(rev.value.report || []);
        if (kpi?.status === 'fulfilled' && kpi.value?.success) setStaffKpi(kpi.value.report || []);
        if (ind?.status === 'fulfilled' && ind.value?.success) setIndexedSales(ind.value.sales || []);
        if (log?.status === 'fulfilled' && log.value?.success) setAuditLogs(log.value.logs || []);
      }

      // Chỉ hiển thị cảnh báo nếu báo cáo của tab hiện tại bị lỗi
      const currentTabError = 
        (activeTab === 'inventory' && inv.status === 'rejected' && inv.reason?.message) ||
        (activeTab === 'revenue' && rev.status === 'rejected' && rev.reason?.message) ||
        (activeTab === 'kpi' && kpi.status === 'rejected' && kpi.reason?.message) ||
        (activeTab === 'indexed' && ind.status === 'rejected' && ind.reason?.message) ||
        (activeTab === 'audit' && log.status === 'rejected' && log.reason?.message);

      if (currentTabError) {
        setError(currentTabError);
      }
    } catch (err) {
      setError(err.message || 'Lỗi nạp báo cáo thống kê.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [kpiYear, revYear, revMonth]);

  const handleStockTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.maKhoXuat || !transferForm.maKhoNhap || !transferForm.maSP || !transferForm.soLuong) {
      setError('Vui lòng điền đủ các thông tin điều chuyển kho.');
      return;
    }
    if (transferForm.maKhoXuat === transferForm.maKhoNhap) {
      setError('Kho xuất và kho nhập không được trùng nhau.');
      return;
    }

    try {
      let res;
      if (transferForm.isInterBranch) {
        // Giao dịch ACID Tx 5: Liên chi nhánh
        res = await api.transferStockInterBranch({
          maKhoXuat: Number(transferForm.maKhoXuat),
          maKhoNhap: Number(transferForm.maKhoNhap),
          maSP: Number(transferForm.maSP),
          soLuong: Number(transferForm.soLuong)
        });
        setSuccess(res.ThongBao || 'Điều chuyển hàng hóa liên chi nhánh thành công với Transaction ACID (Khóa UPDLOCK song song)!');
      } else {
        // SP 3 nội bộ
        res = await api.transferStockInternal({
          maKhoXuat: Number(transferForm.maKhoXuat),
          maKhoNhap: Number(transferForm.maKhoNhap),
          maSP: Number(transferForm.maSP),
          soLuong: Number(transferForm.soLuong),
          maNV: 1
        });
        setSuccess(res.ThongBao || 'Điều chuyển kho nội bộ thành công!');
      }

      setIsTransferModalOpen(false);
      fetchReports();
    } catch (err) {
      setError(err.message || 'Lỗi khi điều chuyển kho.');
    }
  };

  const getStockStatusBadge = (status) => {
    switch (status) {
      case 'HẾT HÀNG':
        return <span className="badge badge-danger">🔴 HẾT HÀNG</span>;
      case 'CẢNH BÁO: Sắp hết':
        return <span className="badge badge-warning">⚠️ CẢNH BÁO: Sắp hết</span>;
      case 'Tồn trung bình':
        return <span className="badge badge-primary">🔵 Tồn trung bình</span>;
      case 'Tồn dồi dào':
        return <span className="badge badge-success">🟢 Tồn dồi dào</span>;
      default:
        return <span className="badge badge-secondary">{status}</span>;
    }
  };

  return (
    <div className="content-body">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-heading">Tra Cứu & Báo Cáo Thống Kê</h1>
          <p className="page-subheading">
            Tận dụng sức mạnh Window Functions, Indexed Views, mTVF và Quản lý Concurrency Concurrency trong SQL Server
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchReports}>
            <RefreshCw size={16} /> Làm mới
          </button>
          {canTransferStock && (
            <button
              className="btn btn-primary"
              onClick={() => {
                setTransferForm({
                  maKhoXuat: warehouses[0]?.MaKho || '',
                  maKhoNhap: warehouses[1]?.MaKho || '',
                  maSP: products[0]?.MaSP || '',
                  soLuong: 5,
                  isInterBranch: true
                });
                setIsTransferModalOpen(true);
              }}
            >
              <ArrowRightLeft size={16} /> Điều Chuyển Kho Hàng
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

      {/* Tabs */}
      <div className="card" style={{ padding: 0 }}>
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Layers size={18} /> Báo Cáo Tồn Kho Xếp Hạng (View 1)
          </button>

          {canViewFinancials && (
            <>
              <button
                className={`tab-btn ${activeTab === 'revenue' ? 'active' : ''}`}
                onClick={() => setActiveTab('revenue')}
              >
                <TrendingUp size={18} /> Doanh Thu Chi Nhánh (SP 5)
              </button>
              <button
                className={`tab-btn ${activeTab === 'kpi' ? 'active' : ''}`}
                onClick={() => setActiveTab('kpi')}
              >
                <Award size={18} /> KPI Nhân Viên (mTVF 4)
              </button>
              <button
                className={`tab-btn ${activeTab === 'indexed' ? 'active' : ''}`}
                onClick={() => setActiveTab('indexed')}
              >
                <BarChart3 size={18} /> Sản Phẩm Bán Chạy (Indexed View)
              </button>
              <button
                className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
                onClick={() => setActiveTab('audit')}
              >
                <Shield size={18} /> Nhật Ký Hệ Thống (Audit Logs)
              </button>
            </>
          )}
        </div>

        {/* TAB 1: BÁO CÁO TỒN KHO XẾP HẠNG (v_BaoCaoTonKho_XepHang) */}
        {activeTab === 'inventory' && (
          <div style={{ padding: '24px' }}>
            <div style={{
              backgroundColor: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 'var(--radius-sm)',
              padding: '14px 18px',
              marginBottom: '20px',
              fontSize: '13px',
              color: '#1E3A8A'
            }}>
              <strong>Trực quan hóa Khung nhìn 1: <code>v_BaoCaoTonKho_XepHang</code></strong>
              <div style={{ marginTop: '4px', color: '#3B82F6', fontSize: '12px' }}>
                • <code>TyTrongTonKhoPct</code>: Tỷ trọng tồn kho tính qua <code>SUM(SoLuongTon) OVER (PARTITION BY MaKho)</code> với <code>NULLIF</code> phòng chia 0.
                <br />
                • <code>HangKhanHiemTaiChiNhanh</code>: Xếp hạng độ khan hiếm qua <code>DENSE_RANK() OVER (PARTITION BY MaCN ORDER BY SoLuongTon ASC)</code> (Rank 1 = Sắp hết nhất).
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Hạng Khan Hiếm</th>
                    <th>Chi Nhánh</th>
                    <th>Kho Hàng</th>
                    <th>Sản Phẩm</th>
                    <th style={{ textAlign: 'center' }}>Số Lượng Tồn</th>
                    <th style={{ textAlign: 'right' }}>Giá Bán</th>
                    <th style={{ textAlign: 'right' }}>Tổng Giá Trị Tồn</th>
                    <th style={{ textAlign: 'center' }}>Tỷ Trọng Trong Kho</th>
                    <th>Trạng Thái Tồn Kho</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryReport.map((r, idx) => (
                    <tr key={idx}>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${r.HangKhanHiemTaiChiNhanh === 1 ? 'badge-danger' : r.HangKhanHiemTaiChiNhanh <= 2 ? 'badge-warning' : 'badge-secondary'}`}>
                          Top #{r.HangKhanHiemTaiChiNhanh}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600 }}>{r.TenCN}</td>
                      <td>{r.TenKho}</td>
                      <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.TenSP}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>
                        {r.SoLuongTon} {r.DonViTinh}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {Number(r.GiaBanHienTai).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        {Number(r.TongGiaTriTonKho).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <div style={{
                            width: '60px',
                            height: '8px',
                            backgroundColor: '#E2E8F0',
                            borderRadius: '4px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${Math.min(r.TyTrongTonKhoPct || 0, 100)}%`,
                              height: '100%',
                              backgroundColor: 'var(--primary)'
                            }} />
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600 }}>
                            {r.TyTrongTonKhoPct}%
                          </span>
                        </div>
                      </td>
                      <td>{getStockStatusBadge(r.TrangThaiTonKho)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: DOANH THU CHI NHÁNH (sp_BaoCaoTongHopDoanhThuChiNhanh) */}
        {activeTab === 'revenue' && (
          <div style={{ padding: '24px' }}>
            {/* Filter controls */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <label className="form-label">Chọn Năm Thống Kê</label>
                <select className="form-select" value={revYear} onChange={(e) => setRevYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Tháng (Để trống = Cả năm)</label>
                <select className="form-select" value={revMonth} onChange={(e) => setRevMonth(e.target.value)}>
                  <option value="">-- Cả năm --</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã CN</th>
                    <th>Tên Chi Nhánh</th>
                    <th style={{ textAlign: 'center' }}>Tổng Số Đơn Hàng</th>
                    <th style={{ textAlign: 'right' }}>Tổng Doanh Thu Thu Về</th>
                    <th style={{ textAlign: 'right' }}>Giá Trị Đơn Trung Bình (AOV)</th>
                  </tr>
                </thead>
                <tbody>
                  {branchRevenue.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        Không có dữ liệu doanh thu cho khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    branchRevenue.map((br, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 700 }}>CN{br.MaCN}</td>
                        <td style={{ fontWeight: 700, fontSize: '14px' }}>{br.TenCN}</td>
                        <td style={{ textAlign: 'center', fontWeight: 600 }}>{br.TongSoDonHang} đơn</td>
                        <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)', fontSize: '15px' }}>
                          {Number(br.TongDoanhThu).toLocaleString('vi-VN')} đ
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                          {Number(br.GiaTriDonTrungBinh || 0).toLocaleString('vi-VN')} đ
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: KPI NHÂN VIÊN (fn_BaoCaoDoanhThuNhanVienChiTiet) */}
        {activeTab === 'kpi' && (
          <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <label className="form-label">Chọn Năm Đánh Giá KPI</label>
                <select className="form-select" value={kpiYear} onChange={(e) => setKpiYear(e.target.value)}>
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>Năm {y}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã NV</th>
                    <th>Họ Tên Nhân Viên</th>
                    <th>Chi Nhánh</th>
                    <th style={{ textAlign: 'center' }}>Số Đơn Hàng Đã Chốt</th>
                    <th style={{ textAlign: 'right' }}>Tổng Doanh Số Đạt Được</th>
                    <th style={{ textAlign: 'center' }}>Xếp Loại Đánh Giá KPI</th>
                  </tr>
                </thead>
                <tbody>
                  {staffKpi.map((kpi, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>NV{kpi.MaNV}</td>
                      <td style={{ fontWeight: 600 }}>{kpi.HoTen}</td>
                      <td>{kpi.TenChiNhanh}</td>
                      <td style={{ textAlign: 'center', fontWeight: 700 }}>{kpi.SoDonHangDaChot} đơn</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                        {Number(kpi.TongDoanhSo).toLocaleString('vi-VN')} đ
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${kpi.DanhGiaKPI === 'Xuất sắc' ? 'badge-success' : kpi.DanhGiaKPI === 'Khá' ? 'badge-primary' : 'badge-warning'}`}>
                          {kpi.DanhGiaKPI}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: SẢN PHẨM BÁN CHẠY (v_TongHopDoanhThuSanPham WITH NOEXPAND) */}
        {activeTab === 'indexed' && (
          <div style={{ padding: '24px' }}>
            <div style={{
              padding: '12px 18px',
              backgroundColor: '#F8FAFC',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '20px',
              fontSize: '13px'
            }}>
              Khung nhìn vật lý hóa (<strong>Indexed View WITH NOEXPAND</strong>): Truy xuất tức thì tổng doanh thu sản phẩm mà không cần quét lại bảng chi tiết hàng triệu dòng.
            </div>

            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã SP</th>
                    <th>Tên Sản Phẩm</th>
                    <th style={{ textAlign: 'center' }}>Tần Suất Xuất Hiện Trong Đơn</th>
                    <th style={{ textAlign: 'center' }}>Tổng Số Lượng Đã Bán</th>
                    <th style={{ textAlign: 'right' }}>Tổng Doanh Thu Thu Về</th>
                  </tr>
                </thead>
                <tbody>
                  {indexedSales.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 700 }}>#{item.MaSP}</td>
                      <td style={{ fontWeight: 700, fontSize: '14px' }}>{item.TenSP}</td>
                      <td style={{ textAlign: 'center' }}>{item.SoLanXuatHienTrongDon} lần</td>
                      <td style={{ textAlign: 'center', fontWeight: 700, color: '#16A34A' }}>
                        {item.TongSoLuongBan} cái
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>
                        {Number(item.TongDoanhThuThuVe).toLocaleString('vi-VN')} đ
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT LOGS (NhatKyHeThong) */}
        {activeTab === 'audit' && (
          <div style={{ padding: '24px' }}>
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '80px' }}>Mã Log</th>
                    <th>Hành Động Hệ Thống</th>
                    <th>Chi Tiết Ghi Vết</th>
                    <th>Thời Gian Ghi Nhận</th>
                    <th>Người Thực Hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.MaLog}>
                      <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{log.MaLog}</td>
                      <td>
                        <span className="badge badge-secondary">{log.HanhDong}</span>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-main)', maxWidth: '400px' }}>{log.NoiDung}</td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '12.5px' }}>
                        {new Date(log.ThoiGian).toLocaleString('vi-VN')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.NguoiThucHien}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Điều Chuyển Kho Hàng (SP 3 & Tx 5) */}
      {isTransferModalOpen && (
        <div className="modal-overlay" onClick={() => setIsTransferModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Điều Chuyển Tồn Kho Hàng Hóa</h3>
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }} onClick={() => setIsTransferModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleStockTransfer}>
              <div className="modal-body">
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
                      checked={transferForm.isInterBranch}
                      onChange={(e) => setTransferForm({ ...transferForm, isInterBranch: e.target.checked })}
                    />
                    Áp dụng Giao dịch ACID Tx 5: Điều chuyển liên chi nhánh (Khóa đồng thời 2 kho)
                  </label>
                  <p style={{ fontSize: '11.5px', color: '#64748B', marginTop: '4px', marginLeft: '24px' }}>
                    Nếu bỏ chọn: Chạy thủ tục <code>sp_ChuyenKhoNoiBo</code> kiểm soát UPDLOCK nội bộ.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Kho hàng xuất chuyển *</label>
                    <select
                      className="form-select"
                      value={transferForm.maKhoXuat}
                      onChange={(e) => setTransferForm({ ...transferForm, maKhoXuat: e.target.value })}
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
                  <div className="form-group">
                    <label className="form-label">Kho hàng nhập nhận *</label>
                    <select
                      className="form-select"
                      value={transferForm.maKhoNhap}
                      onChange={(e) => setTransferForm({ ...transferForm, maKhoNhap: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn kho nhập --</option>
                      {warehouses.map((w) => (
                        <option key={w.MaKho} value={w.MaKho}>
                          {w.TenKho} ({w.TenCN})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Sản phẩm cần chuyển *</label>
                    <select
                      className="form-select"
                      value={transferForm.maSP}
                      onChange={(e) => setTransferForm({ ...transferForm, maSP: e.target.value })}
                      required
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {products.map((p) => (
                        <option key={p.MaSP} value={p.MaSP}>
                          {p.TenSP}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Số lượng chuyển *</label>
                    <input
                      type="number"
                      className="form-input"
                      min="1"
                      value={transferForm.soLuong}
                      onChange={(e) => setTransferForm({ ...transferForm, soLuong: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsTransferModalOpen(false)}>Hủy</button>
                <button type="submit" className="btn btn-primary">Xác Nhận Chuyển Kho</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
