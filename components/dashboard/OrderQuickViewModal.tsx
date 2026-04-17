'use client';

import React, { useState, useEffect } from 'react';
import { 
  Modal, Tabs, Typography, Row, Col, Space, Tag, 
  Steps, Divider, Table, Statistic, Button, message, 
  Empty, Card, Progress, Timeline, Badge
} from 'antd';
import { 
  PrinterOutlined, 
  NodeIndexOutlined, 
  DollarOutlined, 
  HistoryOutlined, 
  CheckCircleOutlined,
  PlayCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

interface OrderQuickViewModalProps {
  visible: boolean;
  order: any;
  departments: any[];
  onClose: () => void;
}

export default function OrderQuickViewModal({ visible, order, departments, onClose }: OrderQuickViewModalProps) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && order) {
      fetchTaskDetails();
    }
  }, [visible, order]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          departments (name, code)
        `)
        .eq('order_id', order.id)
        .order('sequence_order', { ascending: true });
      
      if (error) throw error;
      setTasks(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = () => {
    if (!tasks.length) return 0;
    const doneTasks = tasks.filter(t => t.status === 'done').length;
    return Math.round((doneTasks / tasks.length) * 100);
  };

  const getCurrentStep = () => {
    return tasks.findIndex(t => t.status !== 'done');
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      done: 'green',
      in_progress: 'blue',
      ready: 'cyan',
      issue: 'red',
      on_hold: 'orange',
      pending: 'default'
    };
    return colors[status] || 'default';
  };

  const tabItems = [
    {
      key: '1',
      label: <span><InfoCircleOutlined /> Tổng quan</span>,
      children: (
        <div className="p-4">
          <Row gutter={[24, 16]}>
            <Col span={12}>
              <Card size="small" title="Thông tin đơn hàng" className="h-full">
                <Space direction="vertical" className="w-full">
                  <div className="flex justify-between">
                    <Text type="secondary">Mã LSX:</Text>
                    <Text strong className="text-blue-600">{order?.code}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Nội dung:</Text>
                    <Text strong>{order?.title}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Khách hàng:</Text>
                    <Text>{order?.customers?.name || '---'}</Text>
                  </div>
                  <div className="flex justify-between">
                    <Text type="secondary">Số lượng:</Text>
                    <Text>{order?.specs?.quantity?.toLocaleString()} {order?.specs?.unit}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            <Col span={12}>
              <Card size="small" title="Tiến độ tổng thể" className="h-full">
                <div className="text-center">
                  <Progress 
                    type="circle" 
                    percent={calculateProgress()} 
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    size={120}
                  />
                  <div className="mt-4">
                    <Text type="secondary">
                      {tasks.filter(t => t.status === 'done').length} / {tasks.length} bước hoàn thành
                    </Text>
                  </div>
                </div>
              </Card>
            </Col>
            <Col span={24}>
              <Card size="small" title="Trạng thái các bộ phận">
                <div className="flex flex-wrap gap-2">
                  {tasks.map((task, idx) => (
                    <Tag 
                      key={task.id}
                      color={getStatusColor(task.status)}
                      icon={
                        task.status === 'done' ? <CheckCircleOutlined /> :
                        task.status === 'in_progress' ? <SyncOutlined spin /> :
                        task.status === 'issue' ? <WarningOutlined /> :
                        <ClockCircleOutlined />
                      }
                    >
                      {task.departments?.name}: {task.status.toUpperCase()}
                    </Tag>
                  ))}
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: '2',
      label: <span><NodeIndexOutlined /> Chi tiết quy trình</span>,
      children: (
        <div className="p-4">
          <Steps
            direction="vertical"
            current={getCurrentStep()}
            items={tasks.map((task, idx) => ({
              title: (
                <Space>
                  <Text strong>{task.departments?.name}</Text>
                  <Tag color={getStatusColor(task.status)}>
                    {task.status.toUpperCase()}
                  </Tag>
                </Space>
              ),
              description: (
                <div className="mt-2">
                  {task.start_time && (
                    <Text type="secondary" className="block text-xs">
                      <PlayCircleOutlined className="mr-1" />
                      Bắt đầu: {dayjs(task.start_time).format('DD/MM HH:mm')}
                    </Text>
                  )}
                  {task.end_time && (
                    <Text type="secondary" className="block text-xs">
                      <CheckCircleOutlined className="mr-1" />
                      Hoàn thành: {dayjs(task.end_time).format('DD/MM HH:mm')}
                    </Text>
                  )}
                  {task.issue_log && (
                    <Text type="danger" className="block text-xs mt-1">
                      <WarningOutlined className="mr-1" />
                      {task.issue_log}
                    </Text>
                  )}
                  {task.material_shortage && (
                    <Tag color="orange" className="mt-1">Thiếu vật tư</Tag>
                  )}
                </div>
              ),
              status: task.status === 'done' ? 'finish' : 
                      task.status === 'in_progress' ? 'process' :
                      task.status === 'issue' || task.status === 'on_hold' ? 'error' : 'wait',
              icon: task.status === 'done' ? <CheckCircleOutlined /> : 
                    task.status === 'in_progress' ? <SyncOutlined spin /> : 
                    task.status === 'issue' ? <WarningOutlined /> : 
                    task.status === 'on_hold' ? <ClockCircleOutlined /> : null
            }))}
          />
        </div>
      )
    },
    {
      key: '3',
      label: <span><HistoryOutlined /> Timeline</span>,
      children: (
        <div className="p-4">
          <Timeline
            items={tasks
              .filter(t => t.start_time || t.end_time)
              .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
              .slice(0, 10)
              .map(task => ({
                color: task.status === 'done' ? 'green' : 
                       task.status === 'issue' ? 'red' : 'blue',
                children: (
                  <div>
                    <Text strong>{task.departments?.name}</Text>
                    <br />
                    <Text type="secondary" className="text-xs">
                      {dayjs(task.updated_at).format('DD/MM/YYYY HH:mm')}
                    </Text>
                    <br />
                    <Tag color={getStatusColor(task.status)} className="mt-1">
                      {task.status.toUpperCase()}
                    </Tag>
                  </div>
                )
              }))}
          />
        </div>
      )
    }
  ];

  return (
    <Modal
      title={
        <Space>
          <PrinterOutlined className="text-blue-600" />
          <span>LSX: {order?.code}</span>
          <Tag color={order?.status === 'completed' ? 'green' : 'blue'}>
            {order?.status?.toUpperCase()}
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>Đóng</Button>
      ]}
      width={800}
      centered
    >
      <Tabs defaultActiveKey="1" items={tabItems} destroyOnHidden />
    </Modal>
  );
}
