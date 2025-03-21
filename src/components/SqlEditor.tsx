import React, { useState } from 'react';
import { Button, Card, Space, message } from 'antd';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { PlayCircleOutlined } from '@ant-design/icons';
import { useAppStore } from '../store/appStore';
import { parseQuery } from '../core/queryParser';
import { AnimationController } from '../animations/animationController';
import './SqlEditor.css';

// Singleton animation controller
const animationController = new AnimationController();

const SqlEditor: React.FC = () => {
  const [queryText, setQueryText] = useState(
    'SELECT name, department\nFROM users\nWHERE status = "active"\nORDER BY age DESC\nLIMIT 5'
  );
  
  const { 
    database, 
    setCurrentQuery, 
    setExecutionSteps, 
    executionState,
    setExecutionState,
    resetExecution,
    setError,
    setCurrentStepIndex
  } = useAppStore();
  
  const handleRunQuery = () => {
    if (!database) {
      message.error('Database is not initialized');
      return;
    }
    
    try {
      // Reset any previous execution
      resetExecution();
      
      // Parse the query to get execution steps
      const { steps } = parseQuery(queryText, database);
      
      // Update the store with new steps
      setCurrentQuery(queryText);
      setExecutionSteps(steps);
      
      // Build timeline but don't auto-play it
      animationController.buildTimeline(steps);
      
      // Set the initial step (FROM) and pause
      if (steps.length > 0) {
        setCurrentStepIndex(0);
        setExecutionState('paused');
      }
      
    } catch (error) {
      console.error('Error executing query:', error);
      setError(`${error}`);
      message.error('Error executing query');
    }
  };
  
  return (
    <Card className="sql-editor-card" title="SQL Query Editor">
      <CodeMirror
        value={queryText}
        height="150px"
        extensions={[sql()]}
        onChange={(value) => setQueryText(value)}
        className="sql-editor"
      />
      
      <div className="sql-editor-controls">
        <Space>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleRunQuery}
            disabled={executionState === 'running'}
          >
            Run Query
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default SqlEditor; 