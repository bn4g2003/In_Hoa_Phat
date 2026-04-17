'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Table, Card, Typography, Row, Col, Space, Button, 
  Select, DatePicker, Tag, message, Statistic, Tabs, 
  Input, Segmented, Modal, Form, InputNumber, Popconfirm,
  Drawer, Descriptions, Divider, Tooltip, Badge
} from 'antd';
import { 
  DollarOutlined, 
  ReloadOutlined, 
  FileExcelOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SearchOutlined,
  WarningOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  WalletOutlined,
  BankOutlined,
  HistoryOutlined,
  BarChartOutlined,
  PrinterOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

const COLORS = ['#1890ff', '#52c41a', '#fa8c16', '#f5222d', '#722ed1', '#13c2c2'];

interface PaymentLog {
  id: string;
  customer_id: string;
  order_id?: string;
  amount: number;
  type: 'payment' | 'refund';
  method: 'cash' | 'bank_transfer' | 'momo';
  note?: string;
  created_at: string;
  customers?: { name: string; code: string };
  production_orders?: { code: string };
}

interface Customer {
  id: string;
  code: string;
  name: string;
  current_debt: number;
  prepaid_amount: number;
  total_revenue: number;
}

interface Transaction {
  id: string;
  account_id: string;
  customer_id?: string;
  order_id?: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  category?: string;
  description: string;
  transaction_date: string;
  accounts?: { name: string };
  customers?: { name: string };
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
  balance: number;
}

export default function FinancePage() {
  const [loading, setLoading] = useState(false);
  const [payments, setPayments] = useState<PaymentLog[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [transactionModalVisible, setTransactionModalVisible] = useState(false);
  const [detailDrawerVisible, setDetailDrawerVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentLog | null>(null);
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  const [stats, setStats] = useState({
    totalIn: 0,
    totalOut: 0,
    pending: 0,
    completed: 0,
    cashInHand: 0,
    bankBalance: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch payment logs
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

      // Fetch customers
      const { data: custData } = await supabase
        .from('customers')
        .select('id, name, code, current_debt, prepaid_amount, total_revenue')
        .order('name');
      setCustomers(custData || []);

      // Fetch orders
      const { data: orderData } = await supabase
        .from('production_orders')
        .select('id, code, title, financials, status')
        .order('created_at', { ascending: false });
      setOrders(orderData || []);

      // Fetch accounts
      const { data: accountData } = await supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');
      setAccounts(accountData || []);

      // Fetch transactions for cash book
      const { data: txData } = await supabase
        .from('transactions')
        .select(`
          *,
          accounts (name),
          customers (name)
        `)
        .order('transaction_date', { ascending: false })
        .limit(100);
      setTransactions(txData || []);

      // Calculate stats
      const totalIn = filtered.filter(p => p.type === 'payment').reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalOut = filtered.filter(p => p.type === 'refund').reduce((sum, p) => sum + (p.amount || 0), 0);
      const pending = customers.reduce((sum, c) => sum + (c.current_debt || 0), 0);
      const completed = filtered.filter(p => p.type === 'payment').length;
      
      // Calculate cash in hand
      const cashIn = filtered.filter(p => p.type === 'payment' && p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
      const cashOut = filtered.filter(p => p.type === 'refund' && p.method === 'cash').reduce((sum, p) => sum + (p.amount || 0), 0);
      const cashInHand = cashIn - cashOut;
      
      // Bank balance
      const bankIn = filtered.filter(p => p.type === 'payment' && p.method === 'bank_transfer').reduce((sum, p) => sum + (p.amount || 0), 0);
      const bankOut = filtered.filter(p => p.type === 'refund' && p.method === 'bank_transfer').reduce((sum, p) => sum + (p.amount || 0), 0);
      const bankBalance = bankIn - bankOut;

      setStats({ totalIn, totalOut, pending, completed, cashInHand, bankBalance });

    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tải dữ liệu tài chính');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, dateRange, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTransaction = async (values: any) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('payment_logs')
        .insert([{
          customer_id: values.customer_id,
          order_id: values.order_id || null,
          amount: values.amount,
          type: values.type,
          method: values.method,
          note: values.note,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      // Update customer debt/prepaid
      if (values.customer_id) {
        const customer = customers.find(c => c.id === values.customer_id);
        if (customer) {
          const newPrepaid = values.type === 'payment' 
            ? (customer.prepaid_amount || 0) + values.amount 
            : (customer.prepaid_amount || 0) - values.amount;
          const newDebt = values.type === 'payment'
            ? (customer.current_debt || 0) - values.amount
            : (customer.current_debt || 0) + values.amount;

          await supabase.from('customers').update({
            prepaid_amount: Math.max(0, newPrepaid),
            current_debt: Math.max(0, newDebt),
            total_revenue: values.type === 'payment' 
              ? (customer.total_revenue || 0) + values.amount 
              : customer.total_revenue
          }).eq('id', values.customer_id);
        }
      }

      message.success('Đã tạo giao dịch thành công');
      setTransactionModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi tạo giao dịch');
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    try {
      const { error } = await supabase.from('payment_logs').delete().eq('id', id);
      if (error) throw error;
      message.success('Đã xóa giao dịch');
      fetchData();
    } catch (err) {
      console.error(err);
      message.error('Lỗi khi xóa giao dịch');
    }
  };

  const handleViewDetail = (payment: PaymentLog) => {
    setSelectedPayment(payment);
    setDetailDrawerVisible(true);
  };

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

  // Prepare chart data
  const getDailyData = () => {
    const dailyMap: Record<string, { date: string; thu: number; chi: number }> = {};
    payments.forEach(p => {
      const date = dayjs(p.created_at).format('DD/MM');
      if (!dailyMap[date]) dailyMap[date] = { date, thu: 0, chi: 0 };
      if (p.type === 'payment') dailyMap[date].thu += p.amount || 0;
      else dailyMap[date].chi += p.amount || 0;
    });
    return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date)).slice(-14);
  };

  const getMethodData = () => {
    const cashIn = payments.filter(p => p.type === 'payment' && p.method === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
    const bankIn = payments.filter(p => p.type === 'payment' && p.method === 'bank_transfer').reduce((s, p) => s + (p.amount || 0), 0);
    const momoIn = payments.filter(p => p.type === 'payment' && p.method === 'momo').reduce((s, p) => s + (p.amount || 0), 0);
    return [
      { name: 'Tiền mặt', value: cashIn },
      { name: 'Chuyển khoản', value: bankIn },
      { name: 'Momo', value: momoIn }
    ].filter(d => d.value > 0);
  };

  const getDebtByCustomer = () => {
    return customers
      .filter(c => (c.current_debt || 0) > 0)
      .sort((a, b) => (b.current_debt || 0) - (a.current_debt || 0))
      .slice(0, 10)
      .map(c => ({ name: c.name, debt: c.current_debt || 0 }));
  };

  const columns = [
    { title: 'Ngày', dataIndex: 'created_at', key: 'date', width: 140, render: (d: string) => dayjs(d).format('DD/MM/YYYY HH:mm') },
    { title: 'Khách hàng', key: 'customer', render: (_: any, r: PaymentLog) => <div><Text strong>{r.customers?.name}</Text><br/><Text type="secondary">{r.customers?.code}</Text></div> },
    { title: 'LSX', dataIndex: ['production_orders', 'code'], key: 'order', render: (c: string) => c ? <Tag color="blue">{c}</Tag> : '---' },
    { title: 'Loại', dataIndex: 'type', key: 'type', width: 80, render: (t: string) => <Tag color={t === 'payment' ? 'green' : 'red'} icon={t === 'payment' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}>{t === 'payment' ? 'THU' : 'CHI'}</Tag> },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', align: 'right' as const, render: (a: number, r: PaymentLog) => <Text strong style={{ color: r.type === 'payment' ? '#52c41a' : '#f5222d' }}>{r.type === 'payment' ? '+' : '-'}{a?.toLocaleString()} đ</Text> },
    { title: 'Phương thức', dataIndex: 'method', key: 'method', render: (m: string) => <Tag>{m === 'cash' ? 'Tiền mặt' : m === 'bank_transfer' ? 'Chuyển khoản' : 'Momo'}</Tag> },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note', ellipsis: true },
    { 
      title: 'Thao tác', 
      key: 'actions', 
      width: 120,
      render: (_: any, r: PaymentLog) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button type="text" icon={<EyeOutlined />} onClick={() => handleViewDetail(r)} />
          </Tooltip>
          <Popconfirm title="Xóa giao dịch này?" onConfirm={() => handleDeletePayment(r.id)} okText="Xóa" cancelText="Hủy">
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    },
  ];

  const debtColumns = [
    { title: 'Khách hàng', key: 'customer', render: (_: any, r: Customer) => <Space><Text strong>{r.name}</Text><Text type="secondary">({r.code})</Text></Space> },
    { title: 'Tổng doanh thu', dataIndex: 'total_revenue', key: 'revenue', align: 'right' as const, render: (v: number) => <Text>{v?.toLocaleString()} đ</Text> },
    { title: 'Đã tạm ứng', dataIndex: 'prepaid_amount', key: 'prepaid', align: 'right' as const, render: (v: number) => <Text style={{ color: '#52c41a' }}>{v?.toLocaleString()} đ</Text> },
    { title: 'Còn nợ', dataIndex: 'current_debt', key: 'debt', align: 'right' as const, render: (v: number) => <Text strong style={{ color: v > 0 ? '#f5222d' : '#52c41a' }}>{v?.toLocaleString()} đ</Text> },
    { 
      title: 'Thao tác', 
      key: 'actions',
      render: (_: any, r: Customer) => (
        <Button type="link" size="small" onClick={() => {
          setSearch(r.code);
          setTypeFilter('all');
        }}>Xem giao dịch</Button>
      )
    },
  ];

  // Cash book columns
  const cashBookColumns = [
    { title: 'Ngày', dataIndex: 'transaction_date', key: 'date', render: (d: string) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Diễn giải', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Thu', key: 'thu', align: 'right' as const, render: (_: any, r: Transaction) => r.type === 'income' ? <Text style={{ color: '#52c41a' }}>{r.amount?.toLocaleString()}</Text> : '' },
    { title: 'Chi', key: 'chi', align: 'right' as const, render: (_: any, r: Transaction) => r.type === 'expense' ? <Text style={{ color: '#f5222d' }}>{r.amount?.toLocaleString()}</Text> : '' },
    { title: 'Tài khoản', dataIndex: ['accounts', 'name'], key: 'account' },
  ];

  const tabItems = [
    {
      key: '1',
      label: <span><DollarOutlined /> Lịch sử giao dịch</span>,
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={6}><Card className="bg-green-50 border-green-100"><Statistic title="Tổng thu" value={stats.totalIn} suffix="đ" styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }} prefix={<ArrowUpOutlined />} /></Card></Col>
            <Col span={6}><Card className="bg-red-50 border-red-100"><Statistic title="Tổng chi" value={stats.totalOut} suffix="đ" styles={{ content: { color: '#f5222d', fontWeight: 'bold' } }} prefix={<ArrowDownOutlined />} /></Card></Col>
            <Col span={6}><Card className="bg-orange-50 border-orange-100"><Statistic title="Công nợ tồn" value={stats.pending} suffix="đ" styles={{ content: { color: '#fa8c16', fontWeight: 'bold' } }} /></Card></Col>
            <Col span={6}><Card className="bg-blue-50 border-blue-100"><Statistic title="Giao dịch" value={stats.completed} suffix="lần" styles={{ content: { color: '#1890ff', fontWeight: 'bold' } }} /></Card></Col>
          </Row>

          <Row gutter={16} align="middle">
            <Col span={8}><Input prefix={<SearchOutlined />} placeholder="Tìm..." value={search} onChange={e => setSearch(e.target.value)} allowClear /></Col>
            <Col span={6}><Select className="w-full" value={typeFilter} onChange={setTypeFilter}><Option value="all">Tất cả</Option><Option value="payment">Thu tiền</Option><Option value="refund">Chi tiền</Option></Select></Col>
            <Col span={8}><RangePicker className="w-full" onChange={d => setDateRange(d as any)} /></Col>
            <Col span={2}><Button icon={<ReloadOutlined />} onClick={fetchData} block /></Col>
          </Row>

          <Table columns={columns} dataSource={payments} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
        </div>
      )
    },
    {
      key: '2',
      label: <span><WarningOutlined /> Công nợ khách hàng</span>,
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={8}><Card className="bg-red-50 border-red-100"><Statistic title="Tổng công nợ" value={customers.reduce((s, c) => s + (c.current_debt || 0), 0)} suffix="đ" styles={{ content: { color: '#f5222d', fontWeight: 'bold' } }} /></Card></Col>
            <Col span={8}><Card className="bg-green-50 border-green-100"><Statistic title="Khách không nợ" value={customers.filter(c => (c.current_debt || 0) === 0).length} styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }} /></Card></Col>
            <Col span={8}><Card className="bg-orange-50 border-orange-100"><Statistic title="Khách đang nợ" value={customers.filter(c => (c.current_debt || 0) > 0).length} styles={{ content: { color: '#fa8c16', fontWeight: 'bold' } }} /></Card></Col>
          </Row>
          <Table columns={debtColumns} dataSource={customers} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
        </div>
      )
    },
    {
      key: '3',
      label: <span><WalletOutlined /> Sổ quỹ</span>,
      children: (
        <div className="space-y-4">
          <Row gutter={16}>
            <Col span={8}><Card className="bg-green-50 border-green-100"><Statistic title="Tổng thu tiền mặt" value={payments.filter(p => p.type === 'payment' && p.method === 'cash').reduce((s, p) => s + (p.amount || 0), 0)} suffix="đ" styles={{ content: { color: '#52c41a', fontWeight: 'bold' } }} prefix={<ArrowUpOutlined />} /></Card></Col>
            <Col span={8}><Card className="bg-red-50 border-red-100"><Statistic title="Tổng chi tiền mặt" value={payments.filter(p => p.type === 'refund' && p.method === 'cash').reduce((s, p) => s + (p.amount || 0), 0)} suffix="đ" styles={{ content: { color: '#f5222d', fontWeight: 'bold' } }} prefix={<ArrowDownOutlined />} /></Card></Col>
            <Col span={8}><Card className="bg-blue-50 border-blue-100"><Statistic title="Số dư tiền mặt" value={stats.cashInHand} suffix="đ" styles={{ content: { color: stats.cashInHand >= 0 ? '#1890ff' : '#f5222d', fontWeight: 'bold' } }} /></Card></Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Text type="secondary">Dữ liệu sổ quỹ chi tiết (từ bảng transactions)</Text>
            </Col>
          </Row>
          <Table columns={cashBookColumns} dataSource={transactions} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} />
        </div>
      )
    },
    {
      key: '4',
      label: <span><BarChartOutlined /> Báo cáo & Biểu đồ</span>,
      children: (
        <div className="space-y-6">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Thu chi theo ngày (14 ngày gần nhất)">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getDailyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                    <RechartsTooltip formatter={(v: number) => v.toLocaleString() + ' đ'} />
                    <Legend />
                    <Line type="monotone" dataKey="thu" stroke="#52c41a" name="Thu" strokeWidth={2} />
                    <Line type="monotone" dataKey="chi" stroke="#f5222d" name="Chi" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Cơ cấu thu theo phương thức">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={getMethodData()} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}>
                      {getMethodData().map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: number) => v.toLocaleString() + ' đ'} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={24}>
              <Card title="Top 10 khách hàng nợ nhiều nhất">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getDebtByCustomer()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(v) => `${(v/1000000).toFixed(1)}M`} />
                    <YAxis type="category" dataKey="name" width={150} />
                    <RechartsTooltip formatter={(v: number) => v.toLocaleString() + ' đ'} />
                    <Bar dataKey="debt" fill="#f5222d" name="Công nợ" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <Title level={3} className="m-0"><DollarOutlined className="text-green-600" /> Quản lý Tài chính</Title>
          <Text type="secondary">Theo dõi thu chi, công nợ và báo cáo tài chính</Text>
        </div>
        <Space>
          <Button icon={<FileExcelOutlined />} onClick={exportToExcel}>Xuất Excel</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setTransactionModalVisible(true)}>Tạo giao dịch</Button>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Làm mới</Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>

      {/* Create Transaction Modal */}
      <Modal
        title="Tạo giao dịch thu/chi"
        open={transactionModalVisible}
        onCancel={() => setTransactionModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateTransaction} initialValues={{ type: 'payment', method: 'cash' }}>
          <Form.Item name="type" label="Loại giao dịch">
            <Segmented block options={[{ label: 'THU TIỀN', value: 'payment', icon: <ArrowUpOutlined /> }, { label: 'CHI TIỀN', value: 'refund', icon: <ArrowDownOutlined /> }]} />
          </Form.Item>
          <Form.Item name="customer_id" label="Khách hàng">
            <Select placeholder="Chọn khách hàng" showSearch filterOption={(i, o) => (o?.children as any || '').toLowerCase().includes(i.toLowerCase())}>
              {customers.map(c => <Option key={c.id} value={c.id}>{c.name} ({c.code})</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="order_id" label="Đơn hàng (LSX)">
            <Select placeholder="Chọn LSX (không bắt buộc)" allowClear showSearch filterOption={(i, o) => (o?.children as any || '').toLowerCase().includes(i.toLowerCase())}>
              {orders.map(o => <Option key={o.id} value={o.id}>{o.code} - {o.title}</Option>)}
            </Select>
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="amount" label="Số tiền" rules={[{ required: true }]}><InputNumber className="w-full" min={0} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} /></Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="method" label="Phương thức" rules={[{ required: true }]}>
                <Select>
                  <Option value="cash">Tiền mặt</Option>
                  <Option value="bank_transfer">Chuyển khoản</Option>
                  <Option value="momo">Momo</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="note" label="Ghi chú"><TextArea rows={2} placeholder="Nội dung giao dịch..." /></Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setTransactionModalVisible(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={saving}>Tạo giao dịch</Button>
          </div>
        </Form>
      </Modal>

      {/* Payment Detail Drawer */}
      <Drawer
        title="Chi tiết giao dịch"
        placement="right"
        width={400}
        open={detailDrawerVisible}
        onClose={() => setDetailDrawerVisible(false)}
      >
        {selectedPayment && (
          <div>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Mã giao dịch">{selectedPayment.id.slice(0, 8)}</Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">{dayjs(selectedPayment.created_at).format('DD/MM/YYYY HH:mm')}</Descriptions.Item>
              <Descriptions.Item label="Loại">
                <Tag color={selectedPayment.type === 'payment' ? 'green' : 'red'}>
                  {selectedPayment.type === 'payment' ? 'THU TIỀN' : 'CHI TIỀN'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Số tiền">
                <Text strong style={{ fontSize: 18, color: selectedPayment.type === 'payment' ? '#52c41a' : '#f5222d' }}>
                  {selectedPayment.type === 'payment' ? '+' : '-'}{selectedPayment.amount?.toLocaleString()} đ
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Phương thức">
                {selectedPayment.method === 'cash' ? 'Tiền mặt' : selectedPayment.method === 'bank_transfer' ? 'Chuyển khoản' : 'Momo'}
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">
                {selectedPayment.customers?.name} ({selectedPayment.customers?.code})
              </Descriptions.Item>
              <Descriptions.Item label="LSX">
                {selectedPayment.production_orders?.code || '---'}
              </Descriptions.Item>
              <Descriptions.Item label="Ghi chú">{selectedPayment.note || '---'}</Descriptions.Item>
            </Descriptions>
            <Divider />
            <Space direction="vertical" className="w-full">
              <Popconfirm title="Xóa giao dịch này?" onConfirm={() => {
                handleDeletePayment(selectedPayment.id);
                setDetailDrawerVisible(false);
              }} okText="Xóa" cancelText="Hủy">
                <Button danger block icon={<DeleteOutlined />}>Xóa giao dịch</Button>
              </Popconfirm>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  );
}