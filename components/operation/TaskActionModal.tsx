'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, Button, Space, Typography, Tag, Divider, 
  Input, Form, message, Row, Col, Tabs, Alert, Select, Checkbox, 
  InputNumber, Statistic, Descriptions, Tooltip, Card, Popconfirm, Segmented
} from 'antd';
import { 
  CheckCircleOutlined, 
  ClockCircleOutlined, 
  DatabaseOutlined, 
  ExclamationCircleOutlined, 
  PlayCircleOutlined, 
  SaveOutlined, 
  StopOutlined, 
  SyncOutlined, 
  ThunderboltOutlined, 
  ToolOutlined, 
  WarningOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

interface TaskActionModalProps {
  visible: boolean;
  task: any;
  onClose: () => void;
  onRefresh: () => void;
}

const MACHINES = [
  { id: 'KM-01', name: 'Konica 6120', type: 'Digital' },
  { id: 'KM-02', name: 'Konica 1085', type: 'Digital' },
  { id: 'OS-01', name: 'Offset 4 Màu', type: 'Offset' },
  { id: 'LP-01', name: 'Máy bế', type: 'Processing' },
  { id: 'GL-01', name: 'Máy dán keo', type: 'Processing' },
];

export default function TaskActionModal({ visible, task, onClose, onRefresh }: TaskActionModalProps) {
  const [form] = Form.useForm();
  const [materialForm] = Form.useForm();
  const [wasteForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [issueMode, setIssueMode] = useState(false);
  const [wasteMode, setWasteMode] = useState(false);
  const [isShortage, setIsShortage] = useState(false);

  useEffect(() => {
    if (task) {
      const requested = task.material_requested_qty || 1000;
      const received = task.material_received_qty || 1000;
      setIsShortage(received < requested);
      form.setFieldsValue({
        ...task.machine_info,
        ...task.processing_info
      });
    }
  }, [task]);

  const handleStatusChange = async (newStatus: string, additionalData: any = {}) => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updates: any = { 
        status: newStatus,
        updated_at: now
      };

      // KPI Logic: Tracking hold time and processing time
      if (newStatus === 'in_progress') {
        if (task.status === 'ready') {
          updates.start_time = now;
          updates.kpi_start_time = now;
        } else if (task.status === 'on_hold' && task.hold_start_time) {
          // Resuming from hold
          const holdSecs = dayjs(now).diff(dayjs(task.hold_start_time), 'second');
          updates.total_hold_seconds = (task.total_hold_seconds || 0) + holdSecs;
          updates.hold_start_time = null; // Reset hold start
        }
      } else if (newStatus === 'on_hold') {
        updates.hold_start_time = now;
      } else if (newStatus === 'done') {
        updates.end_time = now;
      }

      const { error } = await supabase
        .from('tasks')
        .update({ ...updates, ...additionalData })
        .eq('id', task.id);

      if (error) throw error;

      if (newStatus === 'done') {
        const { data: nextTask } = await supabase
          .from('tasks')
          .select('*')
          .eq('order_id', task.order_id)
          .eq('sequence_order', task.sequence_order + 1)
          .single();

        if (nextTask) {
          await supabase.from('tasks').update({ 
            status: 'ready', ready_at: now, updated_at: now 
          }).eq('id', nextTask.id);
        } else {
          await supabase.from('production_orders').update({ status: 'completed', updated_at: now }).eq('id', task.order_id);
        }
      }

      message.success(`Đã cập nhật: ${newStatus.toUpperCase()}`);
      onRefresh();
      onClose();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMaterialVerify = async (values: any, shouldHold: boolean = false) => {
    setSubmitting(true);
    try {
      const shortageDetected = values.material_received_qty < values.material_requested_qty;
      const updates: any = {
        material_requested_qty: values.material_requested_qty,
        material_received_qty: values.material_received_qty,
        material_shortage: shortageDetected,
        updated_at: new Date().toISOString()
      };

      if (shouldHold) {
        updates.status = 'on_hold';
        updates.hold_start_time = new Date().toISOString();
        updates.issue_log = `Thiếu ${values.material_requested_qty - values.material_received_qty} vật tư.`;
      }

      const { error } = await supabase.from('tasks').update(updates).eq('id', task.id);
      if (error) throw error;

      message.success(shouldHold ? 'Đã xác nhận HOÃN do thiếu vật tư' : 'Đã cập nhật số lượng vật tư');
      onRefresh();
      onClose();
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWasteReport = async (values: any) => {
    setSubmitting(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      await supabase.from('inventory_logs').insert([{
        task_id: task.id,
        order_id: task.order_id,
        quantity: values.quantity,
        type: 'waste',
        reason: `Bù hao tại ${task.departments?.name}: ${values.reason}`,
        is_waste_correction: true,
        created_at: new Date().toISOString()
      }]);

      message.success('Đã ghi nhận bù hao');
      setWasteMode(false);
      wasteForm.resetFields();
    } catch (err) {
      message.error('Lỗi khi ghi nhận bù hao');
    } finally {
      setSubmitting(false);
    }
  };

  const tabItems = [
    {
      key: '1',
      label: <span><ThunderboltOutlined /> Thao tác KPI</span>,
      children: (
        <div className="p-4 space-y-6">
          <Row gutter={16}>
            <Col span={16}>
              <Alert 
                message={`Trạng thái: ${task?.status?.toUpperCase()}`} 
                description={task?.status === 'on_hold' ? `Đang hoãn do: ${task.issue_log}` : "Thực hiện đúng quy trình để đảm bảo KPI."}
                type={task?.status === 'ready' ? 'info' : task?.status === 'in_progress' ? 'success' : 'warning'} 
                showIcon 
              />
            </Col>
            <Col span={8}>
              <Card size="small" className="text-center shadow-inner bg-gray-50 border-none">
                <Statistic 
                  title="Thời gian hoãn" 
                  value={Math.round((task?.total_hold_seconds || 0) / 60)} 
                  suffix="phút" 
                  valueStyle={{ fontSize: 18, fontWeight: 'bold' }} 
                />
              </Card>
            </Col>
          </Row>
          
          <div className="flex flex-wrap gap-4 justify-center py-6">
            {(task?.status === 'ready' || task?.status === 'on_hold') && (
              <Button 
                type="primary" size="large" icon={<PlayCircleOutlined />} 
                onClick={() => handleStatusChange('in_progress')}
                loading={submitting}
                className="h-16 px-12 text-lg rounded-2xl shadow-lg border-none bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                {task?.status === 'ready' ? 'BẮT ĐẦU (KPI)' : 'TIẾP TỤC (KPI)'}
              </Button>
            )}
            
            {task?.status === 'in_progress' && (
              <Button 
                type="primary" size="large" icon={<CheckCircleOutlined />} 
                onClick={() => handleStatusChange('done')}
                loading={submitting}
                className="h-16 px-12 text-lg rounded-2xl bg-green-600 border-none shadow-lg"
              >
                HOÀN THÀNH
              </Button>
            )}

            <Button 
              danger size="large" icon={<WarningOutlined />} 
              onClick={() => setIssueMode(!issueMode)}
              className="h-16 px-10 text-lg rounded-2xl shadow-md"
            >
              BÁO SỰ CỐ
            </Button>
          </div>

          {issueMode && (
            <Form layout="vertical" onFinish={(v) => handleStatusChange('issue', { issue_log: v.issue_log })} className="bg-red-50 p-4 rounded-xl border border-red-100">
              <Form.Item name="issue_log" label="Chi tiết sự cố" rules={[{ required: true }]}>
                <Input.TextArea rows={3} placeholder="Mô tả sự cố để loại trừ KPI nếu do máy móc..." />
              </Form.Item>
              <Button type="primary" danger htmlType="submit" loading={submitting}>Xác nhận & Hoãn KPI</Button>
            </Form>
          )}
        </div>
      )
    },
    {
      key: '2',
      label: <span><ToolOutlined /> Máy & Kỹ thuật</span>,
      children: (
        <div className="p-4 space-y-6">
          <Form 
            form={form} 
            layout="vertical" 
            onFinish={(v) => handleStatusChange(task.status, { machine_info: v })}
          >
            <Title level={5}>Cấu hình Máy</Title>
            <Row gutter={16}>
              <Col span={10}>
                <Form.Item name="machine_id" label="Mã máy">
                  <Select placeholder="Chọn máy">
                    {MACHINES.map(m => <Option key={m.id} value={m.id}>{m.name} ({m.type})</Option>)}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={7}>
                <Form.Item name="mode" label="Chế độ in">
                  <Select>
                    <Option value="High Quality">High Quality</Option>
                    <Option value="Eco">Standard/Eco</Option>
                    <Option value="Direct">Direct Print</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={7}>
                <Form.Item name="temp_setting" label="Nhiệt độ (nếu có)">
                  <InputNumber className="w-full" suffix="°C" />
                </Form.Item>
              </Col>
            </Row>
            
            <Divider dashed />
            
            <Title level={5}>Yêu cầu Gia công phối hợp</Title>
            <Form.Item name="processing" className="mb-0">
              <Checkbox.Group className="w-full">
                <Row gutter={[16, 16]}>
                  <Col span={6}><Checkbox value="lamination">Cán màng</Checkbox></Col>
                  <Col span={6}><Checkbox value="folding">Gấp</Checkbox></Col>
                  <Col span={6}><Checkbox value="creasing">Cấn</Checkbox></Col>
                  <Col span={6}><Checkbox value="uv">Phủ UV</Checkbox></Col>
                  <Col span={6}><Checkbox value="cutting">Cắt bàn</Checkbox></Col>
                  <Col span={6}><Checkbox value="staple">Đóng ghim</Checkbox></Col>
                  <Col span={6}><Checkbox value="glue">Vào keo</Checkbox></Col>
                  <Col span={6}><Checkbox value="diecut">Bế</Checkbox></Col>
                </Row>
              </Checkbox.Group>
            </Form.Item>
            
            <div className="mt-8 flex justify-end">
              <Button type="primary" icon={<SaveOutlined />} htmlType="submit" loading={submitting}>Lưu thông số kỹ thuật</Button>
            </div>
          </Form>

          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <Text strong><StopOutlined /> Báo cáo Bù hao Sai hỏng</Text>
              {!wasteMode && <Button size="small" type="dashed" onClick={() => setWasteMode(true)}>+ Ghi nhận bù hao</Button>}
            </div>
            
            {wasteMode && (
              <Form form={wasteForm} layout="vertical" onFinish={handleWasteReport}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Form.Item name="quantity" label="Số lượng tờ hỏng" rules={[{ required: true }]}>
                      <InputNumber min={1} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col span={16}>
                    <Form.Item name="reason" label="Nguyên nhân" rules={[{ required: true }]}>
                      <Select placeholder="Chọn nguyên nhân">
                        <Option value="Kẹt giấy">Kẹt giấy</Option>
                        <Option value="Sai màu">Sai màu / Lem mực</Option>
                        <Option value="In nhầm mặt">In nhầm mặt / Sai khổ</Option>
                        <Option value="Hỏng file">Lỗi file thiết kế</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <div className="flex justify-end gap-2">
                  <Button size="small" onClick={() => setWasteMode(false)}>Hủy</Button>
                  <Button type="primary" danger size="small" htmlType="submit" loading={submitting}>Xác nhận & Trừ kho</Button>
                </div>
              </Form>
            )}
          </div>
        </div>
      )
    },
    {
      key: '3',
      label: <span><DatabaseOutlined /> Vật tư & Cấp phát</span>,
      children: (
        <div className="p-4">
          <Card className="bg-blue-50 border-blue-100 shadow-sm rounded-2xl overflow-hidden mb-6">
            <Descriptions title="Yêu cầu Cấp phát Vật tư" bordered size="small" column={1}>
              <Descriptions.Item label="Loại vật tư">{task?.production_orders?.specs?.paper_type || 'Giấy in chuẩn'}</Descriptions.Item>
              <Descriptions.Item label="Định mức hệ thống">{task?.material_requested_qty || 1000} Tờ/Cuộn</Descriptions.Item>
            </Descriptions>
            
            <Form 
              form={materialForm} 
              layout="vertical" 
              className="mt-6"
              onFinish={(v) => handleMaterialVerify(v, false)}
              initialValues={{ 
                material_requested_qty: task?.material_requested_qty || 1000,
                material_received_qty: task?.material_received_qty || 1000
              }}
              onValuesChange={(_, all) => setIsShortage(all.material_received_qty < all.material_requested_qty)}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="material_received_qty" label="Số lượng thợ nhận thực tế" rules={[{ required: true }]}>
                    <InputNumber min={0} className="w-full" size="large" />
                  </Form.Item>
                </Col>
              </Row>

              {isShortage && (
                <Alert 
                  className="mb-4"
                  message="CẢNH BÁO THIẾU HỤT"
                  description="Nếu không thể tiếp tục sản xuất với số lượng hiện có, vui lòng chọn HOÃN HỢP LỆ để chuyển KPI sang Kho 2."
                  type="warning"
                  showIcon
                  action={
                    <Button size="small" danger onClick={() => handleMaterialVerify(materialForm.getFieldsValue(), true)}>HOÃN & CHỜ KHO</Button>
                  }
                />
              )}

              <Button type="primary" block size="large" htmlType="submit" loading={submitting}>CẬP NHẬT TRẠNG THÁI VẬT TƯ</Button>
            </Form>
          </Card>
        </div>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space size="large">
          <div className="bg-blue-600 p-2 rounded-xl"><ThunderboltOutlined className="text-white" /></div>
          <div>
            <div className="font-bold text-lg leading-tight">{task?.departments?.name}</div>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              #{task?.production_orders?.code} • {task?.production_orders?.title}
            </Text>
          </div>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      className="task-modal-v2"
    >
      <Tabs defaultActiveKey="1" items={tabItems} className="mt-4" destroyInactiveTabPane />
    </Modal>
  );
}
