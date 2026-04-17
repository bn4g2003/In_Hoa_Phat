'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, message, Tag, Avatar } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined, TeamOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import StaffDetailModal from '@/components/organization/StaffDetailModal';

const { Title, Text } = Typography;

export default function StaffPage() {
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: users, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          departments (name, code),
          roles (name, portal)
        `)
        .order('created_at', { ascending: false });
      
      if (userError) throw userError;
      setData(users || []);

      const { data: depts } = await supabase.from('departments').select('*').order('id', { ascending: true });
      setDepartments(depts || []);

      const { data: roleList } = await supabase.from('roles').select('*').order('id', { ascending: true });
      setRoles(roleList || []);

    } catch (err) {
      console.error(err);
      message.error('Không thể tải dữ liệu nhân sự');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEdit = (user: any = null) => {
    setCurrentUser(user);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Nhân viên',
      key: 'user',
      render: (_: any, record: any) => (
        <Space>
          <Avatar icon={<UserOutlined />} className="bg-blue-600" />
          <div>
            <div className="font-bold text-sm">{record.full_name}</div>
            <Text type="secondary" style={{ fontSize: '11px' }}>@{record.username}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Chức vụ',
      dataIndex: ['roles', 'name'],
      key: 'role',
      render: (role: string) => <Tag color="purple">{role}</Tag>,
    },
    {
      title: 'Bộ phận',
      dataIndex: ['departments', 'name'],
      key: 'department',
      render: (dept: string) => <Tag color="blue">{dept || 'Chưa gán'}</Tag>,
    },
    {
      title: 'Ngày tham gia',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 100,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Button title="Xem chi tiết" type="text" icon={<EditOutlined />} onClick={() => handleAddEdit(record)} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} className="m-0"><TeamOutlined /> Quản lý Nhân sự</Title>
          <Text type="secondary">Quản lý tài khoản, chức vụ và gán bộ phận làm việc</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddEdit()}>Thêm Nhân sự</Button>
        </Space>
      </div>

      <Card className="shadow-sm overflow-hidden">
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
      </Card>

      <StaffDetailModal
        visible={modalVisible}
        staff={currentUser}
        departments={departments}
        roles={roles}
        onClose={() => setModalVisible(false)}
        onRefresh={fetchData}
      />
    </div>
  );
}
