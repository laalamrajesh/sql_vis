import React from 'react';
import { Card, Tree, Typography } from 'antd';
import { DatabaseOutlined, TableOutlined, FieldStringOutlined, FieldNumberOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import './DatabaseExplorer.css';

const { Title } = Typography;

const DatabaseExplorer: React.FC = () => {
  const { tables } = useAppStore();
  
  // Generate tree data for the Tree component
  const treeData = tables.map(table => ({
    title: table.name,
    key: `table-${table.name}`,
    icon: <TableOutlined />,
    children: table.columns.map(column => ({
      title: `${column.name} (${column.type})`,
      key: `column-${table.name}-${column.name}`,
      icon: getColumnIcon(column.type),
      isLeaf: true
    }))
  }));
  
  // Helper function to determine column icon based on type
  function getColumnIcon(type: string) {
    const lowercaseType = type.toLowerCase();
    if (lowercaseType.includes('int') || lowercaseType.includes('float') || lowercaseType.includes('double') || lowercaseType.includes('decimal')) {
      return <FieldNumberOutlined />;
    } else if (lowercaseType.includes('date') || lowercaseType.includes('time')) {
      return <FieldTimeOutlined />;
    } else {
      return <FieldStringOutlined />;
    }
  }
  
  return (
    <Card className="database-explorer-card">
      <Title level={4}>Database Schema</Title>
      
      {tables.length > 0 ? (
        <Tree
          showIcon
          defaultExpandAll
          treeData={[
            {
              title: 'Database',
              key: 'database',
              icon: <DatabaseOutlined />,
              children: treeData
            }
          ]}
        />
      ) : (
        <p>No tables found in the database.</p>
      )}
    </Card>
  );
};

export default DatabaseExplorer; 