'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Input, Button, Space, Tag, Card, Typography, 
  Row, Col, Select, message, Tooltip, Progress, DatePicker
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  FileExcelOutlined, 
  FilePdfOutlined,
  ReloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CreateOrderModal from '@/components/orders/CreateOrderModal';
import OrderDetailModal from '@/components/orders/OrderDetailModal';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function OrdersPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<any>(null);
  
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('production_orders')
        .select(`
          *,
          customers (name, phone)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: orders, error } = await query;
      if (error) throw error;
      
      let filtered = orders || [];
      if (search) {
        filtered = filtered.filter(o => 
          o.code.toLowerCase().includes(search.toLowerCase()) ||
          o.title.toLowerCase().includes(search.toLowerCase()) ||
          o.customers?.name?.toLowerCase().includes(search.toLowerCase())
        );
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        filtered = filtered.filter(o => {
          const date = new Date(o.created_at);
          return date >= dateRange[0].toDate() && date <= dateRange[1].toDate();
        });
      }

      setData(filtered);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, dateRange]);

  const exportToExcel = () => {
    const exportData = data.map(o => ({
      "Mã đơn": o.code,
      "Khách hàng": o.customers?.name,
      "Nội dung": o.title,
      "Số lượng": o.specs?.quantity,
      "Trạng thái": o.status.toUpperCase(),
      "Ngày tạo": new Date(o.created_at).toLocaleDateString('vi-VN')
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    XLSX.writeFile(wb, `LSX_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const tableColumn = ["Ma don", "Khac hang", "Noi dung", "SL", "Trang thai", "Ngay"];
    const tableRows = data.map(o => [
      o.code,
      o.customers?.name || "",
      o.title,
      o.specs?.quantity,
      o.status,
      new Date(o.created_at).toLocaleDateString('vi-VN')
    ]);

    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.text("DANH SACH LENH SAN XUAT (PPMS)", 14, 15);
    doc.save(`LSX_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const columns = [
    {
      title: 'Mã Đơn',
      dataIndex: 'code',
      key: 'code',
      render: (text: string) => <Text strong className="text-blue-600">{text}</Text>,
    },
    {
      title: 'Khách hàng',
      dataIndex: ['customers', 'name'],
      key: 'customer',
      render: (name: string) => <Text>{name}</Text>,
    },
    {
      title: 'Nội dung in',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: 'Số lượng',
      key: 'quantity',
      render: (record: any) => `${record.specs?.quantity?.toLocaleString()} ${record.specs?.unit}`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = status === 'completed' ? 'green' : status === 'in_progress' ? 'blue' : 'orange';
        return <Tag color={color}>{status.toUpperCase()}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      fixed: 'right' as const,
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => { setSelectedOrder(record); setDetailModalVisible(true); }} 
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={3} className="m-0">Lệnh Sản Xuất</Title>
          <Text type="secondary">Quản lý và theo dõi tiến độ các đơn hàng sản xuất</Text>
        </div>
        <Space size="middle">
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>Xuất Excel</Button>
          <Button icon={<FilePdfOutlined />} onClick={exportToPDF}>Xuất PDF</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            Lên Lệnh Mới
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm border-none p-2">
        <Row gutter={16} align="middle" className="mb-4">
          <Col span={8}>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Tìm theo mã đơn, khách hàng, nội dung..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              onPressEnter={fetchOrders}
              allowClear
            />
          </Col>
          <Col span={5}>
            <Select 
              className="w-full" 
              value={statusFilter} 
              onChange={setStatusFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả trạng thái</Option>
              <Option value="pending">Chờ xử lý</Option>
              <Option value="in_progress">Đang sản xuất</Option>
              <Option value="completed">Đã hoàn thành</Option>
            </Select>
          </Col>
          <Col span={7}>
            <RangePicker 
              className="w-full" 
              onChange={setDateRange}
            />
          </Col>
          <Col span={4}>
            <Button icon={<ReloadOutlined />} onClick={fetchOrders} block>Làm mới</Button>
          </Col>
        </Row>

        <Table 
          columns={columns} 
          dataSource={data} 
          rowKey="id" 
          loading={loading}
          pagination={{ pageSize: 12 }}
          className="custom-table"
        />
      </Card>

      <CreateOrderModal visible={createModalVisible} onClose={() => { setCreateModalVisible(false); fetchOrders(); }} />
      <OrderDetailModal visible={detailModalVisible} order={selectedOrder} onClose={() => setDetailModalVisible(false)} />

      <style jsx global>{`
        .custom-table .ant-table-thead > tr > th {
          background-color: #f8fafc;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
