'use client';

import React, { useState, useEffect } from 'react';
import { Layout, Menu, Breadcrumb, Button, Avatar, Dropdown, theme, Typography } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  ContainerOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  PrinterOutlined,
  TeamOutlined,
  AppstoreOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

interface MainLayoutProps {
  children: React.ReactNode;
  portal: 'management' | 'operation';
}

export default function MainLayout({ children, portal }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const savedUser = localStorage.getItem('ppms_user');
    if (!savedUser) {
      router.push('/login');
    } else {
      setUser(JSON.parse(savedUser));
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('ppms_user');
    router.push('/login');
  };

  const menuItems = portal === 'management' ? [
    { key: '/management/dashboard', icon: <DashboardOutlined />, label: <Link href="/management/dashboard">Dashboard</Link> },
    { key: '/management/crm', icon: <UserOutlined />, label: <Link href="/management/crm">Khách hàng</Link> },
    { key: '/management/orders', icon: <ShoppingCartOutlined />, label: <Link href="/management/orders">Đơn hàng</Link> },
    { 
      key: 'organization', 
      icon: <TeamOutlined />, 
      label: 'Tổ chức',
      children: [
        { key: '/management/organization/departments', icon: <AppstoreOutlined />, label: <Link href="/management/organization/departments">Bộ phận</Link> },
        { key: '/management/organization/staff', icon: <TeamOutlined />, label: <Link href="/management/organization/staff">Nhân sự</Link> },
      ]
    },
    { key: '/management/config', icon: <SettingOutlined />, label: <Link href="/management/config">Cấu hình hệ thống</Link> },
  ] : [
    { key: '/operation/tasks', icon: <ContainerOutlined />, label: <Link href="/operation/tasks">Nhiệm vụ</Link> },
    { key: '/operation/warehouse', icon: <DatabaseOutlined />, label: <Link href="/operation/warehouse">Kho</Link> },
  ];

  const userMenuItems = [
    { key: 'profile', label: <Link href="/profile">Hồ sơ cá nhân</Link>, icon: <UserOutlined /> },
    { type: 'divider' as const },
    { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true, onClick: handleLogout },
  ];

  const getBreadcrumbs = () => {
    const paths = pathname.split('/').filter(p => p);
    return paths.map((path, index) => {
      const url = `/${paths.slice(0, index + 1).join('/')}`;
      const isLast = index === paths.length - 1;
      const label = path === 'management' ? 'Quản lý' 
                  : path === 'operation' ? 'Vận hành'
                  : path === 'dashboard' ? 'Dashboard'
                  : path === 'crm' ? 'Khách hàng'
                  : path === 'orders' ? 'Đơn hàng'
                  : path === 'tasks' ? 'Nhiệm vụ'
                  : path === 'warehouse' ? 'Kho'
                  : path;
      return { title: isLast ? label : <Link href={url}>{label}</Link> };
    });
  };

  if (!user) return null;

  return (
    <Layout className="min-h-screen">
      <Sider trigger={null} collapsible collapsed={collapsed} theme="light" className="shadow-sm border-r" width={250}>
        <div className="p-4 flex items-center justify-center mb-4 transition-all duration-300">
          <div className={`bg-blue-600 rounded-xl flex items-center justify-center shadow-lg ${collapsed ? 'w-10 h-10' : 'w-12 h-12 mr-3'}`}>
            <PrinterOutlined className="text-white text-xl" />
          </div>
          {!collapsed && <Title level={4} className="m-0 text-blue-600 font-bold overflow-hidden whitespace-nowrap">PPMS</Title>}
        </div>
        <Menu theme="light" mode="inline" selectedKeys={[pathname]} items={menuItems} className="border-none px-2" />
      </Sider>
      <Layout>
        <Header className="p-0 bg-white flex items-center justify-between px-6 shadow-sm z-10" style={{ height: 64 }}>
          <div className="flex items-center">
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} className="w-10 h-10 mr-4" />
            <Breadcrumb items={getBreadcrumbs()} />
          </div>
          <div className="flex items-center">
            <div className="mr-4 text-right hidden sm:block">
              <div className="font-medium text-sm">{(user as any).full_name || (user as any).username}</div>
              <div className="text-xs text-gray-400">{(user as any).role?.name} - {(user as any).department?.name}</div>
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight" arrow>
              <Avatar size="large" icon={<UserOutlined />} className="bg-blue-100 text-blue-600 cursor-pointer" />
            </Dropdown>
          </div>
        </Header>
        <Content className="m-6 p-6 bg-white rounded-xl shadow-sm overflow-auto" style={{ minHeight: 280 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
