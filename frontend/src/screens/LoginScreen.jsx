import React, { useState } from 'react';
import { api } from '../api/apiClient';
import { ShieldCheck, User, Lock, AlertCircle, CheckCircle2, Database, KeyRound, ArrowRight } from 'lucide-react';

export default function LoginScreen({ onLoginSuccess }) {
  const [username, setUsername] = useState('Login_Admin');
  const [password, setPassword] = useState('AdminPassword@2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const presets = [
    {
      label: 'Quản trị viên (Admin)',
      user: 'Login_Admin',
      pass: 'AdminPassword@2026',
      role: 'Role_Admin',
      desc: 'Toàn quyền điều hành hệ thống (Full Control Database)'
    },
    {
      label: 'Quản lý Chi nhánh',
      user: 'Login_QuanLyChiNhanh',
      pass: 'ManagerPassword@2026',
      role: 'Role_QuanLyChiNhanh',
      desc: 'Xem báo cáo, KPI, điều chuyển kho, xem phân cấp nhân sự'
    },
    {
      label: 'Thu ngân (Cashier)',
      user: 'Login_ThuNgan',
      pass: 'CashierPassword@2026',
      role: 'Role_ThuNgan',
      desc: 'Lập đơn hàng, in hóa đơn, tra cứu khách hàng VIP'
    },
    {
      label: 'Thủ kho (Stockkeeper)',
      user: 'Login_ThuKho',
      pass: 'StockPassword@2026',
      role: 'Role_ThuKho',
      desc: 'Theo dõi tồn kho xếp hạng, điều chuyển kho'
    },
    {
      label: 'System Admin (SA)',
      user: 'sa',
      pass: 'PasswordAdmin@2026',
      role: 'sysadmin',
      desc: 'Tài khoản gốc SQL Server 2022'
    }
  ];

  const handleSelectPreset = (p) => {
    setUsername(p.user);
    setPassword(p.pass);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await api.login(username, password);
      if (res.success) {
        setSuccessMsg(`Đăng nhập thành công! Vai trò: ${res.role}`);
        const userObj = {
          username: res.username,
          password,
          role: res.role
        };
        localStorage.setItem('dbms_user', JSON.stringify(userObj));
        setTimeout(() => {
          onLoginSuccess(userObj);
        }, 600);
      } else {
        setError(res.message || 'Đăng nhập thất bại.');
      }
    } catch (err) {
      setError(err.message || 'Không thể kết nối tới máy chủ SQL Server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--app-bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '1000px',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        backgroundColor: 'var(--card-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        boxShadow: 'var(--shadow-lg)',
        overflow: 'hidden'
      }}>
        {/* Left Side: Login Form */}
        <div style={{ padding: '48px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              backgroundColor: 'var(--primary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
                Hệ Thống Bán Hàng Chuỗi Chi Nhánh
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Xác thực tài khoản Native SQL Server RBAC
              </p>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '20px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <div>{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="alert alert-success" style={{ marginBottom: '20px' }}>
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <div>{successMsg}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Tên tài khoản (SQL Login)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Ví dụ: Login_Admin hoặc sa"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <User size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '24px' }}>
              <label className="form-label">Mật khẩu SQL Server</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '38px' }}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <Lock size={18} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
            >
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                  Đang xác thực kết nối CSDL...
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={18} />
                  Đăng Nhập Vào Hệ Thống
                  <ArrowRight size={18} />
                </div>
              )}
            </button>
          </form>

          <div style={{
            marginTop: '32px',
            paddingTop: '20px',
            borderTop: '1px solid var(--border-color)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Database size={14} /> SQL Server 2022
            </span>
            <span>Port: 11433 • Database: QuanLyBanHangDB</span>
          </div>
        </div>

        {/* Right Side: Role Presets & RBAC info */}
        <div style={{
          backgroundColor: '#0F172A',
          color: '#FFFFFF',
          padding: '40px 32px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderLeft: '1px solid var(--border-color)'
        }}>
          <div>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              backgroundColor: 'rgba(37, 99, 235, 0.2)',
              color: '#93C5FD',
              borderRadius: '9999px',
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              marginBottom: '12px'
            }}>
              Nguyên lý Least Privilege (RLS & Roles)
            </div>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px', color: '#F8FAFC' }}>
              Chọn nhanh tài khoản kiểm thử
            </h3>
            <p style={{ fontSize: '12.5px', color: '#94A3B8', marginBottom: '20px' }}>
              Hệ thống áp dụng 4 nhóm quyền Database Role độc lập với cơ chế bảo mật nghiêm ngặt:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {presets.map((p, idx) => {
                const isSelected = username === p.user;
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectPreset(p)}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.25)' : '#1E293B',
                      border: `1px solid ${isSelected ? '#3B82F6' : '#334155'}`,
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>{p.label}</span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        backgroundColor: '#0F172A',
                        color: '#60A5FA',
                        fontFamily: 'monospace'
                      }}>
                        {p.role}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#94A3B8' }}>{p.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '24px', fontSize: '11.5px', color: '#64748B', textAlign: 'center' }}>
            Học phần: Hệ Quản Trị CSDL (DBMS330284) • TS. Phan Thị Thể
          </div>
        </div>
      </div>
    </div>
  );
}
