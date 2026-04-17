'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, Form, Input, Select, InputNumber, Checkbox, 
  Row, Col, Divider, Space, Button, message, Typography 
} from 'antd';
import { ShoppingCartOutlined, NodeIndexOutlined, DollarOutlined } from '@ant-design/icons';
import { supabase } from '@/lib/supabase';

const { Option } = Select;
const { Title, Text } = Typography;

interface CreateOrderModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function CreateOrderModal({ visible, onClose }: CreateOrderModalProps) {
  const [form] = Form.useForm();
  const [customers, setCustomers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchData();
    }
  }, [visible]);

  const fetchData = async () => {
    setLoadingCustomers(true);
    try {
      // 1. Fetch Customers
      const { data: custData, error: custError } = await supabase.from('customers').select('id, name, code');
      if (custError) throw custError;
      setCustomers(custData || []);

      // 2. Fetch Departments (Dynamic instead of hardcoded)
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('id', { ascending: true });
      if (deptError) throw deptError;
      setDepartments(deptData || []);

    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu khởi tạo');
    } finally {
      setLoadingCustomers(false);
    }
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      const orderCode = `LSX${Date.now().toString().slice(-6)}`;
      
      const orderData = {
        code: orderCode,
        customer_id: values.customer_id,
        title: values.title,
        specs: {
          quantity: values.quantity,
          unit: values.unit,
          size: values.size,
          sides: values.sides,
        },
        financials: {
          unit_price: values.unit_price,
          vat: values.vat,
          total: values.quantity * values.unit_price * (1 + (values.vat / 100)),
        },
        status: 'in_progress',
        workflow_steps: values.workflow_steps,
      };

      const { data: order, error: orderError } = await supabase
        .from('production_orders')
        .insert([orderData])
        .select()
        .single();

      if (orderError) throw orderError;

      const tasksToCreate = values.workflow_steps.map((deptId: number, index: number) => ({
        order_id: (order as any).id,
        department_id: deptId,
        sequence_order: index + 1,
        status: index === 0 ? 'ready' : 'pending',
      }));

      const { error: tasksError } = await supabase.from('tasks').insert(tasksToCreate);
      if (tasksError) throw tasksError;

      message.success(`Đã tạo lệnh sản xuất ${orderCode}`);
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tạo lệnh sản xuất');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={<><ShoppingCartOutlined /> Tạo Lệnh Sản Xuất Mới</>}
      open={visible}
      onCancel={onClose}
      onOk={() => form.submit()}
      confirmLoading={submitting}
      width={800}
      okText="Tạo Lệnh"
      cancelText="Hủy"
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ quantity: 1, unit_price: 0, vat: 8, unit: 'Bộ', workflow_steps: [] }}
      >
        <Divider orientation={"left" as any} plain>Thông tin chung</Divider>
        <Row gutter={16}>
          <Col span={16}>
            <Form.Item name="customer_id" label="Khách hàng" rules={[{ required: true }]}>
              <Select loading={loadingCustomers} showSearch placeholder="Chọn khách hàng">
                {customers.map((c: any) => (
                  <Option key={c.id} value={c.id}>{c.name} ({c.code})</Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="title" label="Nội dung in" rules={[{ required: true }]}>
              <Input placeholder="Ví dụ: In Card Visit" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={6}>
            <Form.Item name="quantity" label="Số lượng" rules={[{ required: true }]}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="unit" label="Đơn vị">
              <Input placeholder="Cuốn, Bộ..." />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="size" label="Khổ giấy">
              <Select placeholder="Chọn khổ">
                <Option value="A3">A3</Option>
                <Option value="A4">A4</Option>
                <Option value="A5">A5</Option>
                <Option value="Custom">Khác</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="sides" label="Mặt in">
              <Select>
                <Option value={1}>In 1 mặt</Option>
                <Option value={2}>In 2 mặt</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation={"left" as any} plain><NodeIndexOutlined /> Quy trình sản xuất</Divider>
        <Form.Item 
          name="workflow_steps" 
          label="Chọn các bộ phận tham gia (Dữ liệu thực tế)" 
          rules={[{ required: true, message: 'Vui lòng chọn ít nhất 1 bộ phận' }]}
        >
          <Checkbox.Group style={{ width: '100%' }}>
            <Row>
              {departments.map(dept => (
                <Col span={8} key={dept.id} className="mb-2">
                  <Checkbox value={dept.id}>{dept.name}</Checkbox>
                </Col>
              ))}
            </Row>
          </Checkbox.Group>
        </Form.Item>

        <Divider orientation={"left" as any} plain><DollarOutlined /> Tài chính</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name="unit_price" label="Đơn giá (VNĐ)">
              <InputNumber min={0} style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name="vat" label="VAT (%)">
              <InputNumber min={0} max={100} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <div className="bg-blue-50 p-4 rounded-lg flex flex-col items-end">
              <Text type="secondary">Tạm tính:</Text>
              <Form.Item shouldUpdate noStyle>
                {({ getFieldsValue }) => {
                  const { quantity, unit_price, vat } = getFieldsValue();
                  const total = (quantity || 0) * (unit_price || 0) * (1 + ((vat || 0) / 100));
                  return <Title level={4} className="m-0 text-blue-600">{total.toLocaleString()} VNĐ</Title>;
                }}
              </Form.Item>
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
