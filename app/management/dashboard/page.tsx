'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Card, Typography, Row, Col, Space, Tag, Tooltip, 
  Badge, Button, Statistic, Progress, Divider, Select, DatePicker, Segmented 
} from 'antd';
import { 
  DashboardOutlined, 
  SyncOutlined, 
  WarningOutlined, 
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlayCircleOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  ReloadOutlined,
  FilterOutlined,
  TableOutlined,
  BarChartOutlined as GanttOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

export default function DashboardPage() {
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<string | number>('Kanban');
  
  // Filters
  const [customerFilter, setCustomerFilter] = useState<string | null>(null);
  const [deptFilter, setDeptFilter] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);

  const [stats, setStats] = useState({ 
    total: 0, 
    running: 0, 
    issues: 0, 
    completed: 0, 
    avgDelay: 0,
    completionRate: 0 
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Basic Metadata
      const { data: deptData } = await supabase.from('departments').select('*').order('id', { ascending: true });
      setDepartments(deptData || []);

      const { data: custData } = await supabase.from('customers').select('id, name').order('name', { ascending: true });
      setCustomers(custData || []);

      // 2. Fetch Orders with Tasks
      let query = supabase
        .from('production_orders')
        .select(`
          id, code, title, status, created_at, customer_id,
          tasks (id, status, department_id, start_time, end_time, ready_at, updated_at, issue_log, material_shortage)
        `)
        .order('created_at', { ascending: false });

      if (customerFilter) {
        query = query.eq('customer_id', customerFilter);
      }
      
      if (dateRange) {
        query = query.gte('created_at', dateRange[0].startOf('day').toISOString());
        query = query.lte('created_at', dateRange[1].endOf('day').toISOString());
      }

      const { data: orders, error } = await query;
      if (error) throw error;
      
      let filteredOrders = orders || [];
      if (deptFilter) {
        filteredOrders = filteredOrders.filter(o => o.tasks.some((t: any) => t.department_id === deptFilter));
      }

      setData(filteredOrders);
      
      // Calculate Stats
      const total = filteredOrders.length || 0;
      const running = filteredOrders.filter(o => o.status === 'in_progress').length || 0;
      const completed = filteredOrders.filter(o => o.status === 'completed').length || 0;
      const issues = filteredOrders.filter(o => o.tasks?.some((t: any) => t.status === 'issue' || t.status === 'on_hold')).length || 0;
      
      let totalDelayHours = 0;
      let delayedTaskCount = 0;
      filteredOrders.forEach(o => {
        o.tasks?.forEach((t: any) => {
          if (t.status === 'ready' && t.ready_at) {
            const delay = dayjs().diff(dayjs(t.ready_at), 'hour');
            if (delay >= 1) {
              totalDelayHours += delay;
              delayedTaskCount++;
            }
          }
        });
      });

      setStats({ 
        total, 
        running, 
        issues, 
        completed,
        avgDelay: delayedTaskCount > 0 ? Math.round(totalDelayHours / delayedTaskCount) : 0,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000); 
    return () => clearInterval(interval);
  }, [customerFilter, deptFilter, dateRange]);

  const getTaskCell = (tasks: any[], deptId: number) => {
    const task = tasks?.find(t => t.department_id === deptId);
    if (!task) return null;

    let color = 'default';
    let icon = <ClockCircleOutlined />;
    let isDelayed = false;
    let delayHours = 0;

    if (task.status === 'ready' && task.ready_at) {
      delayHours = dayjs().diff(dayjs(task.ready_at), 'hour');
      if (delayHours >= 1) isDelayed = true;
    }

    if (task.status === 'done') { color = 'green'; icon = <CheckCircleOutlined />; }
    else if (task.status === 'in_progress') { color = 'blue'; icon = <SyncOutlined spin />; }
    else if (task.status === 'issue') { color = 'red'; icon = <WarningOutlined />; }
    else if (task.status === 'on_hold') { color = 'orange'; icon = <PlayCircleOutlined />; }
    else if (task.status === 'ready') { color = isDelayed ? 'red' : 'processing'; icon = <PlayCircleOutlined />; }

    return (
      <Tooltip title={
        <div className="p-1">
          <div className="font-bold">{task.status.toUpperCase()}</div>
          {task.ready_at && <div>Sẵn sàng: {dayjs(task.ready_at).format('HH:mm DD/MM')}</div>}
          {isDelayed && <div className="text-red-400 font-bold">TRỄ: {delayHours}H</div>}
          {task.material_shortage && <div className="text-orange-300">THIẾU VẬT TƯ</div>}
        </div>
      } color={isDelayed ? '#7f1d1d' : ''}>
        <Tag 
          color={color} 
          icon={icon} 
          className={`m-0 w-full text-center py-2 font-bold rounded-md border-none ${isDelayed ? 'animate-pulse scale-105' : ''}`}
        >
          {task.status === 'done' ? 'DONE' : task.status.toUpperCase()}
        </Tag>
      </Tooltip>
    );
  };

  const ganttColumns = [
    {
      title: 'Lệnh Sản Xuất',
      dataIndex: 'code',
      key: 'code',
      width: 200,
      render: (text: string, record: any) => (
        <div>
          <Text strong className="text-blue-600 block">{text}</Text>
          <Text type="secondary" style={{ fontSize: '10px' }}>{record.title}</Text>
        </div>
      )
    },
    {
      title: 'Dòng thời gian quy trình (Bộ phận)',
      key: 'gantt',
      render: (_: any, record: any) => (
        <div className="flex w-full bg-gray-100 rounded-lg h-10 items-center px-1 overflow-hidden">
          {departments.map((dept, idx) => {
            const task = record.tasks.find((t: any) => t.department_id === dept.id);
            if (!task) return <div key={dept.id} className="flex-1" />;
            
            let color = '#e2e8f0'; // pending
            if (task.status === 'done') color = '#10b981';
            else if (task.status === 'in_progress') color = '#3b82f6';
            else if (task.status === 'ready') color = '#06b6d4';
            else if (task.status === 'on_hold' || task.status === 'issue') color = '#f43f5e';

            return (
              <div 
                key={dept.id} 
                className="h-8 flex-1 border-r border-white first:rounded-l-md last:rounded-r-md flex items-center justify-center text-[8px] font-bold text-white transition-all hover:scale-105"
                style={{ backgroundColor: color }}
              >
                <Tooltip title={`${dept.name}: ${task.status.toUpperCase()}`}>
                  {dept.code}
                </Tooltip>
              </div>
            );
          })}
        </div>
      )
    }
  ];

  const columns = [
    {
      title: 'Lệnh Sản Xuất',
      dataIndex: 'code',
      key: 'code',
      fixed: 'left' as const,
      width: 160,
      render: (text: string, record: any) => (
        <Space direction="vertical" size={0}>
          <Text strong className="text-blue-600 font-mono tracking-tight">{text}</Text>
          <Text type="secondary" style={{ fontSize: '11px' }} ellipsis={{ tooltip: record.title }}>
            {record.title}
          </Text>
        </Space>
      ),
    },
    ...departments.map(dept => ({
      title: <div className="text-[10px] font-black uppercase text-gray-400">{dept.name}</div>,
      key: `dept_${dept.id}`,
      align: 'center' as const,
      width: 140,
      render: (_: any, record: any) => getTaskCell(record.tasks, dept.id),
    })),
  ];

  return (
    <div className="space-y-6">
      <Row justify="space-between" align="middle">
        <Col>
          <Title level={3} className="m-0 font-black tracking-tight"><DashboardOutlined /> MASTER DASHBOARD</Title>
          <Text type="secondary" className="text-xs uppercase tracking-widest text-gray-400">TƯ DUY HỆ THỐNG - ĐIỀU PHỐI ĐA PHÂN HỆ</Text>
        </Col>
        <Col>
          <Space>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: 'Bảng Tổng', value: 'Kanban', icon: <TableOutlined /> },
                { label: 'Tiến độ (Gantt)', value: 'Gantt', icon: <GanttOutlined /> },
              ]}
              className="bg-white p-1 rounded-lg border"
            />
            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} shape="round">LÀM MỚI</Button>
          </Space>
        </Col>
      </Row>

      <Card className="shadow-sm border-none p-2">
        <Row gutter={16} align="middle">
          <Col span={6}>
            <Select 
              className="w-full" 
              placeholder="Chọn khách hàng" 
              allowClear 
              showSearch
              filterOption={(input, option) => (option?.children as any || '').toLowerCase().includes(input.toLowerCase())}
              onChange={setCustomerFilter}
            >
              {customers.map(c => <Option key={c.id} value={c.id}>{c.name}</Option>)}
            </Select>
          </Col>
          <Col span={6}>
            <Select 
              className="w-full" 
              placeholder="Bộ phận" 
              allowClear 
              onChange={setDeptFilter}
            >
              {departments.map(d => <Option key={d.id} value={d.id}>{d.name}</Option>)}
            </Select>
          </Col>
          <Col span={8}>
            <RangePicker 
              className="w-full" 
              onChange={(dates) => setDateRange(dates as any)}
            />
          </Col>
          <Col span={4}>
            <Tag color="blue" icon={<FilterOutlined />}>Đang lọc {data.length} đơn</Tag>
          </Col>
        </Row>
      </Card>

      <Row gutter={16}>
        <Col span={6}><Card className="shadow-sm border-none text-center"><Statistic title="Tổng lệnh" value={stats.total} valueStyle={{ fontWeight: 900 }} /></Card></Col>
        <Col span={6}><Card className="shadow-sm border-none text-center"><Statistic title="Hoàn tất" value={stats.completionRate} suffix="%" valueStyle={{ color: '#10b981', fontWeight: 900 }} /></Card></Col>
        <Col span={6}><Card className="shadow-sm border-none text-center"><Statistic title="Độ trễ trung bình" value={stats.avgDelay} suffix="h" valueStyle={{ color: stats.avgDelay > 1 ? '#ef4444' : '#f59e0b', fontWeight: 900 }} /></Card></Col>
        <Col span={6}><Card className="shadow-sm border-none text-center"><Statistic title="Sự cố" value={stats.issues} valueStyle={{ color: '#ef4444', fontWeight: 900 }} /></Card></Col>
      </Row>

      <Card className="shadow-xl rounded-2xl border-none overflow-hidden" styles={{ body: { padding: 0 } }}>
        <Table 
          columns={viewMode === 'Kanban' ? columns : ganttColumns} 
          dataSource={data} 
          rowKey="id" 
          pagination={{ pageSize: 12 }}
          scroll={viewMode === 'Kanban' ? { x: 'max-content', y: 550 } : { y: 550 }}
          className="master-table custom-scrollbar"
          loading={loading}
          size="middle"
        />
      </Card>

      <div className="bg-slate-900 p-6 rounded-2xl shadow-xl flex flex-wrap gap-8 items-center border border-slate-800">
        <Space><Badge status="processing" color="#3b82f6" /><Text className="text-gray-300 text-xs font-bold font-mono">READY</Text></Space>
        <Space><Badge status="error" color="#f43f5e" className="animate-pulse" /><Text className="text-rose-500 text-xs font-black font-mono">DELAY {">"} 1H</Text></Space>
        <Space><Badge status="warning" color="#f59e0b" /><Text className="text-amber-500 text-xs font-bold font-mono">HOLD/ISSUE</Text></Space>
        <Space><Badge status="success" color="#10b981" /><Text className="text-emerald-500 text-xs font-bold font-mono">DONE</Text></Space>
      </div>

      <style jsx global>{`
        .master-table .ant-table-thead > tr > th { background-color: #f8fafc !important; font-weight: 900 !important; }
        @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1.05); } 50% { opacity: .7; transform: scale(1); } }
        .animate-pulse { animation: pulse 1.5s infinite; }
      `}</style>
    </div>
  );
}
