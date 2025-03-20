import React, { useEffect, useRef } from 'react';
import { Card, Typography, Empty, Table } from 'antd';
import { useAppStore } from '../store/appStore';
import './VisualizationPane.css';

const { Title, Text } = Typography;

const VisualizationPane: React.FC = () => {
  const { 
    executionSteps, 
    currentStepIndex, 
    executionState,
    error
  } = useAppStore();
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Get the current step being visualized
  const currentStep = executionSteps[currentStepIndex];
  
  // Scroll visualization into view when step changes
  useEffect(() => {
    if (containerRef.current && currentStepIndex >= 0) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentStepIndex]);
  
  // Helper function to generate columns for the Table component
  const generateColumns = (data: any) => {
    if (!data || !data[0] || !data[0].columns) {
      return [];
    }
    
    return data[0].columns.map((column: string, index: number) => ({
      title: column,
      dataIndex: `col_${index}`,
      key: `col_${index}`,
      ellipsis: true,
      width: calculateColumnWidth(column, data[0].values, index),
      render: (text: any) => {
        // Special rendering for the condition result column (used in WHERE step)
        if (column === '_condition_result' && (text === 1 || text === 0)) {
          return text === 1 ? '✓' : '✗';
        }
        
        // Format null values
        if (text === null || text === undefined) {
          return <span className="null-value">NULL</span>;
        }
        
        // Truncate long text values
        if (typeof text === 'string' && text.length > 50) {
          return (
            <span title={text}>
              {text.substring(0, 50)}...
            </span>
          );
        }
        
        return text;
      }
    }));
  };
  
  // Helper to calculate reasonable column widths
  const calculateColumnWidth = (column: string, values: any[], index: number): number => {
    // Give condition result column minimum width
    if (column === '_condition_result') return 60;
    
    // Base width on column name length - at least 80px
    const columnNameWidth = Math.max(column.length * 10, 80);
    
    // Check a sample of values to determine a reasonable width
    let maxValueWidth = 0;
    if (values && values.length > 0) {
      // Sample up to 10 rows
      const sampleSize = Math.min(values.length, 10);
      for (let i = 0; i < sampleSize; i++) {
        const value = values[i][index];
        if (value !== null && value !== undefined) {
          const valueString = String(value);
          // Rough estimate of width based on content length
          const valueWidth = Math.min(valueString.length * 8, 300);
          maxValueWidth = Math.max(maxValueWidth, valueWidth);
        }
      }
    }
    
    // Use the larger of column name width or value width, but cap at 300px
    return Math.min(Math.max(columnNameWidth, maxValueWidth), 300);
  };
  
  // Helper function to generate data source for the Table component
  const generateDataSource = (data: any) => {
    if (!data || !data[0] || !data[0].values) {
      return [];
    }
    
    return data[0].values.map((row: any[], rowIndex: number) => {
      const rowData: { [key: string]: any } = { key: `row_${rowIndex}` };
      row.forEach((cell, cellIndex) => {
        rowData[`col_${cellIndex}`] = cell;
      });
      return rowData;
    });
  };
  
  // Render different content based on execution state
  const renderContent = () => {
    if (error) {
      return (
        <div className="error-container">
          <Text type="danger">Error: {error}</Text>
        </div>
      );
    }
    
    if (executionState === 'idle' || currentStepIndex < 0) {
      return (
        <Empty 
          description="Run a query to visualize its execution" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      );
    }
    
    // Render the table with step data
    if (currentStep && currentStep.data) {
      const columns = generateColumns(currentStep.data);
      const dataSource = generateDataSource(currentStep.data);
      
      return (
        <div>
          <div className="step-header">
            <Title level={4} className={`step-type step-type-${currentStep.type.toLowerCase().replace(/\s+/g, '-')}`}>
              {currentStep.type}
            </Title>
            <Text>{currentStep.description}</Text>
          </div>
          
          <div className="table-container" id={`step-${currentStepIndex}-visualization`}>
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              scroll={{ x: 'max-content', y: 300 }}
              bordered
              size="small"
              rowClassName={(record, index) => {
                // Add row identifier for animation targeting
                return `table-row ${currentStep.type === 'WHERE' ? 
                  (record[`col_${columns.length - 1}`] === 1 ? 'matched-row' : 'filtered-row') : ''}`;
              }}
            />
          </div>
        </div>
      );
    }
    
    return <Empty description="No data available for this step" />;
  };
  
  return (
    <Card className="visualization-pane-card" ref={containerRef}>
      <Title level={4}>SQL Execution Visualization</Title>
      {renderContent()}
    </Card>
  );
};

export default VisualizationPane; 