import React, { useState, useEffect } from 'react';
import initSqlJs from 'sql.js';
import { Layout } from './components/Layout';
import SqlEditor from './components/SqlEditor';
import DatabaseExplorer from './components/DatabaseExplorer';
import VisualizationPane from './components/VisualizationPane';
import ExecutionTimeline from './components/ExecutionTimeline';
import DatabaseUploader from './components/DatabaseUploader';
import { useAppStore } from './store/appStore';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const { setSqlInstance, setDatabaseName, setExecutionState } = useAppStore();

  // Initialize SQL.js when the component mounts
  useEffect(() => {
    async function initSql() {
      try {
        // Initialize SQL.js
        const SQL = await initSqlJs({
          // Specify the path to the SQL.js wasm file
          locateFile: file => `https://sql.js.org/dist/${file}`
        });
        
        // Store the SQL instance in the global store
        setSqlInstance(SQL);
        setLoading(false);
      } catch (err) {
        console.error('Error initializing SQL.js:', err);
        setLoading(false);
      }
    }

    initSql();
    
    // Cleanup function
    return () => {
      setExecutionState('idle');
    };
  }, [setSqlInstance, setExecutionState]);

  // Handle database file upload
  const handleDatabaseUpload = (dbFile: File) => {
    setDatabaseName(dbFile.name);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing SQL engine...</p>
      </div>
    );
  }

  return (
    <Layout
      header={
        <div className="header-content">
          <h1 className="app-title">SQL Visual Tutor</h1>
          <DatabaseUploader onUpload={handleDatabaseUpload} />
        </div>
      }
      sidebar={<DatabaseExplorer />}
      content={
        <div className="main-content">
          <div className="editor-section">
            <SqlEditor />
          </div>
          <div className="visualization-section">
            <VisualizationPane />
          </div>
          <div className="timeline-section">
            <ExecutionTimeline />
          </div>
        </div>
      }
    />
  );
}

export default App; 