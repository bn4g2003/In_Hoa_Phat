'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, Tabs, Form, Input, Select, Button, Table, 
  Typography, Space, Row, Col, Tag, message, 
  Divider, Card, Empty, Popconfirm, Switch, Descriptions, Avatar, Statistic
} from 'antd';
import { 
  SaveOutlined, 
  DeleteOutlined,
  InfoCircleOutlined,
  TeamOutlined,
  ToolOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DepartmentDetailModalProps {
  visible: boolean;
  department: any;
  onClose: () => void;
  onRefresh?: () => void;
}

export default function DepartmentDetailModal({ visible, department, onClose, onRefresh }: DepartmentDetailModalProps) {
  const [form] = Form.useForm();
  const [staff, setStaff] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadingMachines, setLoadingMachines] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible && department) {
      form.setFieldsValue({
        name: department.name,
        code: department.code,
        description: department.description,
        is_entry_point: department.is_entry_point || false,
        permissions: department.permissions || [],
      });
      fetchStaff();
      fetchMachines();
    } else if (visible) {
      form.resetFields();
      setStaff([]);
      setMachines([]);
    }
  }, [visible, department, form]);

  const fetchStaff = async () => {
    if (!department) return;
    setLoadingStaff(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`*, roles (name)`)
        .eq('department_id', department.id)
        .order('full_name');
      
      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchMachines = async () => {
    if (!department) return;
    setLoadingMachines(true);
    try {
      const { data, error } = await supabase
        .from('machines')
        .select('*')
        .eq('department_id', department.id)
        .order('name');
      
      if (error) throw error;
      setMachines(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMachines(false);
    }
  };

  const onFinish = async (values: any) => {
    setSaving(true);
    try {
      if (department) {
        const { error } = await supabase
          .from('departments')
          .update(values)
          .eq('id', department.id);
        if (error) throw error;
        message.success('Đã cập nhật bộ phận');
      } else {
        const { error } = await supabase
          .from('departments')
          .insert([values]);
        if (error) throw error;
        message.success('Đã thêm bộ phận mới');
      }
      onRefresh?.();
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi lưu thông tin');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('departments')
        .delete()
        .eq('id', department.id);
      if (error) throw error;
      message.success('Đã xóa bộ phận');
      onRefresh?.();
      onClose();
    } catch (err) {
      message.error('Lỗi khi xóa bộ phận. Có thể bộ phận này đang có nhân viên.');
    } finally {
      setDeleting(false);
    }
  };

  const staffColumns = [
    { 
      title: 'Nhân viên', 
      key: 'name',
      render: (_: any, r: any) => (
        <Space>
          <Avatar size="small">{r.full_name?.[0]}</Avatar>
          <Text strong>{r.full_name}</Text>
        </Space>
      )
    },
    { 
      title: 'Chức vụ', 
      dataIndex: ['roles', 'name'], 
      key: 'role',
      render: (t: string) => <Tag color="purple">{t}</Tag>
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'is_active', 
      key: 'status',
      render: (v: boolean) => <Tag color={v ? 'green' : 'red'}>{v ? 'Hoạt động' : 'Nghỉ'}</Tag>
    },
  ];

  const machineColumns = [
    { 
      title: 'Mã máy', 
      dataIndex: 'code', 
      key: 'code',
      render: (t: string) => <Text strong className="text-blue-600">{t}</Text>
    },
    { 
      title: 'Tên máy', 
      dataIndex: 'name', 
      key: 'name'
    },
    { 
      title: 'Loại', 
      dataIndex: 'type', 
      key: 'type',
      render: (t: string) => <Tag color="cyan">{t}</Tag>
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'status', 
      key: 'status',
      render: (s: string) => <Tag color={s === 'active' ? 'green' : 'red'}>{s === 'active' ? 'Hoạt động' : 'Bảo trì'}</Tag>
    },
  ];

  const permissionOptions = [
    { label: 'Xem đơn hàng', value: 'view_orders' },
    { label: 'Tạo đơn hàng', value: 'create_orders' },
    { label: 'Xuất kho', value: 'export_inventory' },
    { label: 'Nhập kho', value: 'import_inventory' },
    { label: 'Quản lý nhân sự', value: 'manage_staff' },
    { label: 'Báo cáo', value: 'view_reports' },
  ];

  const tabItems = [
    {
      key: '1',
      label: <span><InfoCircleOutlined /> Thông tin chung</span>,
      children: (
        <div className="p-4">
          <Form form={form} layout="vertical" onFinish={onFinish}>
            <Row gutter={24}>
              <Col span={8}>
                <Form.Item name="code" label="Mã bộ phận" rules={[{ required: true }]}>
                  <Input placeholder="VD: PRINT" disabled={!!department} />
                </Form.Item>
              </Col>
              <Col span={16}>
                <Form.Item name="name" label="Tên bộ phận" rules={[{ required: true }]}>
                  <Input placeholder="VD: Bộ phận In" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="description" label="Mô tả">
                  <TextArea rows={2} placeholder="Mô tả chức năng của bộ phận" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="is_entry_point" label="Là điểm bắt đầu quy trình" valuePropName="checked">
                  <Switch checkedChildren="Có" unCheckedChildren="Không" />
                </Form.Item>
              </Col>
              <Col span={24}>
                <Form.Item name="permissions" label="Quyền hạn">
                  <Select mode="multiple" placeholder="Chọn quyền cho bộ phận">
                    {permissionOptions.map(p => <Option key={p.value} value={p.value}>{p.label}</Option>)}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Divider />
            <div className="flex justify-between mt-4">
              {department ? (
                <Popconfirm
                  title="Xóa bộ phận này?"
                  description="Hành động này không thể hoàn tác."
                  onConfirm={handleDelete}
                  okText="Xóa"
                  cancelText="Hủy"
                  okButtonProps={{ danger: true, loading: deleting }}
                >
                  <Button danger icon={<DeleteOutlined />}>Xóa Bộ phận</Button>
                </Popconfirm>
              ) : <div />}
              <Space>
                <Button onClick={onClose}>Hủy</Button>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
                  {department ? 'Lưu thay đổi' : 'Tạo mới'}
                </Button>
              </Space>
            </div>
          </Form>
        </div>
      ),
    },
    {
      key: '2',
      label: <span><TeamOutlined /> Nhân sự ({staff.length})</span>,
      disabled: !department,
      children: (
        <div className="p-4">
          <Row gutter={16} className="mb-4">
            <Col span={8}>
              <Card size="small" className="bg-blue-50 border-blue-100 text-center">
                <Statistic title="Tổng nhân viên" value={staff.length} valueStyle={{ fontWeight: 'bold' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" className="bg-green-50 border-green-100 text-center">
                <Statistic title="Đang hoạt động" value={staff.filter(s => s.is_active !== false).length} valueStyle={{ color: '#52c41a', fontWeight: 'bold' }} />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small" className="bg-orange-50 border-orange-100 text-center">
                <Statistic title="Nghỉ/Chuyển" value={staff.filter(s => s.is_active === false).length} valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }} />
              </Card>
            </Col>
          </Row>
          <Table 
            columns={staffColumns} 
            dataSource={staff} 
            rowKey="id" 
            loading={loadingStaff}
            pagination={{ pageSize: 5 }}
            size="small"
            locale={{ emptyText: <Empty description="Chưa có nhân viên nào" /> }}
          />
        </div>
      ),
    },
    {
      key: '3',
      label: <span><ToolOutlined /> Máy móc ({machines.length})</span>,
      disabled: !department,
      children: (
        <div className="p-4">
          <Row gutter={16} className="mb-4">
            <Col span={12}>
              <Card size="small" className="bg-green-50 border-green-100 text-center">
                <Statistic title="Máy hoạt động" value={machines.filter(m => m.status === 'active').length} valueStyle={{ color: '#52c41a', fontWeight: 'bold' }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" className="bg-red-50 border-red-100 text-center">
                <Statistic title="Đang bảo trì" value={machines.filter(m => m.status !== 'active').length} valueStyle={{ color: '#f5222d', fontWeight: 'bold' }} />
              </Card>
            </Col>
          </Row>
          <Table 
            columns={machineColumns} 
            dataSource={machines} 
            rowKey="id" 
            loading={loadingMachines}
            pagination={{ pageSize: 5 }}
            size="small"
            locale={{ emptyText: <Empty description="Chưa có máy móc nào" /> }}
          />
        </div>
      ),
    },
  ];

  return (
    <Modal
      title={department ? `Bộ phận: ${department.name}` : 'Thêm Bộ phận mới'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={900}
    >
      <Tabs defaultActiveKey="1" items={tabItems} destroyInactiveTabPane />
    </Modal>
  );
}
