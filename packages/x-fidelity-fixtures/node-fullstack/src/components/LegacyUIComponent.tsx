import React, { useState } from 'react';
// Using antd (legacy) without MUI migration - triggers lowMigrationToNewComponentLib rule
import { Button, Card, Input, Select, Table, Modal, Form, DatePicker, Checkbox } from 'antd';
import { SearchOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';

const { Option } = Select;
const { TextArea } = Input;

// This component uses only antd components without any @mui/material imports
// This should trigger the lowMigrationToNewComponentLib-global rule

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

const LegacyUIComponent: React.FC = () => {
  const [users, setUsers] = useState<UserData[]>([
    { id: '1', name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active' },
  ]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [form] = Form.useForm();

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <span>{text}</span>,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Select value={role} style={{ width: 120 }}>
          <Option value="admin">Admin</Option>
          <Option value="user">User</Option>
          <Option value="guest">Guest</Option>
        </Select>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Checkbox checked={status === 'active'}>
          {status}
        </Checkbox>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: UserData) => (
        <Button 
          type="link" 
          onClick={() => {
            setSelectedUser(record);
            setModalVisible(true);
          }}
        >
          Edit
        </Button>
      ),
    },
  ];

  const handleSubmit = (values: any) => {
    console.log('Form values:', values);
    setModalVisible(false);
    form.resetFields();
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card title="Legacy UI Component (Antd Only)" extra={<SettingOutlined />}>
        <div style={{ marginBottom: '16px' }}>
          <Input
            placeholder="Search users..."
            prefix={<SearchOutlined />}
            style={{ width: 300, marginRight: '16px' }}
          />
          <Button type="primary" icon={<UserOutlined />}>
            Add User
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />

        <Modal
          title="Edit User"
          visible={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={selectedUser || {}}
          >
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please input the name!' }]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please input the email!' },
                { type: 'email', message: 'Please enter a valid email!' }
              ]}
            >
              <Input />
            </Form.Item>
            
            <Form.Item name="role" label="Role">
              <Select>
                <Option value="admin">Admin</Option>
                <Option value="user">User</Option>
                <Option value="guest">Guest</Option>
              </Select>
            </Form.Item>
            
            <Form.Item name="bio" label="Bio">
              <TextArea rows={4} />
            </Form.Item>
            
            <Form.Item name="startDate" label="Start Date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            
            <Form.Item>
              <Button type="primary" htmlType="submit" style={{ marginRight: '8px' }}>
                Save
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                Cancel
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  );
};

export default LegacyUIComponent; 