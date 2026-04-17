'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Input, Button, Space, Card, Typography, 
  Row, Col, Select, message, Tag, Tooltip 
} from 'antd';
import { 
  SearchOutlined, 
  PlusOutlined, 
  ReloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  UserOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import CustomerDetailModal from '@/components/crm/CustomerDetailModal';

const { Title, Text } = Typography;
const { Option } = Select;

export default function CrmPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data: customers, error } = await query;
      if (error) throw error;
      
      let filtered = customers || [];
      if (search) {
        filtered = filtered.filter(c => 
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search)
        );
      }

      setData(filtered);
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [categoryFilter]);

  const exportToExcel = () => {
    const exportData = data.map(c => ({
      "Mã KH": c.code,
      "Tên": c.name,
      "SĐT": c.phone,
      "Phân loại": c.category,
      "Công nợ": c.current_debt,
      "Tổng doanh thu": c.total_revenue
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Customers");
    XLSX.writeFile(wb, `CRM_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const tableColumn = ["Ma KH", "Ten", "SDT", "Phan loai", "No"];
    const tableRows = data.map(c => [
      c.code,
      c.name,
      c.phone || "",
      c.category || "",
      c.current_debt?.toLocaleString() + " d"
    ]);

    doc.autoTable(tableColumn, tableRows, { startY: 20 });
    doc.text("DANH SACH KHACH HANG (PPMS)", 14, 15);
    doc.save(`CRM_Export_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const columns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: any) => (
        <Space>
          <UserOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{record.name}</div>
            <div className="text-xs text-gray-400">{record.code}</div>
          </div>
        </Space>
      ),
    },
    {
      title: 'Số điện thoại',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'Phân loại',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag color="blue">{cat}</Tag>,
    },
    {
      title: 'Công nợ hiện tại',
      dataIndex: 'current_debt',
      key: 'debt',
      align: 'right' as const,
      render: (debt: number) => (
        <Text type={debt > 0 ? 'danger' : 'success'} strong>
          {debt?.toLocaleString()} đ
        </Text>
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button type="text" icon={<EyeOutlined />} onClick={() => { setSelectedCustomer(record); setModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={3} className="m-0">Quản lý Khách hàng (CRM)</Title>
          <Text type="secondary">Quản lý thông tin, đơn hàng và công nợ khách hàng</Text>
        </div>
        <Space size="middle">
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>Xuất Excel</Button>
          <Button icon={<FilePdfOutlined />} onClick={exportToPDF}>Xuất PDF</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedCustomer(null); setModalVisible(true); }}>
            Thêm Khách hàng
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm border-none p-2">
        <Row gutter={16} align="middle" className="mb-4">
          <Col span={10}>
            <Input 
              prefix={<SearchOutlined />} 
              placeholder="Tìm theo tên, mã KH, số điện thoại..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              onPressEnter={fetchCustomers}
              allowClear
            />
          </Col>
          <Col span={6}>
            <Select 
              className="w-full" 
              value={categoryFilter} 
              onChange={setCategoryFilter}
              suffixIcon={<FilterOutlined />}
            >
              <Option value="all">Tất cả phân loại</Option>
              <Option value="Khách lẻ">Khách lẻ</Option>
              <Option value="Khách VIP">Khách VIP</Option>
              <Option value="Đại lý">Đại lý</Option>
            </Select>
          </Col>
          <Col span={4}>
            <Button icon={<ReloadOutlined />} onClick={fetchCustomers} block>Làm mới</Button>
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

      <CustomerDetailModal 
        visible={modalVisible} 
        customer={selectedCustomer} 
        onClose={() => { setModalVisible(false); fetchCustomers(); }} 
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
