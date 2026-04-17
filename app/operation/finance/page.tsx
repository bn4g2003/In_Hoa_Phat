'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Row, Col, Space, Button, 
  Select, DatePicker, Tag, message, Statistic, Tabs, 
  Input, Segmented, Empty
} from 'antd';
import { 
  DollarOutlined, 
  ReloadOutlined, 
  FileExcelOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined,
  FilterOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function FinancePage() {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    pending: 0,
    completed: 0
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch payments
      let query = supabase
        .from('payment_logs')
        .select(`
          *,
          customers (name, code),
          production_orders (code)
        `)
        .order('created_at', { ascending: false });

      if (typeFilter !== 'all') {
        query = query.eq('type', typeFilter);
      }

      if (dateRange) {
        query = query.gte('created_at', dateRange[0].startOf('day').toISOString());
        query = query.lte('created_at', dateRange[1].endOf('day').toISOString());
      }

      const { data: paymentData, error } = await query;
      if (error) throw error;
      
      let filtered = paymentData || [];
      if (search) {
        filtered = filtered.filter(p => 
          p.customers?.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.customers?.code?.toLowerCase().includes(search.toLowerCase()) ||
          p.production_orders?.code?.toLowerCase().includes(search.toLowerCase()) ||
          p.note?.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      setPayments(filtered);

      // Fetch customers for debt summary
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name, code, current_debt, prepaid_amount, total_revenue')
        .order('name');
      setCustomers(custData || []);

      // Fetch orders for revenue
      const { data: orderData } = await supabase
        .from('production_orders')
        .select('id, code, financials, status')
        .order('created_at', { ascending: false });
      setOrders(orderData || []);

      // Calculate stats
      const totalIn = filtered.filter(p => p.type === 'payment').reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOut = filtered.filter(p => p.type === 'refund').reduce((sum, p) => sum + (p.amount || 0), 0);
      const pending = customers.reduce((sum, c) => sum + (c.current_debt || 0), 0);
      const completed = filtered.filter(p => p.type === 'payment').length;

      setStats({ totalIn, totalOut, pending, completed });

    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu tài chính');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [typeFilter, dateRange]);

  const exportToExcel = () => {
    const exportData = payments.map(p => ({
      "Ngày": dayjs(p.created_at).format('DD/MM/YYYY HH:mm'),
      "Khách hàng": p.customers?.name,
      "Mã KH": p.customers?.code,
      "LSX": p.production_orders?.code,
      "Loại": p.type === 'payment' ? 'THU' : 'CHI',
      "Số tiền": p.amount,
      "Phương thức": p.method,
      "Ghi chú": p.note
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TaiChinh");
    XLSX.writeFile(wb, `TaiChinh_${new Date().toISOString().split('T')[0]}.xlsx`);
    message.success(`Đã xuất ${payments.length} giao dịch`);
  };

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'created_at',
      key: 'date',
      width: 140,
      render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm'),
      sorter: (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: any) => (
        <div>
          <Text strong>{record.customers?.name}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>{record.customers?.code}</Text>
        </div>
      ),
    },
    {
      title: 'LSX',
      dataIndex: ['production_orders', 'code'],
      key: 'order',
      render: (code: string) => code ? <Tag color="blue">{code}</Tag> : '---',
    },
    {
      title: 'Loại',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (t: string) => (
        <Tag color={t === 'payment' ? 'green' : 'red'} icon={t === 'payment' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>
          {t === 'payment' ? 'THU' : 'CHI'}
        </Tag>
      ),
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right' as const,
      render: (amount: number, record: any) => (
        <Text strong style={{ color: record.type === 'payment' ? '#52c41a' : '#f5222d', fontSize: '14px' }}>
          {record.type === 'payment' ? '+' : '-'}{amount?.toLocaleString()} đ
        </Text>
      ),
      sorter: (a: any, b: any) => (a.amount || 0) - (b.amount || 0),
    },
    {
      title: 'Phương thức',
      dataIndex: 'method',
      key: 'method',
      render: (m: string) => {
        const methodMap: any = {
          'cash': 'Tiền mặt',
          'bank_transfer': 'Chuyển khoản',
          'momo': 'Momo'
        };
        return <Tag>{methodMap[m] || m}</Tag>;
      },
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
  ];

  const debtColumns = [
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, record: any) => (
        <Space>
          <Text strong>{record.name}</Text>
          <Text type="secondary">({record.code})</Text>
        </Space>
      ),
    },
    {
      title: 'Tổng doanh thu',
      dataIndex: 'total_revenue',
      key: 'revenue',
      align: 'right' as const,
      render: (v: number) => <Text>{v?.toLocaleString()} đ</Text>,
    },
    {
      title: 'Đã tạm ứng',
      dataIndex: 'prepaid_amount',
      key: 'prepaid',
      align: 'right' as const,
      render: (v: number) => <Text style={{ color: '#52c41a' }}>{v?.toLocaleString()} đ</Text>,
    },
    {
      title: 'Còn nợ',
      dataIndex: 'current_debt',
      key: 'debt',
      align: 'right' as const,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? '#f5222d' : '#52c41a' }}>
          {v?.toLocaleString()} đ
        </Text>
      ),
    },
  ];

  const tabItems = [
    {
      key: '1',
      label: <span><DollarOutlined /> Lịch sử giao dịch</span>,
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={6}>
              <Card className="bg-green-50 border-green-100">
                <Statistic 
                  title="Tổng thu" 
                  value={stats.totalIn} 
                  suffix="đ" 
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                  prefix={<ArrowUpOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="bg-red-50 border-red-100">
                <Statistic 
                  title="Tổng chi" 
                  value={stats.totalOut} 
                  suffix="đ" 
                  valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
                  prefix={<ArrowDownOutlined />}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="bg-orange-50 border-orange-100">
                <Statistic 
                  title="Công nợ tồn" 
                  value={stats.pending} 
                  suffix="đ" 
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="bg-blue-50 border-blue-100">
                <Statistic 
                  title="Giao dịch" 
                  value={stats.completed} 
                  suffix="lần"
                  valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          <Row gutter={16} align="middle">
            <Col span={8}>
              <Input 
                prefix={<SearchOutlined />} 
                placeholder="Tìm khách hàng, LSX, ghi chú..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                allowClear
              />
            </Col>
            <Col span={6}>
              <Select className="w-full" value={typeFilter} onChange={setTypeFilter}>
                <Option value="all">Tất cả</Option>
                <Option value="payment">Thu tiền</Option>
                <Option value="refund">Chi tiền</Option>
              </Select>
            </Col>
            <Col span={8}>
              <RangePicker className="w-full" onChange={(d) => setDateRange(d as any)} />
            </Col>
            <Col span={2}>
              <Button icon={<ReloadOutlined />} onClick={fetchData} block>Làm mới</Button>
            </Col>
          </Row>

          <Table 
            columns={columns} 
            dataSource={payments} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 15, showSizeChanger: true }}
            summary={(pageData) => {
              const total = pageData.reduce((sum, p) => sum + (p.type === 'payment' ? p.amount : -p.amount), 0);
              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={4}>
                    <Text strong>Tổng trang</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4} align="right">
                    <Text strong style={{ color: total >= 0 ? '#52c41a' : '#f5222d' }}>
                      {total >= 0 ? '+' : ''}{total.toLocaleString()} đ
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              );
            }}
          />
        </div>
      )
    },
    {
      key: '2',
      label: <span><WarningOutlined /> Công nợ khách hàng</span>,
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={8}>
              <Card className="bg-red-50 border-red-100">
                <Statistic 
                  title="Tổng công nợ" 
                  value={customers.reduce((s, c) => s + (c.current_debt || 0), 0)} 
                  suffix="đ" 
                  valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="bg-green-50 border-green-100">
                <Statistic 
                  title="Khách không nợ" 
                  value={customers.filter(c => (c.current_debt || 0) === 0).length} 
                  valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card className="bg-orange-50 border-orange-100">
                <Statistic 
                  title="Khách đang nợ" 
                  value={customers.filter(c => (c.current_debt || 0) > 0).length} 
                  valueStyle={{ color: '#fa8c16', fontWeight: 'bold' }}
                />
              </Card>
            </Col>
          </Row>

          <Table 
            columns={debtColumns} 
            dataSource={customers} 
            rowKey="id" 
            loading={loading}
            pagination={{ pageSize: 15 }}
            rowClassName={(record) => (record.current_debt || 0) > 0 ? 'bg-red-5' : ''}
          />
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={3} className="m-0"><DollarOutlined className="text-green-600" /> Quản lý Tài chính</Title>
          <Text type="secondary">Theo dõi thu chi và công nợ khách hàng</Text>
        </div>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>Xuất Excel</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>
    </div>
  );
}