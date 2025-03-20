import React, { useState } from 'react';
import { Button, Card, Space, message } from 'antd';
import CodeMirror from '@uiw/react-codemirror';
import { sql } from '@codemirror/lang-sql';
import { PlayCircleOutlined, PauseCircleOutlined, StopOutlined } from '@ant-design/icons';
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
    setError
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
      
      // Build and start the animation timeline
      animationController.buildTimeline(steps);
      animationController.play();
      
    } catch (error) {
      console.error('Error executing query:', error);
      setError(`${error}`);
      message.error('Error executing query');
    }
  };
  
  const handlePauseResume = () => {
    if (executionState === 'running') {
      animationController.pause();
    } else if (executionState === 'paused') {
      animationController.play();
    }
  };
  
  const handleStop = () => {
    animationController.goToStep(0);
    resetExecution();
    setExecutionState('idle');
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
          
          <Button
            icon={executionState === 'running' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={handlePauseResume}
            disabled={executionState !== 'running' && executionState !== 'paused'}
          >
            {executionState === 'running' ? 'Pause' : 'Resume'}
          </Button>
          
          <Button
            icon={<StopOutlined />}
            onClick={handleStop}
            disabled={executionState === 'idle'}
          >
            Stop
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default SqlEditor; 