'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, message, Tag, Switch, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, AppstoreOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { clearCache } from '@/lib/auth';
import DepartmentDetailModal from '@/components/organization/DepartmentDetailModal';

const { Title, Text } = Typography;

const AVAILABLE_PERMISSIONS = [
  { value: 'tasks', label: 'Nhiệm vụ' },
  { value: 'warehouse', label: 'Kho' },
  { value: 'profile', label: 'Hồ sơ' },
];

export default function DepartmentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDept, setCurrentDept] = useState<any>(null);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const { data: depts, error } = await supabase
        .from('departments')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      setData(depts || []);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải danh sách bộ phận');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleAddEdit = (dept: any = null) => {
    setCurrentDept(dept);
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', id);
      if (error) throw error;
      clearCache();
      message.success('Đã xóa bộ phận');
      fetchDepartments();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa bộ phận');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Mã bộ phận',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
    },
    {
      title: 'Tên bộ phận',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Đầu vào',
      dataIndex: 'is_entry_point',
      key: 'is_entry_point',
      render: (v: boolean) => v ? <Tag color="green">Có thể nhận việc đầu</Tag> : <Tag>Không</Tag>,
    },
    {
      title: 'Quyền hạn',
      dataIndex: 'permissions',
      key: 'permissions',
      render: (perms: string[]) => (
        <Space size={2} wrap>
          {perms?.map(p => {
            const perm = AVAILABLE_PERMISSIONS.find(ap => ap.value === p);
            return <Tag key={p}>{perm?.label || p}</Tag>;
          })}
        </Space>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      align: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleAddEdit(record)} />
          <Popconfirm title="Xóa bộ phận này?" onConfirm={() => handleDelete(record.id)} okText="Xóa" cancelText="Hủy">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} className="m-0"><AppstoreOutlined /> Quản lý Bộ phận</Title>
          <Text type="secondary">Cấu hình các bộ phận sản xuất trong xưởng</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchDepartments}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddEdit()}>Thêm Bộ phận</Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} pagination={false} />
      </Card>

      <DepartmentDetailModal
        visible={modalVisible}
        department={currentDept}
        onClose={() => setModalVisible(false)}
        onRefresh={() => { clearCache(); fetchDepartments(); }}
      />
    </div>
  );
}
