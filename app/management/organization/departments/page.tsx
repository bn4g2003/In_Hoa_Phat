'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, Modal, Form, Input, message, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, AppstoreOutlined, ReloadOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function DepartmentsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentDept, setCurrentDept] = useState<any>(null);
  const [form] = Form.useForm();

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
    if (dept) {
      form.setFieldsValue(dept);
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (currentDept) {
        const { error } = await supabase
          .from('departments')
          .update(values)
          .eq('id', currentDept.id);
        if (error) throw error;
        message.success('Đã cập nhật bộ phận');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([values]);
        if (error) throw error;
        message.success('Đã thêm bộ phận mới');
      }
      setModalVisible(false);
      fetchDepartments();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lưu thông tin');
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
      message.success('Đã xóa bộ phận');
      fetchDepartments();
    } catch (err) {
      message.error('Lỗi khi xóa bộ phận. Có thể có dữ liệu liên quan.');
    }
  };

  const columns = [
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
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
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

      <Modal
        title={currentDept ? 'Chỉnh sửa Bộ phận' : 'Thêm Bộ phận mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={400}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="name" label="Tên bộ phận" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: Tầng G, In Offset..." />
          </Form.Item>
          <Form.Item name="code" label="Mã định danh" rules={[{ required: true }]}>
            <Input placeholder="Ví dụ: FLG, OFFSET..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
