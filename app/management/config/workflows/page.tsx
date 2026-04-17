'use client';

import React, { useState, useEffect } from 'react';
import { 
  Table, Button, Space, Card, Typography, message, Tag, Switch, Popconfirm
} from 'antd';
import { 
  NodeIndexOutlined, 
  PlusOutlined, 
  EditOutlined, 
  DeleteOutlined, 
  ReloadOutlined
} from '@ant-design/icons';
import { supabase } from '@/lib/supabase';
import { clearCache } from '@/lib/auth';
import WorkflowDetailModal from '@/components/config/WorkflowDetailModal';

const { Title, Text } = Typography;

export default function WorkflowsPage() {
  const [data, setData] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: wfData, error: wfError } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('name');
      if (wfError) throw wfError;
      setData(wfData || []);

      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .order('id');
      if (deptError) throw deptError;
      setDepartments(deptData || []);
    } catch (err) {
      message.error('Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddEdit = (workflow: any = null) => {
    setCurrentWorkflow(workflow);
    setModalVisible(true);
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({ is_active: isActive })
        .eq('id', id);
      if (error) throw error;
      clearCache();
      message.success(`Đã ${isActive ? 'kích hoạt' : 'vô hiệu hóa'} quy trình`);
      fetchData();
    } catch (err) {
      message.error('Lỗi khi cập nhật');
    }
  };

  const getDeptName = (deptId: number) => {
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || `ID: ${deptId}`;
  };

  const columns = [
    {
      title: 'Tên quy trình',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: 'Mô tả',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Chuỗi bộ phận',
      dataIndex: 'department_sequence',
      key: 'sequence',
      render: (sequence: number[]) => (
        <div className="flex flex-wrap gap-1">
          {sequence?.map((deptId, idx) => (
            <span key={deptId}>
              <Tag color="blue">{getDeptName(deptId)}</Tag>
              {idx < sequence.length - 1 && <span className="text-gray-400">→</span>}
            </span>
          ))}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean, record: any) => (
        <Switch 
          checked={active} 
          onChange={(checked) => handleToggleActive(record.id, checked)}
          checkedChildren="Hoạt động"
          unCheckedChildren="Tắt"
        />
      ),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 80,
      render: (_: any, record: any) => (
        <Button type="text" icon={<EditOutlined />} onClick={() => handleAddEdit(record)} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3} className="m-0"><NodeIndexOutlined /> Quản lý Quy trình mẫu</Title>
          <Text type="secondary">Cấu hình các quy trình sản xuất mẫu</Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>Làm mới</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddEdit()}>Thêm Quy trình</Button>
        </Space>
      </div>

      <Card className="shadow-sm">
        <Table columns={columns} dataSource={data} rowKey="id" loading={loading} />
      </Card>

      <WorkflowDetailModal
        visible={modalVisible}
        workflow={currentWorkflow}
        departments={departments}
        onClose={() => setModalVisible(false)}
        onRefresh={() => { clearCache(); fetchData(); }}
      />
    </div>
  );
}
