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
  
  // State for ORDER BY animation
  const [sortingInProgress, setSortingInProgress] = useState(false);
  const [currentSortingRow, setCurrentSortingRow] = useState<number | null>(null);
  const [sortedRows, setSortedRows] = useState<number[]>([]);
  
  // State for LIMIT animation
  const [limitingInProgress, setLimitingInProgress] = useState(false);
  const [currentLimitRow, setCurrentLimitRow] = useState<number | null>(null);
  const [limitedRows, setLimitedRows] = useState<number[]>([]);
  
  // State for SELECT animation
  const [selectingInProgress, setSelectingInProgress] = useState(false);
  const [currentSelectColumn, setCurrentSelectColumn] = useState<number | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<number[]>([]);
  
  // Get the current step being visualized
  const currentStep = executionSteps[currentStepIndex];
  
  // Get the previous step (if exists)
  const previousStep = currentStepIndex > 0 ? executionSteps[currentStepIndex - 1] : null;
  
  // Determine if we're transitioning between different steps
  const isFromToWhereTransition = previousStep?.type === 'FROM' && currentStep?.type === 'WHERE';
  const isWhereToOrderByTransition = previousStep?.type === 'WHERE' && currentStep?.type === 'ORDER BY';
  const isOrderByToLimitTransition = previousStep?.type === 'ORDER BY' && currentStep?.type === 'LIMIT';
  const isLimitToSelectTransition = previousStep?.type === 'LIMIT' && currentStep?.type === 'SELECT';
  
  // Reset animation state when steps change
  useEffect(() => {
    if (isFromToWhereTransition) {
      setCurrentRowIndex(null);
      setEvaluatedRows({});
      setAnimationInProgress(false);
    }
    
    if (isWhereToOrderByTransition) {
      setCurrentSortingRow(null);
      setSortedRows([]);
      setSortingInProgress(false);
    }
    
    if (isOrderByToLimitTransition) {
      setCurrentLimitRow(null);
      setLimitedRows([]);
      setLimitingInProgress(false);
    }
    
    if (isLimitToSelectTransition) {
      setCurrentSelectColumn(null);
      setSelectedColumns([]);
      setSelectingInProgress(false);
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
  
  // Animation for WHERE to ORDER BY transition
  const startWhereToOrderByAnimation = () => {
    if (!previousStep || !currentStep || sortingInProgress) return;
    
    setSortingInProgress(true);
    
    // Get WHERE data (already filtered)
    const whereData = generateDataSource(previousStep?.data || []);
    
    // Filter out rows that didn't pass WHERE
    const filteredWhereData = whereData.filter((row: any) => {
      const columns = generateColumns(previousStep?.data || []);
      const conditionIndex = columns.length - 1;
      return row[`col_${conditionIndex}`] === 1;
    });
    
    // Get the ORDER BY info
    const orderByInfo = currentStep?.metadata?.orderByColumns || 'age DESC';
    const [orderByColumn, orderDirection] = orderByInfo.split(' ');
    const isDescending = orderDirection === 'DESC';
    
    // Find the column index for the ORDER BY column
    const orderColumnIndex = previousStep?.data[0]?.columns.findIndex(
      (col: string) => col.toLowerCase() === orderByColumn.toLowerCase()
    );
    
    if (orderColumnIndex === -1) {
      console.error('Order by column not found');
      setSortingInProgress(false);
      return;
    }
    
    // Create row references with original indices
    const rowsToSort = filteredWhereData.map((row: any, index: number) => ({
      originalIndex: index,
      value: row[`col_${orderColumnIndex}`],
    }));
    
    // Sort rows based on the order by column
    rowsToSort.sort((a: {originalIndex: number, value: any}, b: {originalIndex: number, value: any}) => {
      if (isDescending) {
        return b.value > a.value ? 1 : -1;
      } else {
        return a.value > b.value ? 1 : -1;
      }
    });
    
    // Get original indices in sorted order
    const sortedIndices = rowsToSort.map((row: {originalIndex: number, value: any}) => row.originalIndex);
    
    // Initialize with first row
    setCurrentSortingRow(0);
    setSortedRows([]);
    
    // Start animation to sequentially add rows in sorted order
    const animateRows = (index: number) => {
      if (index >= sortedIndices.length) {
        // Animation complete
        setTimeout(() => {
          setSortingInProgress(false);
          setCurrentSortingRow(null);
        }, 500);
        return;
      }
      
      // Update state to show current row being processed
      setCurrentSortingRow(sortedIndices[index]);
      
      // Add row to sorted list after a delay
      setTimeout(() => {
        setSortedRows(prev => [...prev, sortedIndices[index]]);
        
        // Move to next row after another delay
        setTimeout(() => {
          animateRows(index + 1);
        }, 750); // Standardized delay
      }, 750); // Standardized delay for highlighting
    };
    
    // Start the animation sequence
    animateRows(0);
  };
  
  // Animation for ORDER BY to LIMIT transition
  const startOrderByToLimitAnimation = () => {
    if (!previousStep || !currentStep || limitingInProgress) return;
    
    setLimitingInProgress(true);
    
    // Get the ORDER BY data (already sorted)
    const orderByData = generateDataSource(previousStep?.data || []);
    if (!orderByData || orderByData.length === 0) {
      setLimitingInProgress(false);
      return;
    }
    
    // Get the LIMIT value and offset (if any)
    const limitValue = parseInt(currentStep?.metadata?.limit || '5');
    const offsetValue = parseInt(currentStep?.metadata?.offset || '0');
    
    // First highlight all rows in the left table (marking included/excluded)
    setCurrentLimitRow(null);
    setLimitedRows([]);
    
    // Highlight all rows that will be included in the LIMIT
    const includedRows: number[] = [];
    for (let i = offsetValue; i < Math.min(offsetValue + limitValue, orderByData.length); i++) {
      includedRows.push(i);
    }
    
    // Show which rows are included and excluded in the source table
    setTimeout(() => {
      // Apply the row-limiting class to all rows in the source table
      const orderByTable = document.querySelector('.order-by-table .ant-table-body');
      if (orderByTable) {
        orderByTable.scrollTop = 0; // Scroll to top to make included rows visible
      }
      
      // Update state to mark all included rows
      setLimitedRows(includedRows);
      
      // Finish the animation after a short delay
      setTimeout(() => {
        setLimitingInProgress(false);
      }, 1000);
    }, 500);
  };
  
  // Animation for LIMIT to SELECT transition
  const startLimitToSelectAnimation = () => {
    if (!previousStep || !currentStep || selectingInProgress) return;
    
    setSelectingInProgress(true);
    
    // Get the LIMIT data (already limited)
    const limitData = generateDataSource(previousStep?.data || []);
    if (!limitData || limitData.length === 0) {
      setSelectingInProgress(false);
      return;
    }
    
    // Get columns from SELECT clause
    const selectColumns = currentStep?.metadata?.selectColumns?.split(',').map((col: string) => col.trim()) || [];
    
    // Find column indices for the selected columns
    const columnIndices: number[] = [];
    const allColumns = previousStep?.data[0]?.columns || [];
    
    selectColumns.forEach((selectCol: string) => {
      const index = allColumns.findIndex((col: string) => col.toLowerCase() === selectCol.toLowerCase());
      if (index !== -1) {
        columnIndices.push(index);
      }
    });
    
    if (columnIndices.length === 0) {
      console.error('No matching columns found for SELECT');
      setSelectingInProgress(false);
      return;
    }
    
    // Start with empty selected columns
    setSelectedColumns([]);
    
    // Animation to sequentially highlight and select columns
    const animateColumns = (index: number) => {
      if (index >= columnIndices.length) {
        // Animation complete
        setTimeout(() => {
          setSelectingInProgress(false);
          setCurrentSelectColumn(null);
        }, 500);
        return;
      }
      
      // Update state to show current column being processed
      setCurrentSelectColumn(columnIndices[index]);
      
      // Add column to selected set after a delay
      setTimeout(() => {
        setSelectedColumns(prev => [...prev, columnIndices[index]]);
        
        // Move to next column after another delay
        setTimeout(() => {
          animateColumns(index + 1);
        }, 1500);
      }, 1500);
    };
    
    // Start the animation sequence
    animateColumns(0);
  };
  
  // Process rows one by one for FROM to WHERE
  useEffect(() => {
    if (!isFromToWhereTransition || currentRowIndex === null || !animationInProgress) return;
    
    // Get data for both FROM and WHERE tables
    const fromData = generateDataSource(previousStep?.data || []);
    const whereData = generateDataSource(currentStep?.data || []);
    
    if (!fromData || fromData.length === 0 || !whereData || whereData.length === 0) return;
    
    // Get maximum row index
    const maxRows = fromData.length;
    
    // If we've processed all rows, end the animation
    if (currentRowIndex >= maxRows) {
      setAnimationInProgress(false);
      setCurrentRowIndex(null);
      return;
    }
    
    // Get the condition result for this row (1 = pass, 0 = fail)
    const conditionIndex = currentStep?.data[0]?.columns.findIndex(col => col === '_condition_result');
    
    // Determine if the current row passes the condition
    let rowPasses = false;
    if (conditionIndex !== -1 && whereData[currentRowIndex]) {
      rowPasses = whereData[currentRowIndex][`col_${conditionIndex}`] === 1;
    }
    
    // Simple scroll behavior - get the FROM table container
    const scrollFromTableToRow = () => {
      const tableBody = document.querySelector('.previous-step-container .ant-table-body');
      if (!tableBody) return;
      
      // Calculate the average row height (assuming all rows are similar height)
      const rowHeight = tableBody.scrollHeight / fromData.length;
      
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
      }, 750); // Standardized delay
      
      return () => clearTimeout(nextRowTimeout);
    }, 750); // Standardized delay for evaluation
    
    return () => clearTimeout(evaluationTimeout);
  }, [currentRowIndex, animationInProgress, currentStep, previousStep, isFromToWhereTransition]);
  
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
    if (!currentStep || !isFromToWhereTransition || !previousStep) {
      // When not in transition or animation is complete, show all data
      return generateDataSource(currentStep?.data || []);
    }
    
    // Get all data for both tables
    const fromData = generateDataSource(previousStep.data || []);
    const whereData = generateDataSource(currentStep.data || []);
    
    // Get the condition result column index
    const conditionIndex = currentStep.data[0]?.columns.findIndex(col => col === '_condition_result');
    
    if (!animationInProgress) {
      // Before animation starts, show filtered data based on condition
      if (conditionIndex !== -1) {
        // Show only rows that passed the condition
        return whereData.filter(row => row[`col_${conditionIndex}`] === 1);
      }
      return whereData;
    }
    
    // During animation - include ALL rows that have been evaluated (both pass and fail)
    // This ensures immediate visual feedback for each evaluation
    const evaluatedIndices = Object.keys(evaluatedRows).map(index => parseInt(index));
    
    // Return data for all evaluated rows, but mark them as passing/failing using CSS classes
    return whereData.filter((_, index) => evaluatedIndices.includes(index));
  };
  
  // Get the data for ORDER BY table
  const getOrderByTableData = () => {
    if (!currentStep || !isWhereToOrderByTransition || !previousStep) {
      // When not in transition, just show the data
      return generateDataSource(currentStep?.data || []);
    }
    
    // Get the filtered data from WHERE step
    const whereData = generateDataSource(previousStep?.data || []);
    
    // Filter out rows that didn't pass WHERE
    const conditionIndex = previousStep?.data[0]?.columns.findIndex(
      (col: string) => col === '_condition_result'
    );
    
    // Get only rows that passed the WHERE condition
    const filteredWhereData = conditionIndex !== -1 ? 
      whereData.filter((row: any) => row[`col_${conditionIndex}`] === 1) : 
      whereData;
    
    // Get the ORDER BY info
    const orderByInfo = currentStep?.metadata?.orderByColumns || 'age DESC';
    const [orderByColumn, orderDirection] = orderByInfo.split(' ');
    const isDescending = orderDirection === 'DESC';
    
    // Find the column index for the ORDER BY column
    const orderColumnIndex = previousStep?.data[0]?.columns.findIndex(
      (col: string) => col.toLowerCase() === orderByColumn.toLowerCase()
    );
    
    if (orderColumnIndex === -1) {
      console.error('Order by column not found');
      return filteredWhereData;
    }
    
    // Create row references with original indices
    const rowsToSort = filteredWhereData.map((row: any, index: number) => ({
      originalIndex: index,
      value: row[`col_${orderColumnIndex}`],
      row: row // Keep reference to the original row
    }));
    
    // Sort rows based on the order by column
    const sortedRowObjects = [...rowsToSort].sort((a: any, b: any) => {
      if (isDescending) {
        return b.value > a.value ? 1 : -1;
      } else {
        return a.value > b.value ? 1 : -1;
      }
    });
    
    // If we're not in animation mode, return fully sorted data
    if (!sortingInProgress) {
      // Return sorted data immediately
      return sortedRowObjects.map(item => item.row);
    }
    
    // During animation, only show the rows that have been processed so far
    // Convert sortedRows indices to actual data objects
    const animatedSortedRows = sortedRows.map(originalIndex => {
      // Find the corresponding sorted row
      const sortedRow = sortedRowObjects.find(obj => obj.originalIndex === originalIndex);
      return sortedRow ? sortedRow.row : null;
    }).filter(row => row !== null);
    
    return animatedSortedRows;
  };
  
  // Helper to get data for the LIMIT table
  const getLimitTableData = () => {
    if (!previousStep || isLimitToSelectTransition) {
      return [];
    }
    
    const orderByData = generateDataSource(previousStep.data || []);
    
    // Get LIMIT parameters
    const limitValue = parseInt(currentStep?.metadata?.limit || '5');
    const offsetValue = parseInt(currentStep?.metadata?.offset || '0');
    
    // During animation or after, show all selected rows at once
    if (limitingInProgress || true) {
      return orderByData
        .filter((_, index: number) => index >= offsetValue && index < offsetValue + limitValue);
    }
  };
  
  // Helper to get data for the SELECT table
  const getSelectTableData = () => {
    if (!previousStep) {
      return [];
    }
    
    const limitData = generateDataSource(previousStep.data || []);
    console.log("SELECT DATA:", limitData); // Debug log
    console.log("Selected Columns:", selectedColumns); // Debug log
    
    // Get columns from SELECT clause
    const selectColumns = currentStep?.metadata?.selectColumns?.split(',').map((col: string) => col.trim()) || [];
    const allColumns = previousStep?.data[0]?.columns || [];
    console.log("SELECT Columns:", selectColumns); // Debug log
    console.log("All Columns:", allColumns); // Debug log
    
    // Find indices of selected columns
    const selectedIndices = selectColumns.map((selectCol: string) => {
      return allColumns.findIndex((col: string) => col.toLowerCase() === selectCol.toLowerCase());
    }).filter((index: number) => index !== -1);
    console.log("Selected Indices:", selectedIndices); // Debug log
    
    // During animation, show only the columns that have been selected so far
    if (selectingInProgress) {
      const result = limitData.map((row: any) => {
        const newRow = { ...row };
        
        // Keep original row key
        newRow.key = row.key;
        
        // Process all columns
        Object.keys(row).forEach(key => {
          if (key.startsWith('col_')) {
            const colIndex = parseInt(key.replace('col_', ''));
            
            // If this column hasn't been selected yet in the animation, set to null
            if (!selectedColumns.includes(colIndex)) {
              newRow[key] = null; // null will be rendered as "NULL" with special styling
            }
            // Otherwise keep the original value which is already in newRow from spread
          }
        });
        
        return newRow;
      });
      
      console.log("Animation Result:", result); // Debug log
      return result;
    }
    
    // After animation, show only the selected columns
    const result = limitData.map((row: any) => {
      const newRow = { ...row };
      
      // Keep original row key
      newRow.key = row.key;
      
      // For each column, remove it if it's not in the selected columns
      Object.keys(row).forEach(key => {
        if (key.startsWith('col_')) {
          const colIndex = parseInt(key.replace('col_', ''));
          if (!selectedIndices.includes(colIndex)) {
            delete newRow[key]; // Remove unselected columns
          }
        }
      });
      
      return newRow;
    });
    
    console.log("Final Result:", result); // Debug log
    return result;
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
  
  // Render the ORDER BY explanation during animation
  const renderOrderByInfo = () => {
    if (!isWhereToOrderByTransition || !sortingInProgress) {
      return null;
    }
    
    // Get the ORDER BY info from step description
    const orderByClause = currentStep?.description?.replace('Order results by: ', '') || '';
    
    return (
      <div className="evaluation-info">
        <div className="condition-box order-by-box">
          <div className="condition-expression">
            <Text strong>ORDER BY {orderByClause}</Text>
          </div>
          <div className="sort-direction">
            {orderByClause.includes('DESC') ? '↓ Descending' : '↑ Ascending'}
          </div>
        </div>
      </div>
    );
  };
  
  // Render the LIMIT explanation during animation
  const renderLimitInfo = () => {
    if (!currentStep || currentStep.type !== 'LIMIT') {
      return null;
    }
    
    const limitValue = parseInt(currentStep?.metadata?.limit || '5');
    const offsetValue = parseInt(currentStep?.metadata?.offset || '0');
    
    let message = `LIMIT ${limitValue}`;
    if (offsetValue > 0) {
      message = `LIMIT ${limitValue} OFFSET ${offsetValue}`;
    }
    
    // When animating, show which row is being evaluated
    if (limitingInProgress && currentLimitRow !== null) {
      const rowNumber = currentLimitRow;
      if (rowNumber < offsetValue) {
        message = `Skipping row ${rowNumber + 1} (before offset ${offsetValue})`;
      } else if (rowNumber < offsetValue + limitValue) {
        message = `Including row ${rowNumber + 1} (within limit of ${limitValue})`;
      } else {
        message = `Excluding row ${rowNumber + 1} (exceeds limit of ${limitValue})`;
      }
    }
    
    return (
      <Alert
        message={message}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  };
  
  // Render the SELECT explanation during animation
  const renderSelectInfo = () => {
    if (!currentStep || currentStep.type !== 'SELECT') {
      return null;
    }
    
    const selectColumns = currentStep?.metadata?.selectColumns?.split(',' ).map(col => col.trim()) || [];
    
    let message = `SELECT ${selectColumns.join(', ')}`;
    
    // When animating, show which column is being selected
    if (selectingInProgress && currentSelectColumn !== null) {
      const columnName = previousStep?.data[0]?.columns[currentSelectColumn] || '';
      message = `Selecting column: ${columnName}`;
    }
    
    return (
      <Alert
        message={message}
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
    );
  };
  
  // Helper for determining row class names based on row state
  const rowClassName = (record: any, index: number, tableIsCurrentStep: boolean): string => {
    let className = 'table-row';
    
    // FROM to WHERE transition
    if (isFromToWhereTransition) {
      if (!animationInProgress) {
        return className;
      }
      
      // In the FROM table
      if (!tableIsCurrentStep) {
        // Highlight the current row being evaluated
        if (index === currentRowIndex) {
          className += ' row-evaluating';
        }
        
        // Mark rows that have been evaluated
        if (index in evaluatedRows) {
          className += evaluatedRows[index] ? ' row-passed' : ' row-failed';
        }
      } 
      // In the WHERE table
      else {
        // Find if this row passes the condition
        // We need to find this from the original data
        if (currentStep?.data && currentStep.data[0]) {
          const conditionIndex = currentStep.data[0].columns.findIndex(
            (col: string) => col === '_condition_result'
          );
          
          if (conditionIndex !== -1) {
            const rowData = generateDataSource(currentStep.data)[index];
            const rowPasses = rowData && rowData[`col_${conditionIndex}`] === 1;
            
            // Show visual indication for both passed and failed rows
            if (index in evaluatedRows) {
              if (evaluatedRows[index]) {
                className += ' row-entering matched-row'; // Passed and should be added
              } else {
                className += ' row-entering filtered-row'; // Failed but still shown for visualization
              }
            } else if (rowPasses !== undefined) {
              className += rowPasses ? ' matched-row' : ' filtered-row';
            }
          }
        }
      }
    }
    
    // WHERE to ORDER BY transition
    else if (isWhereToOrderByTransition) {
      if (!sortingInProgress) {
        return className;
      }
      
      // In the WHERE table
      if (!tableIsCurrentStep) {
        // Highlight the row currently being processed for sorting
        if (index === currentSortingRow) {
          className += ' row-sorting';
        }
        
        // Mark rows that have been processed for sorting
        if (sortedRows.includes(index)) {
          className += ' row-sorted';
        }
      } 
      // In the ORDER BY table
      else {
        // Add animation for rows being added to the sorted table
        if (index < sortedRows.length) {
          className += ' row-entering-sorted';
        }
      }
    }
    
    // ORDER BY to LIMIT transition
    else if (isOrderByToLimitTransition) {
      if (!limitingInProgress) {
        return className;
      }
      
      // Get LIMIT parameters
      const limitValue = parseInt(currentStep?.metadata?.limit || '5');
      const offsetValue = parseInt(currentStep?.metadata?.offset || '0');
      
      // In the ORDER BY table
      if (!tableIsCurrentStep) {
        // Highlight the row currently being processed for limiting
        if (index === currentLimitRow) {
          className += ' row-limiting';
        }
        
        // Mark rows that have been included in the limit
        if (limitedRows.includes(index)) {
          className += ' row-limited';
        }
        // Mark rows that will be excluded
        else if (index < offsetValue || index >= offsetValue + limitValue) {
          className += ' row-excluded';
        }
      } 
      // In the LIMIT table
      else {
        // Rows are only shown if they are included in the limit
        // Add animation for rows being added to the limited table
        if (limitedRows.includes(index + offsetValue)) {
          className += ' row-entering-limited';
        }
      }
    }
    
    // LIMIT to SELECT transition
    else if (isLimitToSelectTransition) {
      if (!selectingInProgress) {
        return className;
      }
      
      // The row styling doesn't change much during column selection
      // but we can add a class to indicate the transition is happening
      className += ' during-column-selection';
    }
    
    return className;
  };
  
  // Helper to generate data for displayed tables
  const generateTableData = (step: any, isCurrentStep: boolean) => {
    if (!step || !step.data) {
      return [];
    }
    
    // For previous step tables (left side), show the final state of that step
    if (!isCurrentStep) {
      // FROM step when transitioning to WHERE - show original data
      if (step.type === 'FROM' && currentStep?.type === 'WHERE') {
        return generateDataSource(step.data);
      }
      
      // WHERE step when transitioning to ORDER BY - show only rows that passed the condition
      if (step.type === 'WHERE' && currentStep?.type === 'ORDER BY') {
        const data = generateDataSource(step.data);
        const conditionIndex = step.data[0]?.columns.findIndex((col: string) => col === '_condition_result');
        
        if (conditionIndex !== -1) {
          return data.filter((row: any) => row[`col_${conditionIndex}`] === 1);
        }
        return data;
      }
      
      // ORDER BY step when transitioning to LIMIT - show sorted data
      if (step.type === 'ORDER BY' && currentStep?.type === 'LIMIT') {
        return generateDataSource(step.data);
      }
      
      // LIMIT step when transitioning to SELECT - show limited data
      if (step.type === 'LIMIT' && currentStep?.type === 'SELECT') {
        return generateDataSource(step.data);
      }
      
      // Default case for previous step
      return generateDataSource(step.data);
    }
    
    // For current step tables (right side)
    // Handle special cases during animations
    
    // WHERE table during FROM->WHERE transition
    if (isFromToWhereTransition && step.type === 'WHERE') {
      return getWhereTableData();
    }
    
    // ORDER BY table during WHERE->ORDER BY transition
    if (isWhereToOrderByTransition && step.type === 'ORDER BY') {
      return getOrderByTableData();
    }
    
    // LIMIT table during ORDER BY->LIMIT transition
    if (isOrderByToLimitTransition && step.type === 'LIMIT') {
      return getLimitTableData();
    }
    
    // SELECT table during LIMIT->SELECT transition
    if (isLimitToSelectTransition && step.type === 'SELECT') {
      return getSelectTableData();
    }
    
    // Default case for current step
    return generateDataSource(step.data);
  };
  
  // Render explanatory text for transitions
  const renderTransitionExplanation = (fromStep: any, toStep: any) => {
    if (fromStep.type === 'FROM' && toStep.type === 'WHERE') {
      return (
        <div className="transition-explanation">
          <Divider>
            <Text strong>Filtering Data with WHERE Clause</Text>
          </Divider>
          <Text>
            The WHERE clause filters rows from the table based on a condition. 
            Only rows that satisfy the condition will proceed to the next step.
          </Text>
        </div>
      );
    }
    
    if (fromStep.type === 'WHERE' && toStep.type === 'ORDER BY') {
      return (
        <div className="transition-explanation">
          <Divider>
            <Text strong>Sorting Data with ORDER BY Clause</Text>
          </Divider>
          <Text>
            The ORDER BY clause sorts the filtered data based on one or more columns. 
            {toStep.metadata?.orderByColumns.includes('DESC') 
              ? ' Results are sorted in descending order (highest to lowest).' 
              : ' Results are sorted in ascending order (lowest to highest).'}
          </Text>
        </div>
      );
    }
    
    return (
      <div className="transition-explanation">
        <Divider>
          <Text strong>From {fromStep.type} to {toStep.type}</Text>
        </Divider>
        <Text>
          {`Moving from ${fromStep.type} to ${toStep.type} in the SQL execution process.`}
        </Text>
      </div>
    );
  };
  
  // Function to render the appropriate table for the current step
  const renderStepTable = (step: any, isCurrentStep: boolean = true) => {
    if (!step) {
      return <Empty description="No data to visualize" />;
    }
    
    // Generate columns and filter out the condition result column
    let columns = generateColumns(step.data || []);
    if (columns.length > 0) {
      // Check if last column is the condition result column
      const lastCol = columns[columns.length - 1];
      if (lastCol.title === '_condition_result') {
        columns = columns.slice(0, -1);
      }
    }
    
    // Get the appropriate data for this step
    const dataSource = generateTableData(step, isCurrentStep);
    
    // Debug output for SELECT table
    if (isCurrentStep && step.type === 'SELECT') {
      console.log("SELECT columns:", columns);
      console.log("SELECT dataSource:", dataSource);
      
      // Special handling for SELECT table columns
      // For SELECT, we need to create columns based on the selected columns from metadata
      if (currentStep?.metadata?.selectColumns) {
        const selectColumns = currentStep.metadata.selectColumns.split(',').map((col: string) => col.trim());
        const allColumns = previousStep?.data[0]?.columns || [];
        
        // Create new columns array that maps correctly to the data
        columns = selectColumns.map((colName: string, idx: number) => {
          // Find the index of this column in the original data
          const originalColIndex = allColumns.findIndex(
            (originalCol: string) => originalCol.toLowerCase() === colName.toLowerCase()
          );
          
          // Use the correct col_X dataIndex based on the original column position
          return {
            title: colName,
            dataIndex: `col_${originalColIndex}`,
            key: `col_${originalColIndex}`,
            ellipsis: true,
            width: calculateColumnWidth(colName, step.data[0]?.values || [], idx),
            // Only apply highlighting classes if animation is in progress
            className: selectingInProgress && selectedColumns.includes(originalColIndex) 
                      ? 'selected-column' 
                      : selectingInProgress 
                        ? 'pending-column' 
                        : '',
            render: (text: any) => {
              console.log(`Rendering ${colName} (col_${originalColIndex}): ${text}`);
              if (text === null || text === 'NULL') {
                return <span className="null-value">NULL</span>;
              }
              return text;
            }
          };
        });
        
        console.log("Fixed SELECT columns:", columns);
      }
    }
    
    // Apply special column styling based on the transition
    if (isWhereToOrderByTransition && step.type === 'ORDER BY') {
      // Highlight the order by column
      const orderByInfo = step?.metadata?.orderByColumns || 'age DESC';
      const [orderByColumn] = orderByInfo.split(' ');
      
      columns = columns.map((col: any) => {
        if (col.title.toLowerCase() === orderByColumn.toLowerCase()) {
          return {
            ...col,
            className: 'sorting-column'
          };
        }
        return col;
      });
    }
    
    if (isLimitToSelectTransition) {
      // Get columns from SELECT clause
      const selectColumns = currentStep?.metadata?.selectColumns?.split(',').map((col: string) => col.trim()) || [];
      
      // Highlight selected columns in LIMIT table (left side) ONLY during animation
      if (!isCurrentStep && step.type === 'LIMIT') {
        columns = columns.map((col: any) => {
          // Only apply highlighting classes if animation is in progress
          if (selectingInProgress) {
            if (selectColumns.includes(col.title)) {
              return {
                ...col,
                className: currentSelectColumn !== null && 
                          col.title === step.data[0]?.columns[currentSelectColumn]
                          ? 'selecting-column' : 'selected-column'
              };
            }
            return {
              ...col,
              className: 'unselected-column'
            };
          }
          // No classes before animation starts
          return col;
        });
      }
      
      // Special handling for SELECT table (right side)
      if (isCurrentStep && step.type === 'SELECT') {
        if (currentStep?.metadata?.selectColumns) {
          const selectColumns = currentStep.metadata.selectColumns.split(',').map((col: string) => col.trim());
          const allColumns = previousStep?.data[0]?.columns || [];
          
          // Create new columns array that maps correctly to the data
          columns = selectColumns.map((colName: string, idx: number) => {
            // Find the index of this column in the original data
            const originalColIndex = allColumns.findIndex(
              (originalCol: string) => originalCol.toLowerCase() === colName.toLowerCase()
            );
            
            // Use the correct col_X dataIndex based on the original column position
            return {
              title: colName,
              dataIndex: `col_${originalColIndex}`,
              key: `col_${originalColIndex}`,
              ellipsis: true,
              width: calculateColumnWidth(colName, step.data[0]?.values || [], idx),
              // Only apply highlighting classes if animation is in progress
              className: selectingInProgress && selectedColumns.includes(originalColIndex) 
                        ? 'selected-column' 
                        : selectingInProgress 
                          ? 'pending-column' 
                          : '',
              render: (text: any) => {
                if (text === null || text === 'NULL') {
                  return <span className="null-value">NULL</span>;
                }
                return text;
              }
            };
          });
        }
      }
    }
    
    // Add appropriate table CSS classes based on the transition
    let tableClassName = '';
    
    if (isFromToWhereTransition && step.type === 'WHERE') {
      tableClassName = animationInProgress ? 'where-table animating' : 'where-table';
    } else if (isWhereToOrderByTransition && step.type === 'ORDER BY') {
      tableClassName = 'order-by-table';
    } else if (isOrderByToLimitTransition && step.type === 'LIMIT') {
      tableClassName = 'limit-table';
    } else if (isLimitToSelectTransition && step.type === 'SELECT') {
      tableClassName = 'select-table';
    }
    
    return (
      <div className={tableClassName}>
        <Table 
          columns={columns} 
          dataSource={dataSource}
          pagination={false}
          size="small"
          rowClassName={(record: any, index: number) => rowClassName(record, index, isCurrentStep)}
          scroll={{ x: 'max-content', y: 300 }}
        />
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
      // Show animation controls based on the transition type
      let transitionControls = null;
      
      if (isFromToWhereTransition && !animationInProgress) {
        transitionControls = (
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
        );
      } else if (isWhereToOrderByTransition && !sortingInProgress) {
        transitionControls = (
          <div className="animation-controls">
            <Alert
              message="Click to see the ORDER BY sorting process"
              type="info"
              showIcon
              action={
                <button 
                  className="start-animation-btn" 
                  onClick={startWhereToOrderByAnimation}
                >
                  Start Animation
                </button>
              }
            />
          </div>
        );
      } else if (isOrderByToLimitTransition && !limitingInProgress) {
        transitionControls = (
          <div className="animation-controls">
            <Alert
              message="Click to see the LIMIT row selection process"
              type="info"
              showIcon
              action={
                <button 
                  className="start-animation-btn" 
                  onClick={startOrderByToLimitAnimation}
                >
                  Start Animation
                </button>
              }
            />
          </div>
        );
      } else if (isLimitToSelectTransition && !selectingInProgress) {
        transitionControls = (
          <div className="animation-controls">
            <Alert
              message="Click to see the SELECT column selection process"
              type="info"
              showIcon
              action={
                <button 
                  className="start-animation-btn" 
                  onClick={startLimitToSelectAnimation}
                >
                  Start Animation
                </button>
              }
            />
          </div>
        );
      }
      
      // Add class for different transition types
      let transitionClass = '';
      if (isFromToWhereTransition) {
        transitionClass = 'from-to-where-transition';
      } else if (isWhereToOrderByTransition) {
        transitionClass = 'where-to-order-by-transition';
      } else if (isOrderByToLimitTransition) {
        transitionClass = 'order-by-to-limit-transition';
      } else if (isLimitToSelectTransition) {
        transitionClass = 'limit-to-select-transition';
      }
      
      return (
        <div>
          {renderTransitionExplanation(previousStep, currentStep)}
          {transitionControls}
          
          <Row gutter={16} className={`visualization-row ${transitionClass}`}>
            <Col xs={24} md={12} className="previous-step-col">
              <div className="step-container previous-step-container">
                {renderStepTable(previousStep, false)}
              </div>
            </Col>
            <Col xs={24} md={12} className="current-step-col">
              <div className="step-container current-step-container">
                {renderStepTable(currentStep, true)}
              </div>
            </Col>
          </Row>
        </div>
      );
    }
    
    // If only one step, show it full width
    return (
      <div className="step-container single-step-container">
        {renderStepTable(currentStep, true)}
      </div>
    );
  };
  
  return (
    <Card 
      title="SQL Execution Visualization" 
      className="visualization-pane"
      ref={containerRef}
    >
      {renderContent()}
    </Card>
  );
};

export default VisualizationPane; 