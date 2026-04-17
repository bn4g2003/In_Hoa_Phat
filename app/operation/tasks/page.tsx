'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Input, Button, Space, Card, Typography, 
  Row, Col, Select, message, Tag, Tooltip, Empty 
} from 'antd';
import { 
  SearchOutlined, 
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  FilterOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import TaskActionModal from '@/components/operation/TaskActionModal';

const { Title, Text } = Typography;
const { Option } = Select;

export default function TasksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [user, setUser] = useState<any>(null);
  
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('ppms_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          production_orders (code, title, specs),
          departments (name, code)
        `)
        .order('updated_at', { ascending: false });

      if (user.department_id === 7) {
        // Kho 2 see their tasks OR tasks on hold due to materials anywhere
        query = query.or(`department_id.eq.${user.department_id},material_shortage.eq.true`);
      } else {
        query = query.eq('department_id', user.department_id).neq('status', 'pending');
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: tasks, error } = await query;
      if (error) throw error;
      
      let filtered = tasks || [];
      if (search) {
        filtered = filtered.filter(t => 
          t.production_orders?.code?.toLowerCase().includes(search.toLowerCase()) ||
          t.production_orders?.title?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setData(filtered);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải danh sách nhiệm vụ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user, statusFilter]);

  const exportToExcel = () => {
    const exportData = data.map(t => ({
      "Lệnh sản xuất": t.production_orders?.code,
      "Nội dung": t.production_orders?.title,
      "Bộ phận": t.departments?.name,
      "Trạng thái": t.status.toUpperCase(),
      "Bắt đầu": t.start_time ? new Date(t.start_time).toLocaleString() : '',
      "Kết thúc": t.end_time ? new Date(t.end_time).toLocaleString() : ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tasks");
    XLSX.writeFile(wb, `Tasks_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const tableColumn = ["Lenh", "Noi dung", "Bo phan", "Trang thai"];
    const tableRows = data.map(t => [
      t.production_orders?.code,
      t.production_orders?.title,
      t.departments?.name,
      t.status
    ]);
    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.text("DANH SACH NHIEM VU SAN XUAT", 14, 15);
    doc.save(`Tasks_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const columns = [
    {
      title: 'Lệnh Sản Xuất',
      key: 'order',
      render: (_: any, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.production_orders?.code}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.production_orders?.title}</Text>
        </Space>
      ),
    },
    {
      title: 'Bộ phận',
      dataIndex: ['departments', 'name'],
      key: 'dept',
      render: (name: string, record: any) => (
        <Space>
          <Tag color={record.department_id === user.department_id ? 'blue' : 'orange'}>
            {name}
          </Tag>
          {record.material_shortage && <Tag color="red">Thiếu vật tư</Tag>}
        </Space>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = 'default';
        let icon = <ClockCircleOutlined />;
        if (status === 'ready') { color = 'processing'; icon = <ThunderboltOutlined />; }
        if (status === 'in_progress') { color = 'blue'; icon = <ReloadOutlined spin />; }
        if (status === 'done') { color = 'success'; icon = <CheckCircleOutlined />; }
        if (status === 'issue') { color = 'error'; icon = <WarningOutlined />; }
        if (status === 'on_hold') { color = 'warning'; icon = <ClockCircleOutlined />; }
        return <Tag color={color} icon={icon}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Cập nhật cuối',
      dataIndex: 'updated_at',
      key: 'updated_at',
      render: (date: string) => new Date(date).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }),
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: any) => (
        <Button 
          type="primary" 
          icon={<EyeOutlined />} 
          size="small"
          onClick={() => { setSelectedTask(record); setActionModalVisible(true); }}
        >
          {record.department_id === user.department_id ? 'Xử lý' : 'Giải quyết vật tư'}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={3} className="m-0">Nhiệm vụ sản xuất: {user?.departments?.name}</Title>
          <Text type="secondary">
            <EnvironmentOutlined /> {user?.department_id === 7 ? 'Giám sát vật tư & Nhiệm vụ kho' : 'Đang hiển thị công việc thuộc bộ phận của bạn'}
          </Text>
        </div>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>Excel</Button>
          <Button icon={<FilePdfOutlined />} onClick={exportToPDF}>PDF</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchTasks} loading={loading}>Làm mới</Button>
        </Space>
      </div>

      <Card className="shadow-sm border-none p-2">
        <Row gutter={16} align="middle" className="mb-4">
          <Col span={12}>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Tìm theo mã lệnh, nội dung in..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              onPressEnter={fetchTasks}
              allowClear
            />
          </Col>
          <Col span={8}>
            <Select 
              className="w-full" 
              value={statusFilter} 
              onChange={setStatusFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả trạng thái</Option>
              <Option value="ready">Chờ nhận việc</Option>
              <Option value="in_progress">Đang làm</Option>
              <Option value="done">Hoàn thành</Option>
              <Option value="issue">Có sự cố</Option>
              <Option value="on_hold">Tạm hoãn</Option>
            </Select>
          </Col>
        </Row>

        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 12 }}
          className="custom-table"
          locale={{ emptyText: <Empty description="Không có nhiệm vụ nào cần xử lý" /> }}
        />
      </Card>

      <TaskActionModal 
        visible={actionModalVisible} 
        task={selectedTask} 
        onClose={() => setActionModalVisible(false)} 
        onRefresh={fetchTasks} 
      />

      <style jsx global>{`
        .custom-table .ant-table-thead > tr > th {
          background-color: #f8fafc;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
