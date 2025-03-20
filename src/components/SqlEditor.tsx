import React, { useState, useEffect } from 'react';
import { Button, Space, message } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { useAppStore } from '../store/appStore';
import { AnimationController } from '../animations/animationController';
import './SqlEditor.css';

// Sample SQL queries for different types of operations
const SAMPLE_QUERIES = [
  "SELECT * FROM employees LIMIT 10;",
  "SELECT departments.name, COUNT(employees.id) as employee_count\nFROM departments\nJOIN employees ON departments.id = employees.department_id\nGROUP BY departments.name\nORDER BY employee_count DESC;",
  "SELECT products.name, categories.name as category, products.price\nFROM products\nJOIN categories ON products.category_id = categories.id\nWHERE products.price > 50\nORDER BY products.price DESC\nLIMIT 5;"
];

// Create animation controller
const animationController = new AnimationController();

const SqlEditor: React.FC = () => {
  const [editorValue, setEditorValue] = useState(SAMPLE_QUERIES[0]);
  const [isExecuting, setIsExecuting] = useState(false);
  
  const {
    db,
    currentQuery,
    setCurrentQuery,
    setQueryResult,
    executionSteps,
    setExecutionSteps,
    executionState,
    setExecutionState,
    setExecutionError,
    currentStepIndex,
    setCurrentStepIndex
  } = useAppStore();

  // Effect to handle execution state changes
  useEffect(() => {
    if (executionState === 'running') {
      animationController.play();
    } else if (executionState === 'paused') {
      animationController.pause();
    } else if (executionState === 'idle') {
      setCurrentStepIndex(0);
    }
  }, [executionState, setCurrentStepIndex]);

  // Effect to rebuild animation timeline when execution steps change
  useEffect(() => {
    if (executionSteps.length > 0) {
      animationController.buildTimeline(executionSteps);
    }
  }, [executionSteps]);

  // Handle editor value change
  const handleEditorChange = (value: string) => {
    setEditorValue(value);
  };

  // Parse SQL query into executable steps
  const parseQuery = (query: string) => {
    // This is a simplified version of SQL parsing
    // In a real implementation, this would use a proper SQL parser
    
    const steps = [];
    
    // Split the query by keywords
    const normalizedQuery = query.toUpperCase();
    
    // Check for the main clauses in the query
    const hasFrom = normalizedQuery.includes('FROM');
    const hasWhere = normalizedQuery.includes('WHERE');
    const hasJoin = normalizedQuery.includes('JOIN');
    const hasGroupBy = normalizedQuery.includes('GROUP BY');
    const hasOrderBy = normalizedQuery.includes('ORDER BY');
    const hasLimit = normalizedQuery.includes('LIMIT');
    
    // Extract the table name from FROM clause
    let fromTable = '';
    if (hasFrom) {
      const fromMatch = normalizedQuery.match(/FROM\s+(\w+)/i);
      if (fromMatch && fromMatch[1]) {
        fromTable = fromMatch[1];
      }
    }
    
    // Create steps for each clause present in the query
    if (hasFrom) {
      steps.push({
        id: '1',
        type: 'FROM',
        description: `Loading data from table ${fromTable}`,
        duration: 800,
        data: [], // This would be filled with actual data from execution
        metadata: {
          tableName: fromTable
        }
      });
    }
    
    if (hasWhere) {
      steps.push({
        id: '2',
        type: 'WHERE',
        description: 'Filtering rows based on WHERE clause',
        duration: 1200,
        data: [],
        metadata: {
          condition: normalizedQuery.match(/WHERE\s+(.+?)(?:\s+(?:GROUP BY|ORDER BY|LIMIT|$))/i)?.[1] || ''
        }
      });
    }
    
    if (hasJoin) {
      steps.push({
        id: '3',
        type: 'JOIN',
        description: 'Joining tables',
        duration: 1500,
        data: [],
        metadata: {
          joinType: normalizedQuery.includes('LEFT JOIN') ? 'LEFT JOIN' : 
                   normalizedQuery.includes('RIGHT JOIN') ? 'RIGHT JOIN' : 
                   normalizedQuery.includes('INNER JOIN') ? 'INNER JOIN' : 'JOIN',
          joinTable: normalizedQuery.match(/JOIN\s+(\w+)/i)?.[1] || '',
          joinCondition: normalizedQuery.match(/ON\s+(.+?)(?:\s+(?:WHERE|GROUP BY|ORDER BY|LIMIT|$))/i)?.[1] || ''
        }
      });
    }
    
    if (hasGroupBy) {
      steps.push({
        id: '4',
        type: 'GROUP BY',
        description: 'Grouping results',
        duration: 1000,
        data: [],
        metadata: {
          groupByColumns: normalizedQuery.match(/GROUP BY\s+(.+?)(?:\s+(?:ORDER BY|LIMIT|HAVING|$))/i)?.[1] || ''
        }
      });
    }
    
    // SELECT is processed after GROUP BY logically
    steps.push({
      id: '5',
      type: 'SELECT',
      description: 'Selecting columns',
      duration: 800,
      data: [],
      metadata: {
        selectColumns: normalizedQuery.match(/SELECT\s+(.+?)\s+FROM/i)?.[1] || '*'
      }
    });
    
    if (hasOrderBy) {
      steps.push({
        id: '6',
        type: 'ORDER BY',
        description: 'Sorting results',
        duration: 1200,
        data: [],
        metadata: {
          orderByColumns: normalizedQuery.match(/ORDER BY\s+(.+?)(?:\s+(?:LIMIT|$))/i)?.[1] || ''
        }
      });
    }
    
    if (hasLimit) {
      steps.push({
        id: '7',
        type: 'LIMIT',
        description: 'Limiting results',
        duration: 600,
        data: [],
        metadata: {
          limit: normalizedQuery.match(/LIMIT\s+(\d+)/i)?.[1] || '10',
          offset: normalizedQuery.match(/OFFSET\s+(\d+)/i)?.[1] || '0'
        }
      });
    }
    
    return steps;
  };

  // Execute the current SQL query
  const executeQuery = async () => {
    if (!db) {
      message.error('No database loaded. Please load a database first.');
      return;
    }
    
    if (!editorValue.trim()) {
      message.error('Please enter a SQL query.');
      return;
    }
    
    setIsExecuting(true);
    setExecutionState('idle');
    setExecutionError(null);
    
    try {
      // Save the current query
      setCurrentQuery(editorValue);
      
      // Execute the query
      const result = db.exec(editorValue);
      
      if (result.length > 0) {
        // Format the query result
        const formattedResult = {
          columns: result[0].columns,
          values: result[0].values
        };
        
        setQueryResult(formattedResult);
        
        // Parse the query into execution steps
        const steps = parseQuery(editorValue);
        
        // For each step, add the actual query result data
        const stepsWithData = steps.map(step => ({
          ...step,
          data: [formattedResult]
        }));
        
        setExecutionSteps(stepsWithData);
        
        // Build the animation timeline
        animationController.buildTimeline(stepsWithData);
        
        // Start execution
        setExecutionState('running');
      } else {
        // Handle non-SELECT queries
        message.success('Query executed successfully. No results to display.');
        setQueryResult(null);
        setExecutionSteps([]);
      }
    } catch (error) {
      console.error('Error executing query:', error);
      setExecutionError((error as Error).message);
      message.error(`Error executing query: ${(error as Error).message}`);
      setExecutionState('error');
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle play/pause button click
  const handlePlayPause = () => {
    if (executionState === 'running') {
      setExecutionState('paused');
    } else if (executionState === 'paused' || executionState === 'idle') {
      setExecutionState('running');
    }
  };

  // Load a sample query
  const loadSampleQuery = (index: number) => {
    setEditorValue(SAMPLE_QUERIES[index]);
  };

  return (
    <div className="sql-editor">
      <div className="editor-header">
        <h3>SQL Editor</h3>
        <div className="editor-buttons">
          <Space>
            <Button 
              type="text" 
              onClick={() => loadSampleQuery(0)}
            >
              Sample 1
            </Button>
            <Button 
              type="text" 
              onClick={() => loadSampleQuery(1)}
            >
              Sample 2
            </Button>
            <Button 
              type="text" 
              onClick={() => loadSampleQuery(2)}
            >
              Sample 3
            </Button>
          </Space>
        </div>
      </div>
      
      <div className="code-mirror-wrapper">
        <CodeMirror
          value={editorValue}
          height="150px"
          extensions={[sql()]}
          onChange={handleEditorChange}
          theme="dark"
        />
      </div>
      
      <div className="editor-controls">
        <Button
          type="primary"
          onClick={executeQuery}
          loading={isExecuting}
          disabled={!db || executionState === 'running'}
        >
          Execute
        </Button>
        
        {executionSteps.length > 0 && (
          <Button
            type="default"
            icon={executionState === 'running' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handlePlayPause}
            disabled={executionState === 'completed' || executionState === 'error'}
          >
            {executionState === 'running' ? 'Pause' : 'Play'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SqlEditor; 