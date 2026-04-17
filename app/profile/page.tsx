'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Avatar, Button, Descriptions, Tag, Divider, Form, Input, message, Tabs, Space } from 'antd';
import { UserOutlined, MailOutlined, IdcardOutlined, SafetyCertificateOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const savedUser = localStorage.getItem('ppms_user');
    if (savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      form.setFieldsValue({
        full_name: u.full_name,
        username: u.username
      });
    }
  }, []);

  const handleUpdate = async (values: any) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          full_name: values.full_name,
          password: values.password || user.password // Simplified for demo
        })
        .eq('id', user.id);
      
      if (error) throw error;
      
      const updatedUser = { ...user, full_name: values.full_name };
      localStorage.setItem('ppms_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      message.success('Đã cập nhật thông tin cá nhân');
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    } finally {
      setLoading(false);
    }
  };

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
            <Descriptions.Item label="Vai trò">{user?.roles?.name}</Descriptions.Item>
            <Descriptions.Item label="Phân hệ truy cập">{user?.roles?.portal?.toUpperCase()}</Descriptions.Item>
            <Descriptions.Item label="Bộ phận công tác">{user?.departments?.name}</Descriptions.Item>
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
              <Tag color="blue" className="rounded-full border-none bg-white/20 text-white font-bold px-4">{user?.roles?.name?.toUpperCase()}</Tag>
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
