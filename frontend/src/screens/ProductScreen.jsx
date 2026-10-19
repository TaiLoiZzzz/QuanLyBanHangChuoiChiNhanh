import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import { 
  Package, Search, Plus, Filter, Edit3, Trash2, RefreshCw, 
  Tag, AlertCircle, CheckCircle2, History, DollarSign 
} from 'lucide-react';

import { getUserRole, canPerformAction, ROLES } from '../utils/permissions';

export default function ProductScreen() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem('dbms_user') || '{}');
  const userRole = getUserRole(currentUser);
  const canAddProduct = canPerformAction(userRole, 'ADD_PRODUCT');
  const canEditProduct = canPerformAction(userRole, 'EDIT_PRODUCT');

  // Search Filters (sp_TimKiemSanPhamNangCao)
  const [tuKhoa, setTuKhoa] = useState('');
  const [maDM, setMaDM] = useState('');
  const [giaMin, setGiaMin] = useState('');
  const [giaMax, setGiaMax] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    tenSP: '',
    maDM: '',
    giaBanHienTai: '',
    donViTinh: 'Cái'
  });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.getProducts(),
        api.getCategories()
      ]);
      if (prodRes.success) setProducts(prodRes.products || []);
      if (catRes.success) setCategories(catRes.categories || []);
    } catch (err) {
      setError(err.message || 'Lỗi khi tải dữ liệu sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.searchProducts({
        tuKhoa: tuKhoa.trim(),
        maDM: maDM ? Number(maDM) : null,
        giaMin: giaMin ? Number(giaMin) : null,
        giaMax: giaMax ? Number(giaMax) : null
      });
      if (res.success) {
        setProducts(res.products || []);
      }
    } catch (err) {
      setError(err.message || 'Lỗi khi tìm kiếm sản phẩm với SP 4.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setTuKhoa('');
    setMaDM('');
    setGiaMin('');
    setGiaMax('');
    fetchData();
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      tenSP: '',
      maDM: categories[0]?.MaDM || '',
      giaBanHienTai: '',
      donViTinh: 'Cái'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    setEditingProduct(p);
    setFormData({
      tenSP: p.TenSP,
      maDM: p.MaDM,
      giaBanHienTai: p.GiaBanHienTai,
      donViTinh: p.DonViTinh
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!formData.tenSP.trim() || !formData.maDM || !formData.giaBanHienTai) {
      setError('Vui lòng điền đầy đủ các trường bắt buộc.');
      return;
    }

    try {
      if (editingProduct) {
        // Cập nhật giá bán -> Kích hoạt Trigger 2 (trg_SanPham_LichSuGia)
        const res = await api.updateProduct(editingProduct.MaSP, {
          tenSP: formData.tenSP.trim(),
          maDM: Number(formData.maDM),
          giaBanHienTai: Number(formData.giaBanHienTai),
          donViTinh: formData.donViTinh.trim()
        });
        if (res.success) {
          setSuccess('Cập nhật sản phẩm thành công! (Trigger trg_SanPham_LichSuGia đã ghi lịch sử biến động giá).');
        }
      } else {
        const res = await api.createProduct({
          tenSP: formData.tenSP.trim(),
          maDM: Number(formData.maDM),
          giaBanHienTai: Number(formData.giaBanHienTai),
          donViTinh: formData.donViTinh.trim()
        });
        if (res.success) {
          setSuccess('Thêm sản phẩm mới và đồng bộ kho hàng thành công!');
        }
      }
      setIsModalOpen(false);
      fetchData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu sản phẩm.');
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mềm sản phẩm "${name}" (DaXoa = 1)?`)) return;
    try {
      await api.deleteProduct(id);
      setSuccess(`Đã xóa mềm sản phẩm "${name}". Dữ liệu lịch sử đơn hàng vẫn được giữ nguyên.`);
      fetchData();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err) {
      setError(err.message || 'Lỗi khi xóa sản phẩm.');
    }
  };

  return (
    <div className="content-body">
      {/* Top action & Page title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-heading">Quản Lý Sản Phẩm & Danh Mục</h1>
          <p className="page-subheading">
            Tra cứu với Stored Procedure <code>sp_TimKiemSanPhamNangCao</code> & Audit Log giá bán với Trigger <code>trg_SanPham_LichSuGia</code>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={fetchData} title="Làm mới">
            <RefreshCw size={16} /> Làm mới
          </button>
          {canAddProduct && (
            <button className="btn btn-primary" onClick={handleOpenAddModal}>
              <Plus size={16} /> Thêm Sản Phẩm Mới
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

      {/* Advanced Filter Box (sp_TimKiemSanPhamNangCao) */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            <Filter size={18} color="var(--primary)" />
            Bộ lọc tìm kiếm nâng cao (Stored Procedure Dynamic SQL)
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-sm btn-secondary" onClick={handleResetFilters}>
              Đặt lại
            </button>
            <button className="btn btn-sm btn-primary" onClick={handleSearch}>
              <Search size={14} /> Tìm kiếm
            </button>
          </div>
        </div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            <div>
              <label className="form-label">Tên sản phẩm / Từ khóa</label>
              <input
                type="text"
                className="form-input"
                placeholder="VD: Áo thun, Ví da..."
                value={tuKhoa}
                onChange={(e) => setTuKhoa(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Danh mục hàng hóa</label>
              <select
                className="form-select"
                value={maDM}
                onChange={(e) => setMaDM(e.target.value)}
              >
                <option value="">-- Tất cả danh mục --</option>
                {categories.map((c) => (
                  <option key={c.MaDM} value={c.MaDM}>
                    {c.TenDM} ({c.SoLuongSanPham} SP)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Giá tối thiểu (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                placeholder="0"
                value={giaMin}
                onChange={(e) => setGiaMin(e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">Giá tối đa (VNĐ)</label>
              <input
                type="number"
                className="form-input"
                placeholder="1,000,000"
                value={giaMax}
                onChange={(e) => setGiaMax(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="card">
        <div className="card-header">
          <div className="card-title-group">
            <h3 className="card-title">
              <Package size={18} color="var(--primary)" />
              Danh Sách Sản Phẩm Kinh Doanh
            </h3>
            <span className="card-subtitle">
              Hiển thị {products.length} mặt hàng (Áp dụng cơ chế Soft-delete <code>DaXoa = 0</code>)
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Mã SP</th>
                <th>Tên Sản Phẩm</th>
                <th>Danh Mục</th>
                <th style={{ textAlign: 'right' }}>Giá Bán Hiện Tại</th>
                <th style={{ textAlign: 'center' }}>Đơn Vị Tính</th>
                <th style={{ textAlign: 'center' }}>Tổng Tồn Kho</th>
                {canEditProduct && <th style={{ textAlign: 'right' }}>Thao Tác</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={canEditProduct ? 7 : 6} style={{ textAlign: 'center', padding: '40px' }}>
                    <div className="spinner" style={{ margin: '0 auto 12px' }} />
                    <span style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu từ SQL Server...</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={canEditProduct ? 7 : 6}>
                    <div className="empty-state">
                      <Package size={36} className="empty-icon" />
                      <p>Không tìm thấy sản phẩm nào phù hợp với điều kiện tìm kiếm.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.MaSP}>
                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>#{p.MaSP}</td>
                    <td style={{ fontWeight: 600 }}>{p.TenSP}</td>
                    <td>
                      <span className="badge badge-secondary">
                        <Tag size={12} /> {p.TenDM}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>
                      {Number(p.GiaBanHienTai).toLocaleString('vi-VN')} đ
                    </td>
                    <td style={{ textAlign: 'center' }}>{p.DonViTinh}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${p.TongTonKho > 20 ? 'badge-success' : p.TongTonKho > 0 ? 'badge-warning' : 'badge-danger'}`}>
                        {p.TongTonKho !== undefined ? `${p.TongTonKho} ${p.DonViTinh}` : 'Xem tại Kho'}
                      </span>
                    </td>
                    {canEditProduct && (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleOpenEditModal(p)}
                            title="Sửa thông tin / Cập nhật giá"
                          >
                            <Edit3 size={14} /> Sửa
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => handleDeleteProduct(p.MaSP, p.TenSP)}
                            title="Xóa mềm"
                          >
                            <Trash2 size={14} /> Xóa
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Product */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Chỉnh Sửa Thông Tin Sản Phẩm' : 'Thêm Mới Sản Phẩm'}
              </h3>
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: 'var(--text-muted)' }}
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveProduct}>
              <div className="modal-body">
                {editingProduct && (
                  <div className="alert alert-info" style={{ marginBottom: '16px', fontSize: '12.5px' }}>
                    <History size={16} />
                    <span>
                      Khi sửa giá bán, Trigger <code>trg_SanPham_LichSuGia</code> sẽ tự động lưu giá cũ và giá mới vào bảng <code>LichSuGia</code>.
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Tên sản phẩm *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="VD: Áo Sơ Mi Oxford Cao Cấp"
                    value={formData.tenSP}
                    onChange={(e) => setFormData({ ...formData, tenSP: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Danh mục sản phẩm *</label>
                  <select
                    className="form-select"
                    value={formData.maDM}
                    onChange={(e) => setFormData({ ...formData, maDM: e.target.value })}
                    required
                  >
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map((c) => (
                      <option key={c.MaDM} value={c.MaDM}>
                        {c.TenDM}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label">Giá bán hiện tại (VNĐ) *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="250000"
                        min="1000"
                        value={formData.giaBanHienTai}
                        onChange={(e) => setFormData({ ...formData, giaBanHienTai: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Đơn vị tính *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Cái, Bộ, Đôi..."
                      value={formData.donViTinh}
                      onChange={(e) => setFormData({ ...formData, donViTinh: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Lưu Thay Đổi' : 'Thêm Mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
