'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Avatar, Button, Descriptions, Tag, Divider, Form, Input, message, Tabs, Space } from 'antd';
import { UserOutlined, MailOutlined, IdcardOutlined, SafetyCertificateOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { getUser, setUser, getAccessibleModules } from '@/lib/auth';
import bcrypt from 'bcryptjs';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const [user, setUserState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const savedUser = getUser();
    if (savedUser) {
      setUserState(savedUser);
      form.setFieldsValue({
        full_name: savedUser.full_name,
        username: savedUser.username
      });
    }
  }, []);

  const handleUpdate = async (values: any) => {
    setLoading(true);
    try {
      const updates: any = { full_name: values.full_name };
      
      // Only update password if provided
      if (values.password) {
        updates.password = bcrypt.hashSync(values.password, 10);
      }
      
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user.id);
      
      if (error) throw error;
      
      const updatedUser = { ...user, full_name: values.full_name };
      setUser(updatedUser);
      setUserState(updatedUser);
      message.success('Đã cập nhật thông tin cá nhân');
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

  const accessibleModules = user ? getAccessibleModules(user) : [];

  const tabItems = [
    {
      key: '1',
      label: 'Thông tin cơ bản',
      children: (
        <Form form={form} layout="vertical" onFinish={handleUpdate} className="mt-4">
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item name="username" label="Tên đăng nhập">
                <Input disabled prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="full_name" label="Họ và tên" rules={[{ required: true }]}>
                <Input prefix={<IdcardOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="password" label="Mật khẩu mới (Bỏ trống nếu không đổi)">
                <Input.Password prefix={<LockOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading} shape="round">Cập nhật hồ sơ</Button>
        </Form>
      )
    },
    {
      key: '2',
      label: 'Bảo mật & Phân quyền',
      children: (
        <div className="mt-4">
          <Descriptions title="Chi tiết quyền hạn" bordered column={1}>
            <Descriptions.Item label="Vai trò">{user?.role?.name}</Descriptions.Item>
            <Descriptions.Item label="Phân hệ truy cập">
              <Tag color={user?.role?.portal === 'management' ? 'blue' : 'green'}>
                {user?.role?.portal?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Bộ phận công tác">{user?.department?.name}</Descriptions.Item>
            <Descriptions.Item label="Module được truy cập">
              <Space wrap>
                {accessibleModules.map(m => (
                  <Tag key={m} color="processing">{m}</Tag>
                ))}
              </Space>
            </Descriptions.Item>
          </Descriptions>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-10">
      <Card className="shadow-xl rounded-3xl overflow-hidden border-none bg-gradient-to-br from-blue-600 to-indigo-700 mb-8" styles={{ body: { padding: 40 } }}>
        <Row align="middle" gutter={32}>
          <Col>
            <Avatar size={120} icon={<UserOutlined />} className="shadow-2xl border-4 border-white/20 bg-white/10" />
          </Col>
          <Col>
            <Title level={1} className="m-0 text-white font-black">{user?.full_name}</Title>
            <Space className="mt-2">
              <Tag color="blue" className="rounded-full border-none bg-white/20 text-white font-bold px-4">{user?.role?.name?.toUpperCase()}</Tag>
              <Text className="text-white/70 font-mono tracking-widest">{user?.username}</Text>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card className="shadow-xl rounded-2xl border-none">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>
    </div>
  );
}
