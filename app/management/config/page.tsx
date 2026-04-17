'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Row, Col, Space, Button, 
  Tag, Tabs, List, Avatar, message, Modal, Form, Input, Select 
} from 'antd';
import { 
  SettingOutlined, 
  TeamOutlined, 
  DeploymentUnitOutlined, 
  SafetyCertificateOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;
const { Option } = Select;

export default function ConfigPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'role' | 'dept' | 'user'>('role');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: r } = await supabase.from('roles').select('*').order('id');
      const { data: d } = await supabase.from('departments').select('*').order('id');
      const { data: u } = await supabase.from('users').select('*, roles(name), departments(name)').order('created_at');
      
      setRoles(r || []);
      setDepartments(d || []);
      setUsers(u || []);
    } catch (err) {
      message.error('Lỗi khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      let table = '';
      if (modalType === 'role') table = 'roles';
      else if (modalType === 'dept') table = 'departments';
      else if (modalType === 'user') table = 'users';

      if (modalType === 'user' && values.password) {
        const salt = bcrypt.genSaltSync(10);
        values.password = bcrypt.hashSync(values.password, salt);
      }

      const { error } = await supabase.from(table).insert([values]);
      if (error) throw error;
      
      message.success(`Đã thêm ${modalType} mới`);
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error('Lỗi khi lưu');
    }
  };

  const tabItems = [
    {
      key: '1',
      label: <span><TeamOutlined /> Quản lý Nhân sự</span>,
      children: (
        <Card className="shadow-sm border-none" styles={{ body: { padding: 0 } }}>
          <div className="p-4 flex justify-end">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => { setModalType('user'); setModalVisible(true); }}>Thêm Nhân viên</Button>
          </div>
          <Table 
            columns={[
              { title: 'Nhân viên', key: 'name', render: (_, r) => <Space><Avatar icon={<UserOutlined />} /> <Text strong>{r.full_name}</Text></Space> },
              { title: 'Tên đăng nhập', dataIndex: 'username', key: 'user' },
              { title: 'Vai trò', dataIndex: ['roles', 'name'], key: 'role', render: (t) => <Tag color="blue">{t}</Tag> },
              { title: 'Bộ phận', dataIndex: ['departments', 'name'], key: 'dept' },
              { title: 'Thao tác', key: 'action', render: () => <Space><Button size="small" icon={<EditOutlined />} /><Button size="small" danger icon={<DeleteOutlined />} /></Space> }
            ]}
            dataSource={users}
            rowKey="id"
            loading={loading}
          />
        </Card>
      )
    },
    {
      key: '2',
      label: <span><DeploymentUnitOutlined /> Vai trò & Bộ phận</span>,
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card title="Danh sách Vai trò" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { setModalType('role'); setModalVisible(true); }} />}>
              <Table 
                dataSource={roles} 
                rowKey="id" 
                size="small"
                columns={[
                  { title: 'Tên vai trò', dataIndex: 'name', key: 'name' },
                  { title: 'Phân hệ', dataIndex: 'portal', key: 'portal', render: (p) => <Tag>{p.toUpperCase()}</Tag> }
                ]}
                pagination={false}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Danh sách Bộ phận" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { setModalType('dept'); setModalVisible(true); }} />}>
              <Table 
                dataSource={departments} 
                rowKey="id" 
                size="small"
                columns={[
                  { title: 'Tên bộ phận', dataIndex: 'name', key: 'name' },
                  { title: 'Code', dataIndex: 'code', key: 'code' }
                ]}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <Title level={2} className="m-0"><SettingOutlined /> Cấu hình Hệ thống</Title>
          <Text type="secondary">Quản trị nhân sự, vai trò và các cài đặt cốt lõi</Text>
        </div>
        <Button icon={<HistoryOutlined />} shape="circle" />
      </div>

      <Tabs defaultActiveKey="1" items={tabItems} className="config-tabs bg-white p-4 rounded-2xl shadow-sm border border-gray-100" />

      <Modal
        title={`Thêm ${modalType} mới`}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          {modalType === 'role' && (
            <>
              <Form.Item name="name" label="Tên vai trò" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="portal" label="Phân hệ" rules={[{ required: true }]}><Select><Option value="management">Quản lý</Option><Option value="operation">Vận hành</Option></Select></Form.Item>
            </>
          )}
          {modalType === 'dept' && (
            <>
              <Form.Item name="name" label="Tên bộ phận" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="code" label="Mã code (Viết hoa)" rules={[{ required: true }]}><Input /></Form.Item>
            </>
          )}
          {modalType === 'user' && (
            <>
              <Form.Item name="full_name" label="Họ tên" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}><Input /></Form.Item>
              <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}><Input.Password /></Form.Item>
              <Form.Item name="role_id" label="Vai trò" rules={[{ required: true }]}>
                <Select>{roles.map(r => <Option key={r.id} value={r.id}>{r.name}</Option>)}</Select>
              </Form.Item>
              <Form.Item name="department_id" label="Bộ phận" rules={[{ required: true }]}>
                <Select>{departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}</Select>
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <style jsx global>{`
        .config-tabs .ant-tabs-nav { margin-bottom: 24px; }
      `}</style>
    </div>
  );
}

// Missed import
import { HistoryOutlined } from '@ant-design/icons';
