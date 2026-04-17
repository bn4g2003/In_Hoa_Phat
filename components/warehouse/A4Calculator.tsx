'use client';

import React, { useState } from 'react';
import { Form, InputNumber, Select, Row, Col, Typography, Card, Divider, Statistic } from 'antd';
import { CalculatorOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface A4CalculatorProps {
  isModal?: boolean;
}

const SIZE_FACTORS: any = {
  'A0': 16,
  'A1': 8,
  'A2': 4,
  'A3': 2,
  'A4': 1,
  'A5': 0.5,
  'A6': 0.25,
};

export default function A4Calculator({ isModal = false }: A4CalculatorProps) {
  const [form] = Form.useForm();
  const [calculatedValue, setCalculatedValue] = useState(100);

  const onValuesChange = (_: any, allValues: any) => {
    const { size, quantity } = allValues;
    const factor = SIZE_FACTORS[size] || 1;
    setCalculatedValue(quantity * factor);
  };

  const content = (
    <div className={isModal ? "" : "bg-white p-6 rounded-xl border"}>
      <div className="mb-6">
        <Title level={4}><CalculatorOutlined /> Công cụ Quy đổi định mức A4</Title>
        <Text type="secondary">
          <InfoCircleOutlined /> Hệ thống tự động quy đổi tất cả các loại khổ giấy về chuẩn <b>A4</b> để tính toán định mức.
        </Text>
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={onValuesChange}
        initialValues={{ size: 'A4', quantity: 100 }}
      >
        <Card className="bg-blue-50 border-blue-100 mb-6">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="size" label="Khổ giấy gốc">
                <Select size="large">
                  <Option value="A0">A0</Option>
                  <Option value="A1">A1</Option>
                  <Option value="A2">A2</Option>
                  <Option value="A3">A3</Option>
                  <Option value="A4">A4</Option>
                  <Option value="A5">A5</Option>
                  <Option value="A6">A6</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="quantity" label="Số lượng tờ gốc">
                <InputNumber min={1} size="large" className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Statistic 
            title="Định mức quy đổi tương đương" 
            value={calculatedValue} 
            suffix="Tờ A4" 
            valueStyle={{ color: '#1677ff', fontSize: '32px', fontWeight: 'bold' }}
          />
        </div>

        <div className="mt-8">
          <Title level={5}>Bảng hệ số tham chiếu:</Title>
          <Row gutter={[8, 8]}>
            <Col span={6}><div className="bg-white p-2 border rounded text-center text-xs">A3 = 2 x A4</div></Col>
            <Col span={6}><div className="bg-white p-2 border rounded text-center text-xs">A5 = 0.5 x A4</div></Col>
            <Col span={6}><div className="bg-white p-2 border rounded text-center text-xs">A2 = 4 x A4</div></Col>
            <Col span={6}><div className="bg-white p-2 border rounded text-center text-xs">A1 = 8 x A4</div></Col>
          </Row>
        </div>
      </Form>
    </div>
  );

  return content;
}
