import React, { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import ProductScreen from './screens/ProductScreen';
import OrganizationScreen from './screens/OrganizationScreen';
import OrderScreen from './screens/OrderScreen';
import ReportScreen from './screens/ReportScreen';
import { 
  Package, Building2, ShoppingCart, BarChart3, LogOut, 
  ShieldCheck, Database, Layers, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('dbms_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [currentScreen, setCurrentScreen] = useState('products'); // 'products' | 'organization' | 'orders' | 'reports'

  const handleLogout = () => {
    localStorage.removeItem('dbms_user');
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={(user) => setCurrentUser(user)} />;
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'products':
        return { title: 'Quản Lý Sản Phẩm', desc: 'Danh mục, tìm kiếm đa tiêu chí & lịch sử biến động giá' };
      case 'organization':
        return { title: 'Chi Nhánh, Nhân Sự & Khách Hàng', desc: 'Mô hình chuỗi đa chi nhánh, cây phân cấp & xếp hạng VIP' };
      case 'orders':
        return { title: 'Đơn Hàng & Hóa Đơn', desc: 'Quản lý bán hàng, in chứng từ hóa đơn & giữ chỗ tồn kho' };
      case 'reports':
        return { title: 'Tra Cứu & Báo Cáo Thống Kê', desc: 'Báo cáo tồn kho xếp hạng, KPI doanh thu & Indexed Views' };
      default:
        return { title: 'Hệ Thống Quản Lý Bán Hàng', desc: 'Bảng điều khiển trung tâm' };
    }
  };

  const navInfo = getScreenTitle();

  return (
    <div className="app-container">
      {/* Sidebar: Slate Dark #0F172A */}
      <aside className="sidebar">
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="brand-icon">
            <Database size={22} />
          </div>
          <div>
            <div className="brand-title">DBMS Retail Enterprise</div>
            <div className="brand-subtitle">Chuỗi Bán Hàng Đa Kho</div>
          </div>
        </div>

        {/* Navigation Menu */}
        <div className="sidebar-menu">
          <div className="menu-section-title">Phân Hệ Nghiệp Vụ</div>

          <div
            className={`nav-item ${currentScreen === 'products' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('products')}
          >
            <Package size={18} />
            <span style={{ flex: 1 }}>Quản Lý Sản Phẩm</span>
            {currentScreen === 'products' && <ChevronRight size={14} />}
          </div>

          <div
            className={`nav-item ${currentScreen === 'organization' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('organization')}
          >
            <Building2 size={18} />
            <span style={{ flex: 1 }}>Chi Nhánh & Nhân Sự</span>
            {currentScreen === 'organization' && <ChevronRight size={14} />}
          </div>

          <div
            className={`nav-item ${currentScreen === 'orders' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('orders')}
          >
            <ShoppingCart size={18} />
            <span style={{ flex: 1 }}>Đơn Hàng & Hóa Đơn</span>
            {currentScreen === 'orders' && <ChevronRight size={14} />}
          </div>

          <div className="menu-section-title" style={{ marginTop: '12px' }}>Phân Tích & Báo Cáo</div>

          <div
            className={`nav-item ${currentScreen === 'reports' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('reports')}
          >
            <BarChart3 size={18} />
            <span style={{ flex: 1 }}>Tra Cứu & Thống Kê</span>
            {currentScreen === 'reports' && <ChevronRight size={14} />}
          </div>
        </div>

        {/* Sidebar Footer: User Role & Logout */}
        <div className="sidebar-footer">
          <div className="user-badge" style={{ marginBottom: '14px' }}>
            <div className="user-avatar">
              {currentUser.username.substring(0, 2).toUpperCase()}
            </div>
            <div className="user-info">
              <div className="user-name">{currentUser.username}</div>
              <div className="user-role">
                <ShieldCheck size={12} color="#60A5FA" />
                <span>{currentUser.role || 'User'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '8px 12px',
              backgroundColor: '#1E293B',
              color: '#EF4444',
              border: '1px solid #334155',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={14} /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        {/* Topbar: Pure White #FFFFFF */}
        <header className="topbar">
          <div className="topbar-left">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 className="page-heading" style={{ fontSize: '18px' }}>{navInfo.title}</h2>
                <span className="badge badge-primary" style={{ fontSize: '11px', textTransform: 'uppercase' }}>
                  Live DBMS
                </span>
              </div>
              <span className="page-subheading">{navInfo.desc}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#065F46',
              backgroundColor: '#ECFDF5',
              padding: '6px 12px',
              borderRadius: '9999px',
              border: '1px solid #A7F3D0',
              fontWeight: 600
            }}>
              <CheckCircle2 size={14} /> SQL Server 2022 Online (Port 11433)
            </div>
          </div>
        </header>

        {/* Active Screen Body */}
        <main style={{ flex: 1 }}>
          {currentScreen === 'products' && <ProductScreen />}
          {currentScreen === 'organization' && <OrganizationScreen />}
          {currentScreen === 'orders' && <OrderScreen />}
          {currentScreen === 'reports' && <ReportScreen />}
        </main>
      </div>
    </div>
  );
}
