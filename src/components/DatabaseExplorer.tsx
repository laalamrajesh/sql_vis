import React from 'react';
import { Empty, Tree, Typography } from 'antd';
import { 
  DatabaseOutlined, 
  TableOutlined, 
  FieldStringOutlined,
  FieldNumberOutlined,
  FieldTimeOutlined
} from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import './DatabaseExplorer.css';

const { Title } = Typography;

const DatabaseExplorer: React.FC = () => {
  const { 
    databaseName, 
    tables, 
    tableSchemas, 
    selectedTable, 
    setSelectedTable 
  } = useAppStore();

  if (!databaseName) {
    return (
      <div className="database-explorer">
        <Title level={4}>Database Explorer</Title>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
          description="No database loaded. Please upload a SQLite database file." 
        />
      </div>
    );
  }

  // Get the appropriate icon for each column type
  const getColumnTypeIcon = (type: string) => {
    const lowercaseType = type.toLowerCase();
    
    if (lowercaseType.includes('int') || lowercaseType.includes('real') || lowercaseType.includes('double') || lowercaseType.includes('float')) {
      return <FieldNumberOutlined />;
    } else if (lowercaseType.includes('date') || lowercaseType.includes('time')) {
      return <FieldTimeOutlined />;
    } else {
      return <FieldStringOutlined />;
    }
  };

  // Build the tree data for displaying tables and columns
  const treeData = tables.map(tableName => {
    const columns = tableSchemas[tableName] || [];
    
    return {
      key: `table-${tableName}`,
      title: tableName,
      icon: <TableOutlined />,
      children: columns.map(column => ({
        key: `${tableName}-${column.name}`,
        title: `${column.name} (${column.type})`,
        icon: getColumnTypeIcon(column.type),
        isLeaf: true
      }))
    };
  });

  // Handler for selecting a table
  const handleSelect = (selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0) {
      const key = selectedKeys[0].toString();
      
      // Check if it's a table or a column
      if (key.startsWith('table-')) {
        const tableName = key.replace('table-', '');
        setSelectedTable(tableName);
      }
    }
  };

  return (
    <div className="database-explorer">
      <Title level={4}>Database Explorer</Title>
      <div className="database-info">
        <DatabaseOutlined className="database-icon" />
        <span className="database-name">{databaseName}</span>
      </div>
      <Tree
        showIcon
        defaultExpandAll
        onSelect={handleSelect}
        selectedKeys={selectedTable ? [`table-${selectedTable}`] : []}
        treeData={treeData}
        className="schema-tree"
      />
    </div>
  );
};

export default DatabaseExplorer; 