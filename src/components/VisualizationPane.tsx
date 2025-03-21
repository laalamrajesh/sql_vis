import React, { useEffect, useRef, useState } from 'react';
import { Card, Typography, Empty, Table, Row, Col, Divider, Alert } from 'antd';
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
  const [currentRowIndex, setCurrentRowIndex] = useState<number | null>(null);
  const [evaluatedRows, setEvaluatedRows] = useState<{[key: number]: boolean}>({});
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
  // Get the current step being visualized
  const currentStep = executionSteps[currentStepIndex];
  
  // Get the previous step (if exists)
  const previousStep = currentStepIndex > 0 ? executionSteps[currentStepIndex - 1] : null;
  
  // Determine if we're transitioning from FROM to WHERE
  const isFromToWhereTransition = 
    previousStep?.type === 'FROM' && currentStep?.type === 'WHERE';
  
  // Reset animation state when steps change
  useEffect(() => {
    if (isFromToWhereTransition) {
      setCurrentRowIndex(null);
      setEvaluatedRows({});
      setAnimationInProgress(false);
    }
  }, [currentStepIndex]);
  
  // Animation for FROM to WHERE transition
  const startFromToWhereAnimation = () => {
    if (!previousStep || !currentStep || animationInProgress) return;
    
    setAnimationInProgress(true);
    setCurrentRowIndex(0);
    setEvaluatedRows({});
    
    // The rest of the animation will be driven by the useEffect below
  };
  
  // Process rows one by one
  useEffect(() => {
    if (!isFromToWhereTransition || currentRowIndex === null || !animationInProgress) return;
    
    // Get the WHERE data to determine if the row passes or fails
    const whereData = generateDataSource(currentStep?.data || []);
    if (!whereData || whereData.length === 0) return;
    
    // Get maximum row index
    const maxRows = whereData.length;
    
    // If we've processed all rows, end the animation
    if (currentRowIndex >= maxRows) {
      setAnimationInProgress(false);
      setCurrentRowIndex(null);
      return;
    }
    
    // Get the condition result for this row (1 = pass, 0 = fail)
    const columns = generateColumns(currentStep?.data || []);
    const conditionIndex = columns.length - 1;
    const rowPasses = whereData[currentRowIndex][`col_${conditionIndex}`] === 1;
    
    // Simple scroll behavior - get the FROM table container
    const scrollFromTableToRow = () => {
      const tableBody = document.querySelector('.previous-step-container .ant-table-body');
      if (!tableBody) return;
      
      // Calculate the average row height (assuming all rows are similar height)
      const rowHeight = tableBody.scrollHeight / whereData.length;
      
      // Calculate position to scroll to (accounting for header)
      const scrollPosition = currentRowIndex * rowHeight;
      
      // Simple scroll
      tableBody.scrollTop = scrollPosition;
    };
    
    // Scroll FROM table to current row
    scrollFromTableToRow();
    
    // Update the evaluated rows after a delay for the animation
    const evaluationTimeout = setTimeout(() => {
      // Store result in state
      setEvaluatedRows(prev => ({
        ...prev,
        [currentRowIndex]: rowPasses
      }));
      
      // Move to the next row after a delay
      const nextRowTimeout = setTimeout(() => {
        setCurrentRowIndex(prev => (prev !== null ? prev + 1 : null));
      }, 1500); // Longer delay to make animation more visible
      
      return () => clearTimeout(nextRowTimeout);
    }, 1800); // Longer delay for evaluation
    
    return () => clearTimeout(evaluationTimeout);
  }, [currentRowIndex, animationInProgress, currentStep, isFromToWhereTransition]);
  
  // No automatic scrolling when step changes - removing this effect
  
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
  
  // Filter the WHERE data to only show rows that passed evaluation
  const getWhereTableData = () => {
    if (!currentStep || !isFromToWhereTransition) {
      // When not in transition or animation is complete, show all data
      return generateDataSource(currentStep?.data || []);
    }
    
    // Initially show all passing rows, but during animation only show processed ones
    const allData = generateDataSource(currentStep.data);
    
    if (!animationInProgress) {
      // Before animation starts, show all rows that would pass the condition
      return allData.filter((row: any) => {
        const lastColumnIndex = Object.keys(row).length - 2; // -2 because of key and 0-indexing
        return row[`col_${lastColumnIndex}`] === 1;
      });
    }
    
    // During animation, only show rows that have been evaluated and passed
    return allData.filter((_: any, index: number) => {
      return evaluatedRows[index] === true;
    });
  };
  
  // Render the condition evaluation overlay when a row is being processed
  const renderConditionEvaluation = () => {
    if (!isFromToWhereTransition || !animationInProgress) {
      return null;
    }
    
    // Get the WHERE condition from the step description
    const whereCondition = currentStep?.description?.replace('Filter rows with condition: ', '') || '';
    
    // Get evaluation result if available
    const evaluationResult = currentRowIndex !== null && currentRowIndex in evaluatedRows 
      ? evaluatedRows[currentRowIndex] 
      : null;
    
    return (
      <div className="evaluation-info">
        <div className="condition-box">
          <div className="condition-expression">
            <Text strong>WHERE {whereCondition}</Text>
          </div>
          <div className={`condition-result ${evaluationResult !== null 
            ? (evaluationResult ? 'condition-pass' : 'condition-fail') 
            : 'condition-pending'}`}>
            {evaluationResult !== null 
              ? (evaluationResult ? 'TRUE ✓' : 'FALSE ✗') 
              : '\u00A0'} {/* Non-breaking space to maintain height */}
          </div>
        </div>
      </div>
    );
  };
  
  // Render a specific step's data table
  const renderStepTable = (step: any, stepIndex: number, isCurrentStep: boolean = false) => {
    if (!step || !step.data) {
      return <Empty description="No data available for this step" />;
    }
    
    const columns = generateColumns(step.data);
    
    // Determine which data to show
    let dataSource;
    
    if (isCurrentStep && step.type === 'WHERE' && isFromToWhereTransition) {
      // For WHERE table, only show rows that passed
      dataSource = getWhereTableData();
    } else if (!isCurrentStep && step.type === 'WHERE' && currentStep?.type !== 'FROM') {
      // For WHERE table shown as a previous step (left side), only show rows that passed the condition
      const allData = generateDataSource(step.data);
      const lastColumnIndex = columns.length - 1;
      
      // Filter to only show rows that passed the WHERE condition
      dataSource = allData.filter((row: any) => row[`col_${lastColumnIndex}`] === 1);
    } else {
      dataSource = generateDataSource(step.data);
    }
    
    // Hide condition result column in steps after WHERE
    let displayColumns = [...columns];
    
    // Hide condition result column in all WHERE tables
    if ((step.type === 'WHERE' || (step.type !== 'FROM' && step.type !== 'WHERE')) && columns.length > 0) {
      // Check if last column is condition result
      const lastCol = columns[columns.length - 1];
      if (lastCol.title === '_condition_result') {
        displayColumns = columns.slice(0, -1);
      }
    }
    
    // For WHERE step displayed as previous step (after animation is done),
    // hide the condition result column
    if (!isCurrentStep && step.type === 'WHERE' && currentStep?.type !== 'FROM') {
      if (columns.length > 0 && columns[columns.length - 1].title === '_condition_result') {
        displayColumns = columns.slice(0, -1);
      }
    }
    
    const showConditionInfo = !isCurrentStep && step.type === 'FROM' && isFromToWhereTransition && animationInProgress;
    
    return (
      <div>
        <div className="step-header">
          <Title level={5} className={`step-type step-type-${step.type.toLowerCase().replace(/\s+/g, '-')}`}>
            {step.type}
          </Title>
          <Text>{step.description}</Text>
        </div>
        
        {showConditionInfo && renderConditionEvaluation()}
        
        <div className="table-container" id={`step-${stepIndex}-visualization`}>
          <Table
            columns={displayColumns}
            dataSource={dataSource}
            pagination={false}
            scroll={{ x: 'max-content', y: 400 }}
            bordered
            size="small"
            rowKey={(record) => record.key}
            rowClassName={(record, index) => {
              let className = `table-row ${isCurrentStep ? 'current-step' : 'previous-step'}`;
              
              // For FROM table during animation
              if (!isCurrentStep && step.type === 'FROM' && isFromToWhereTransition) {
                // Highlight the current row being evaluated
                if (index === currentRowIndex && animationInProgress) {
                  className += ' row-evaluating';
                }
                
                // Mark rows that have been evaluated
                if (index in evaluatedRows) {
                  className += evaluatedRows[index] ? ' row-passed' : ' row-failed';
                }
              }
              
              // For WHERE table
              if (isCurrentStep && step.type === 'WHERE') {
                // Add animation for newly added rows
                if (animationInProgress && index === Object.keys(evaluatedRows).filter(key => evaluatedRows[Number(key)]).length - 1) {
                  className += ' row-entering';
                }
                
                // Show if row is matched or filtered
                const lastColumnIndex = columns.length - 1;
                const isMatched = record[`col_${lastColumnIndex}`] === 1;
                className += isMatched ? ' matched-row' : ' filtered-row';
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
      const transitionControls = isFromToWhereTransition && !animationInProgress ? (
        <div className="animation-controls">
          <Alert
            message="Click to see the WHERE condition evaluation process"
            type="info"
            showIcon
            action={
              <button 
                className="start-animation-btn" 
                onClick={startFromToWhereAnimation}
              >
                Start Animation
              </button>
            }
          />
        </div>
      ) : null;
      
      return (
        <div>
          {renderTransitionExplanation(previousStep, currentStep)}
          {transitionControls}
          
          <Row gutter={16} className={`visualization-row ${isFromToWhereTransition ? 'from-to-where-transition' : ''}`}>
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