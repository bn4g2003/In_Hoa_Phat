'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Typography, Modal, Form, Input, Select, message, Tag, Avatar, Row, Col } from 'antd';
import { PlusOutlined, EditOutlined, UserOutlined, TeamOutlined, ReloadOutlined, KeyOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function StaffPage() {
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Users
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

      // 2. Fetch Departments for select
      const { data: depts } = await supabase.from('departments').select('*').order('id', { ascending: true });
      setDepartments(depts || []);

      // 3. Fetch Roles for select
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
    if (user) {
      form.setFieldsValue({
        username: user.username,
        full_name: user.full_name,
        role_id: user.role_id,
        department_id: user.department_id,
      });
    } else {
      form.resetFields();
    }
    setModalVisible(true);
  };

  const onFinish = async (values: any) => {
    try {
      if (currentUser) {
        // Update
        const updates: any = { ...values };
        if (values.password) {
          updates.password = bcrypt.hashSync(values.password, 10);
        } else {
          delete updates.password;
        }

        const { error } = await supabase
          .from('users')
          .update(updates)
          .eq('id', currentUser.id);
        if (error) throw error;
        message.success('Đã cập nhật nhân sự');
      } else {
        // Create
        if (!values.password) {
          return message.error('Mật khẩu là bắt buộc cho tài khoản mới');
        }
        const newUser = {
          ...values,
          password: bcrypt.hashSync(values.password, 10),
        };
        const { error } = await supabase
          .from('users')
          .insert([newUser]);
        if (error) throw error;
        message.success('Đã thêm nhân sự mới');
      }
      setModalVisible(false);
      fetchData();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lưu thông tin');
    }
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
        <Button title="Chỉnh sửa" type="text" icon={<EditOutlined />} onClick={() => handleAddEdit(record)} />
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

      <Modal
        title={currentUser ? 'Chỉnh sửa Nhân sự' : 'Thêm Nhân sự mới'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: nhatbang" disabled={!!currentUser} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
                <Input placeholder="Ví dụ: Nguyễn Nhật Bang" />
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item 
                name="password" 
                label={currentUser ? "Mật khẩu mới (Để trống nếu không đổi)" : "Mật khẩu"} 
                rules={[{ required: !currentUser }]}
              >
                <Input.Password prefix={<KeyOutlined />} placeholder="Nhập mật khẩu" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="role_id" label="Chức vụ" rules={[{ required: true }]}>
                <Select placeholder="Chọn chức vụ">
                  {roles.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="department_id" label="Bộ phận làm việc" rules={[{ required: true }]}>
                <Select placeholder="Gán bộ phận">
                  {departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
