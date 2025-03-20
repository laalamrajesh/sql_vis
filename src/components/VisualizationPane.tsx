import React, { useEffect, useRef } from 'react';
import { Card, Typography, Empty, Table, Row, Col, Divider } from 'antd';
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
  
  // Get the previous step (if exists)
  const previousStep = currentStepIndex > 0 ? executionSteps[currentStepIndex - 1] : null;
  
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
  
  // Render a specific step's data table
  const renderStepTable = (step: any, stepIndex: number, isCurrentStep: boolean = false) => {
    if (!step || !step.data) {
      return <Empty description="No data available for this step" />;
    }
    
    const columns = generateColumns(step.data);
    const dataSource = generateDataSource(step.data);
    
    return (
      <div>
        <div className="step-header">
          <Title level={5} className={`step-type step-type-${step.type.toLowerCase().replace(/\s+/g, '-')}`}>
            {step.type}
          </Title>
          <Text>{step.description}</Text>
        </div>
        
        <div className="table-container" id={`step-${stepIndex}-visualization`}>
          <Table
            columns={columns}
            dataSource={dataSource}
            pagination={false}
            scroll={{ x: 'max-content', y: 250 }}
            bordered
            size="small"
            rowClassName={(record, index) => {
              // Add row identifier for animation targeting
              const className = `table-row ${isCurrentStep ? 'current-step' : 'previous-step'}`;
              
              if (step.type === 'WHERE') {
                return `${className} ${record[`col_${columns.length - 1}`] === 1 ? 'matched-row' : 'filtered-row'}`;
              }
              
              return className;
            }}
          />
        </div>
      </div>
    );
  };
  
  // Function to render transition explanation based on step types
  const renderTransitionExplanation = (fromStep: any, toStep: any) => {
    if (!fromStep || !toStep) return null;
    
    const fromType = fromStep.type;
    const toType = toStep.type;
    
    let explanation = "";
    
    // Determine explanation based on transition type
    if (fromType === 'FROM' && toType === 'WHERE') {
      explanation = "Filtering rows from the table based on the WHERE condition";
    } else if (fromType === 'FROM' && toType === 'JOIN') {
      explanation = "Combining data from multiple tables based on the JOIN condition";
    } else if (fromType === 'WHERE' && toType === 'JOIN') {
      explanation = "Joining filtered data with another table";
    } else if ((fromType === 'FROM' || fromType === 'WHERE' || fromType === 'JOIN') && toType === 'GROUP BY') {
      explanation = "Grouping rows with the same values in specified columns";
    } else if (toType === 'ORDER BY') {
      explanation = "Sorting the result set based on specified columns";
    } else if (toType === 'LIMIT') {
      explanation = "Restricting the number of rows in the final result";
    } else if (toType === 'SELECT') {
      explanation = "Selecting only specified columns for the final output";
    } else {
      explanation = `Transition from ${fromType} to ${toType}`;
    }
    
    return (
      <div className="transition-explanation">
        <Divider orientation="center">
          <Text strong>{fromType} → {toType}</Text>
        </Divider>
        <Text>{explanation}</Text>
      </div>
    );
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
    
    // If we have both a previous and current step, show side by side
    if (previousStep && currentStep) {
      return (
        <div>
          {renderTransitionExplanation(previousStep, currentStep)}
          
          <Row gutter={16} className="visualization-row">
            <Col xs={24} md={12} className="previous-step-col">
              <div className="step-container previous-step-container">
                {renderStepTable(previousStep, currentStepIndex - 1)}
              </div>
            </Col>
            <Col xs={24} md={12} className="current-step-col">
              <div className="step-container current-step-container">
                {renderStepTable(currentStep, currentStepIndex, true)}
              </div>
            </Col>
          </Row>
        </div>
      );
    }
    
    // If we're at the first step, just show the current step
    return (
      <div className="single-step-container">
        {renderStepTable(currentStep, currentStepIndex, true)}
      </div>
    );
  };
  
  return (
    <Card className="visualization-pane-card" ref={containerRef}>
      <Title level={4}>SQL Execution Visualization</Title>
      {renderContent()}
    </Card>
  );
};

export default VisualizationPane; 